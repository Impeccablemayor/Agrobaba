import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRefreshCoordinator,
  decodeJwtExp,
  REFRESH_PROTECTION_HEADER,
  REFRESH_PROTECTION_VALUE,
  type RefreshStorage,
  type WebLocksManagerLike,
} from './refresh.ts';

function memoryStorage(initial?: Record<string, string>): RefreshStorage {
  const m = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getItem: (k) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k, v) => {
      m.set(k, v);
    },
    removeItem: (k) => {
      m.delete(k);
    },
  };
}

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A Web Locks mock that captures callbacks and releases them on demand. */
function heldLockManager() {
  const held: Array<{ cb: () => Promise<unknown>; resolve: (v: unknown) => void }> = [];
  const lockManager: WebLocksManagerLike = {
    request: (_name, cb) =>
      new Promise((resolve) => {
        held.push({ cb, resolve });
      }),
  };
  return {
    lockManager,
    get waiting() {
      return held.length;
    },
    async release(): Promise<void> {
      const entry = held.shift();
      assert.ok(entry, 'expected a held lock to release');
      const result = await entry.cb();
      entry.resolve(result);
    },
  };
}

function makeJwt(payload: Record<string, unknown>): string {
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url').replace(/=+$/g, '');
  return `${enc({ alg: 'none' })}.${enc(payload)}.${enc({ sig: 'x' })}`;
}

test('decodeJwtExp reads the exp claim and rejects malformed tokens', () => {
  assert.equal(decodeJwtExp(makeJwt({ sub: '1', exp: 1_700_000_000 })), 1_700_000_000);
  assert.equal(decodeJwtExp(makeJwt({ sub: '1' })), null);
  assert.equal(decodeJwtExp('not-a-jwt'), null);
  assert.equal(decodeJwtExp('a.b'), null);
});

test('refresh succeeds, stores the new token, and POSTs with the protection header + credentials', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const coord = createRefreshCoordinator({
    storage: memoryStorage({ agrobaba_token: 'old-token' }),
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return jsonResponse(200, { token: 'new-token' });
    },
    lockManager: null,
  });

  const outcome = await coord.refresh();

  assert.equal(outcome.ok, true);
  assert.equal(outcome.token, 'new-token');
  assert.equal(coord.getToken(), 'new-token');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.endsWith('/api/auth/refresh'), true);
  const headers = new Headers(calls[0].init.headers as HeadersInit);
  assert.equal(headers.get(REFRESH_PROTECTION_HEADER), REFRESH_PROTECTION_VALUE);
  assert.equal((calls[0].init as RequestInit & { credentials?: RequestCredentials }).credentials, 'include');
});

test('concurrent refreshes in one tab are single-flight (one POST, everyone shares the promise)', async () => {
  const gate = deferred<null>();
  let fetchCount = 0;
  const coord = createRefreshCoordinator({
    storage: memoryStorage({ agrobaba_token: 'old-token' }),
    fetchImpl: async () => {
      fetchCount++;
      await gate.promise;
      return jsonResponse(200, { token: 'shared-new' });
    },
    lockManager: null,
  });

  const p1 = coord.refresh();
  const p2 = coord.refresh();
  const p3 = coord.refresh();
  gate.resolve(null);
  const [o1, o2, o3] = await Promise.all([p1, p2, p3]);

  assert.equal(fetchCount, 1);
  assert.deepEqual([o1.ok, o2.ok, o3.ok], [true, true, true]);
  assert.equal(coord.getToken(), 'shared-new');
});

test('refresh rejected with 401 reports a dead session and leaves the token untouched', async () => {
  const coord = createRefreshCoordinator({
    storage: memoryStorage({ agrobaba_token: 'old-token' }),
    fetchImpl: async () => jsonResponse(401, { message: 'Session expired' }),
    lockManager: null,
  });

  const outcome = await coord.refresh();
  assert.equal(outcome.ok, false);
  assert.equal(outcome.cause, 'session');
  assert.equal(coord.getToken(), 'old-token');
});

test('network failure reports infra and NEVER destroys the token', async () => {
  const coord = createRefreshCoordinator({
    storage: memoryStorage({ agrobaba_token: 'old-token' }),
    fetchImpl: async () => {
      throw new TypeError('Failed to fetch');
    },
    lockManager: null,
  });

  const outcome = await coord.refresh();
  assert.equal(outcome.ok, false);
  assert.equal(outcome.cause, 'infra');
  assert.equal(coord.getToken(), 'old-token');
});

test('5xx from refresh reports infra, not a session failure', async () => {
  const coord = createRefreshCoordinator({
    storage: memoryStorage({ agrobaba_token: 'old-token' }),
    fetchImpl: async () => jsonResponse(503, { message: 'Service maintenance' }),
    lockManager: null,
  });

  const outcome = await coord.refresh();
  assert.equal(outcome.ok, false);
  assert.equal(outcome.cause, 'infra');
  assert.equal(coord.getToken(), 'old-token');
});

test('403 from refresh reports infra (a missing CSRF header is a server config issue, not logout)', async () => {
  const coord = createRefreshCoordinator({
    storage: memoryStorage({ agrobaba_token: 'old-token' }),
    fetchImpl: async () => jsonResponse(403, { message: 'Missing X-Refresh-Protection' }),
    lockManager: null,
  });

  const outcome = await coord.refresh();
  assert.equal(outcome.ok, false);
  assert.equal(outcome.cause, 'infra');
});

test('a 200 that lacks a token reports infra', async () => {
  const coord = createRefreshCoordinator({
    storage: memoryStorage({ agrobaba_token: 'old-token' }),
    fetchImpl: async () => jsonResponse(200, { id: 1 }),
    lockManager: null,
  });

  const outcome = await coord.refresh();
  assert.equal(outcome.ok, false);
  assert.equal(outcome.cause, 'infra');
});

