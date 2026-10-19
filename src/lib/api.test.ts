/**
 * Regression tests for the request layer's session-renewal contract (agrobaba frontend, api.ts):
 *
 *  1. A stale access token is renewed BEFORE the request is sent (silent, no 401 round-trip).
 *  2. A 401 mid-request triggers exactly ONE refresh POST and the original request is retried
 *     EXACTLY ONCE with the rotated bearer token - never a loop.
 *  3. Concurrent requests that all hit 401 share a single in-flight refresh (single-flight).
 *  4. A refresh rejected by the backend (401 = session genuinely dead) surfaces a safe 401 to
 *     callers and signals session invalidation (which AuthContext turns into a graceful
 *     signed-out + one-time notice - never a password re-entry modal).
 *  5. A refresh that fails for NETWORK reasons (infra) never logs the customer out: the stored
 *     credentials are kept and a distinguishable RefreshUnavailableError is thrown.
 *  6. Refresh-exempt endpoints (login/refresh/OTP) never enter the 401 -> refresh -> retry loop.
 *
 * These run under `node --test` with localStorage, fetch and friends polyfilled before the module
 * is dynamically imported (api.ts reads localStorage at coordinator-construction time).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

/* -------------------------------------------------------------------------- */
/*  Browser API polyfills - BEFORE importing api.ts                           */
/* -------------------------------------------------------------------------- */

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    removeItem: (key) => void map.delete(key),
    clear: () => map.clear(),
  };
}

Object.defineProperty(globalThis, 'localStorage', {
  value: memoryStorage(),
  configurable: true,
});

// Node ships a real BroadcastChannel, and api.ts opens one for its cross-tab command bus at module
// load - an open channel keeps the test process alive forever. Cross-tab coordination is covered by
// refresh.test.ts with its own injected bus, so here the bus simply degrades to a no-op.
Object.defineProperty(globalThis, 'BroadcastChannel', { value: undefined, configurable: true });

interface FetchCall {
  url: string;
  method: string;
  headers: Headers;
}

let calls: FetchCall[] = [];
let handler: (url: string, init: RequestInit) => Response;

globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
  const url = String(input);
  const method = (init.method ?? 'GET').toUpperCase();
  calls.push({ url, method, headers: new Headers(init.headers) });
  return handler(url, { ...init, method });
}) as typeof fetch;

const { api, setAuthToken, authRefresher, ApiError, RefreshUnavailableError } = await import('./api.ts');

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const REFRESH_URL = 'http://localhost:8080/api/auth/refresh';

function fakeJwt(expiresInSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub: 'farmer@example.com', exp: Math.floor(Date.now() / 1000) + expiresInSeconds }),
  ).toString('base64url');
  return `${header}.${payload}.signature`;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const FRESH_TOKEN = fakeJwt(3600); // comfortably outside the 60s proactive-renewal skew
const STALE_TOKEN = fakeJwt(-300); // already expired -> pre-request renewal must fire
const ROTATED_TOKEN = fakeJwt(3600);

function refreshCalls(): FetchCall[] {
  return calls.filter((c) => c.url === REFRESH_URL && c.method === 'POST');
}