test('no stored token at all (cold boot) still refreshes from the HttpOnly cookie', async () => {
  const coord = createRefreshCoordinator({
    storage: memoryStorage(),
    fetchImpl: async () => jsonResponse(200, { token: 'restored' }),
    lockManager: null,
  });

  const outcome = await coord.refresh();
  assert.equal(outcome.ok, true);
  assert.equal(outcome.token, 'restored');
  assert.equal(coord.getToken(), 'restored');
  assert.equal(coord.hasToken(), true);
});

test('Web Lock leader performs the POST and stores the minted token', async () => {
  const gate = heldLockManager();
  let posted = false;
  const coord = createRefreshCoordinator({
    storage: memoryStorage({ agrobaba_token: 'old-token' }),
    fetchImpl: async () => {
      posted = true;
      return jsonResponse(200, { token: 'minted' });
    },
    lockManager: gate.lockManager,
  });

  const promise = coord.refresh();
  assert.equal(gate.waiting, 1);
  await gate.release();
  const outcome = await promise;

  assert.equal(posted, true);
  assert.equal(outcome.ok, true);
  assert.equal(outcome.token, 'minted');
  assert.equal(coord.getToken(), 'minted');
});

test('a tab that waits on the Web Lock reuses the token minted by the leader (no second POST)', async () => {
  const storage = memoryStorage({ agrobaba_token: 'old-token' });
  const gate = heldLockManager();
  let posted = false;
  const coord = createRefreshCoordinator({
    storage,
    fetchImpl: async () => {
      posted = true;
      return jsonResponse(200, { token: 'unused' });
    },
    lockManager: gate.lockManager,
  });

  const promise = coord.refresh();
  assert.equal(gate.waiting, 1);
  storage.setItem('agrobaba_token', 'broken-token-ran-by-sibling');
  await gate.release();
  const outcome = await promise;

  assert.equal(posted, false);
  assert.equal(outcome.ok, true);
  assert.equal(outcome.token, 'broken-token-ran-by-sibling');
  assert.equal(outcome.alreadyRefreshed, true);
});

test('cross-tab single-flight via the storage marker when Web Locks is absent', async () => {
  const storage = memoryStorage({ agrobaba_token: 'old-token' });
  let postsA = 0;
  let postsB = 0;
  const gate = deferred<null>();
  const tinySleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const coordA = createRefreshCoordinator({
    storage,
    fetchImpl: async () => {
      postsA++;
      await gate.promise;
      return jsonResponse(200, { token: 'fresh-from-A' });
    },
    lockManager: null,
    sleep: tinySleep,
    locksPollMs: 5,
  });
  const coordB = createRefreshCoordinator({
    storage,
    fetchImpl: async () => {
      postsB++;
      return jsonResponse(200, { token: 'should-never-happen' });
    },
    lockManager: null,
    sleep: tinySleep,
    locksPollMs: 5,
  });

  const pA = coordA.refresh();
  await new Promise((r) => setTimeout(r, 10)); // A wrote its live marker and is mid-POST
  const pB = coordB.refresh();
  await new Promise((r) => setTimeout(r, 30)); // B notices A's marker and waits
  gate.resolve(null); // A finishes and stores the rotated token
  const [oA, oB] = await Promise.all([pA, pB]);

  assert.equal(postsA, 1);
  assert.equal(postsB, 0, 'B must reuse A’s rotated token instead of POSTing the same cookie');
  assert.equal(oA.ok, true);
  assert.equal(oB.ok, true);
  assert.equal(oB.alreadyRefreshed, true);
  assert.equal(oB.token, 'fresh-from-A');
  assert.equal(coordB.getToken(), 'fresh-from-A');
});

/** Common infra-busting helpers reused below. */
function makeProvisioner() {
  const storage = memoryStorage({ agrobaba_token: 'old-token' });
  let broadcasts = 0;
  const coord = createRefreshCoordinator({
    storage,
    fetchImpl: async () => jsonResponse(200, { token: 'minted' }),
    lockManager: null,
    broadcast: () => {
      broadcasts++;
    },
  });
  return { storage, coord, broadcasts: () => broadcasts };
}

test('signalSessionInvalid fires its event/broadcast exactly once', () => {
  const { coord, broadcasts } = makeProvisioner();
  coord.signalSessionInvalid();
  coord.signalSessionInvalid();
  coord.signalSessionInvalid();
  assert.equal(broadcasts(), 1);
});

test('setToken re-arms the revocation guard for the next login', () => {
  const { coord, broadcasts } = makeProvisioner();
  coord.signalSessionInvalid();
  assert.equal(broadcasts(), 1);
  coord.setToken('fresh-token-after-relogin');
  coord.signalSessionInvalid();
  assert.equal(broadcasts(), 2);
});

test('refresh() after an infra failure keeps working when the network returns', async () => {
  let failing = true;
  const coord = createRefreshCoordinator({
    storage: memoryStorage({ agrobaba_token: 'old-token' }),
    fetchImpl: async () => {
      if (failing) throw new TypeError('Failed to fetch');
      return jsonResponse(200, { token: 'recovered' });
    },
    lockManager: null,
  });

  const first = await coord.refresh();
  assert.equal(first.ok, false);
  assert.equal(first.cause, 'infra');
  assert.equal(coord.getToken(), 'old-token');

  failing = false;
  const second = await coord.refresh();
  assert.equal(second.ok, true);
  assert.equal(second.token, 'recovered');
  assert.equal(coord.getToken(), 'recovered');
});