function reset(nextHandler: (url: string, init: RequestInit) => Response): void {
  calls = [];
  handler = nextHandler;
  setAuthToken(null); // clears the stored token AND re-arms the once-only invalidation guard
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                     */
/* -------------------------------------------------------------------------- */

test('expired access token is silently renewed BEFORE the request is sent', async () => {
  reset((url, init) => {
    if (url === REFRESH_URL) return json({ token: ROTATED_TOKEN });
    assert.equal(new Headers(init.headers).get('Authorization'), `Bearer ${ROTATED_TOKEN}`);
    return json({ ok: true });
  });
  setAuthToken(STALE_TOKEN);

  const result = await api.get<{ ok: boolean }>('/api/cart');

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(
    calls.map((c) => `${c.method} ${c.url}`),
    [`POST ${REFRESH_URL}`, 'GET http://localhost:8080/api/cart'],
    'renewal happens first; the original request is never sent with the expired token',
  );
});

test('401 mid-request -> one refresh POST -> original request retried once with the new bearer', async () => {
  let alreadyRetried = false;
  reset((url, init) => {
    if (url === REFRESH_URL) return json({ token: ROTATED_TOKEN });
    if (!alreadyRetried) {
      alreadyRetried = true;
      return json({ message: 'expired' }, 401);
    }
    assert.equal(
      new Headers(init.headers).get('Authorization'),
      `Bearer ${ROTATED_TOKEN}`,
      'the retry must carry the rotated token',
    );
    return json({ items: ['yam'] });
  });
  setAuthToken(FRESH_TOKEN);

  const result = await api.get<{ items: string[] }>('/api/orders');

  assert.deepEqual(result, { items: ['yam'] });
  assert.equal(refreshCalls().length, 1, 'exactly one refresh POST');
  assert.equal(calls.length, 3, 'original + refresh + single retry - never a loop');
});

test('concurrent 401s share a single in-flight refresh (single-flight)', async () => {
  let refreshDone = false;
  reset((url) => {
    if (url === REFRESH_URL) {
      refreshDone = true;
      return json({ token: ROTATED_TOKEN });
    }
    if (!refreshDone) return json({ message: 'expired' }, 401);
    return json({ ok: true });
  });
  setAuthToken(FRESH_TOKEN);

  const [cart, orders] = await Promise.all([
    api.get('/api/cart'),
    api.get('/api/orders'),
  ]);

  assert.deepEqual(cart, { ok: true });
  assert.deepEqual(orders, { ok: true });
  assert.equal(refreshCalls().length, 1, 'two simultaneous 401s must produce ONE refresh POST');
});

test('a stale token does not cause competing refreshes across simultaneous requests', async () => {
  let posts = 0;
  reset((url) => {
    if (url === REFRESH_URL) {
      posts += 1;
      return json({ token: ROTATED_TOKEN });
    }
    return json({ ok: true });
  });
  setAuthToken(STALE_TOKEN);

  await Promise.all([api.get('/api/cart'), api.get('/api/orders'), api.get('/api/messages')]);

  assert.equal(posts, 1, 'the pre-request renewal is shared by the whole burst');
  assert.equal(calls.length, 4, 'one refresh + three requests, all on the rotated token');
});

test('refresh rejected with 401 (dead session) surfaces a safe 401 and does not loop', async () => {
  let signalCalls = 0;
  const originalSignal = authRefresher.signalSessionInvalid;
  authRefresher.signalSessionInvalid = function spy() {
    signalCalls += 1;
    return originalSignal.call(this);
  };

  try {
    reset((url) => {
      if (url === REFRESH_URL) return json({ message: 'Session expired or invalid. Please log in again.' }, 401);
      return json({ message: 'expired' }, 401);
    });
    setAuthToken(FRESH_TOKEN);

    await assert.rejects(
      api.get('/api/cart'),
      (error: unknown) => error instanceof ApiError && error.status === 401,
      'the caller sees a plain 401 ApiError - AuthContext decides what UI that means',
    );

    assert.ok(signalCalls >= 1, 'session invalidation was signalled for the app-level transition');
    assert.equal(refreshCalls().length, 1, 'no second refresh is attempted after a session-cause failure');
    assert.equal(calls.length, 2, 'original 401 + one refresh POST, no retry with a dead session');
  } finally {
    authRefresher.signalSessionInvalid = originalSignal;
  }
});

test('network failure during refresh keeps credentials and throws RefreshUnavailableError', async () => {
  reset((url) => {
    if (url === REFRESH_URL) throw new TypeError('fetch failed');
    return json({ message: 'expired' }, 401);
  });
  setAuthToken(FRESH_TOKEN);

  await assert.rejects(api.get('/api/cart'), RefreshUnavailableError);

  assert.equal(
    authRefresher.getToken(),
    FRESH_TOKEN,
    'an infra failure must NEVER clear the stored credentials (no automatic logout)',
  );
  assert.equal(refreshCalls().length, 1);
});

test('403 from refresh is infra, not session death - credentials are kept', async () => {
  reset((url) => {
    if (url === REFRESH_URL) return json({ message: 'CSRF check failed' }, 403);
    return json({ message: 'expired' }, 401);
  });
  setAuthToken(FRESH_TOKEN);

  await assert.rejects(api.get('/api/cart'), RefreshUnavailableError);
  assert.equal(authRefresher.getToken(), FRESH_TOKEN, '403 must not log the customer out');
});

test('a retry that is still 401 terminates with ApiError - no infinite refresh loop', async () => {
  reset((url) => {
    if (url === REFRESH_URL) return json({ token: ROTATED_TOKEN });
    return json({ message: 'still unauthorized' }, 401);
  });
  setAuthToken(FRESH_TOKEN);

  await assert.rejects(
    api.get('/api/cart'),
    (error: unknown) => error instanceof ApiError && error.status === 401,
  );

  assert.equal(refreshCalls().length, 1, 'exactly one refresh attempt per request lifecycle');
  assert.equal(calls.length, 3, 'original 401 + refresh + one retry - then stop');
});

test('refresh-exempt endpoints never enter the 401 -> refresh -> retry loop', async () => {
  reset((url) => {
    if (url.endsWith('/api/auth/login')) return json({ message: 'Bad credentials' }, 401);
    throw new Error(`unexpected request to ${url}`);
  });
  setAuthToken(FRESH_TOKEN);

  await assert.rejects(
    api.post('/api/auth/login', { email: 'x@y.z', password: 'nope' }),
    (error: unknown) => error instanceof ApiError && error.status === 401,
  );

  assert.equal(calls.length, 1, 'login 401 must NOT trigger a refresh attempt');
  assert.equal(refreshCalls().length, 0);
});

test('a session that died while signed out is not treated as a live-session failure on later logins', async () => {
  // Session-death signalling is once-only PER token generation: after any signal, a fresh token
  // (login) re-arms the coordinator so the next genuine expiry can signal again.
  let signalCalls = 0;
  const originalSignal = authRefresher.signalSessionInvalid;
  authRefresher.signalSessionInvalid = function spy() {
    signalCalls += 1;
    return originalSignal.call(this);
  };

  try {
    reset((url) => {
      if (url === REFRESH_URL) return json({ message: 'Session expired or invalid.' }, 401);
      return json({ message: 'expired' }, 401);
    });
    setAuthToken(FRESH_TOKEN);
    await assert.rejects(api.get('/api/cart'), (e: unknown) => e instanceof ApiError && e.status === 401);
    const firstDeath = signalCalls;

    // "Log in again": a new token arrives, then this session eventually dies once more.
    setAuthToken(fakeJwt(3600));
    let refreshed = false;
    handler = (url) => {
      if (url === REFRESH_URL) {
        refreshed = true;
        return json({ message: 'Session expired or invalid.' }, 401);
      }
      if (!refreshed) return json({ message: 'expired' }, 401);
      return json({ ok: true });
    };
    await assert.rejects(api.get('/api/orders'), (e: unknown) => e instanceof ApiError && e.status === 401);

    assert.ok(firstDeath >= 1, 'the first death signalled');
    assert.ok(
      signalCalls > firstDeath,
      'a NEW session (fresh token) must be able to signal its own death later',
    );
  } finally {
    authRefresher.signalSessionInvalid = originalSignal;
  }
});
