/**
 * Single-flight, rotation-safe silent refresh coordinator (pure TypeScript, zero deps).
 *
 * Why this exists
 * ---------------
 * Agro-baba uses a 15-minute JWT alongside an HttpOnly refresh cookie scoped to /api/auth. Access
 * tokens are minted from the cookie via POST /api/auth/refresh, and the backend ROTATES the
 * session's refresh token on every successful refresh (see SessionService). Rotation imposes three
 * rules the app must obey:
 *
 *   1. Only ONE refresh POST may be in flight per session. Two concurrent refreshes targeting the
 *      same refresh-token generation would each mint a new rotated cookie; the slower response
 *      would land after the other re-rotated the token, and the backend would treat it as token
 *      reuse -> "Session revoked" for an innocent user.
 *   2. When a POST succeeds, every other tab must REUSE the rotated token/cookie it produced rather
 *      than start its own POST.
 *   3. A failed refresh (401) kills the session for good (rotation + replay protection), so the
 *      failure must be surfaced to the app EXACTLY ONCE even when many requests collide.
 *
 * Concurrency model
 * -----------------
 * Within a tab: a single in-flight Promise. Every caller in this tab awaits the SAME promise, so
 * concurrent 401s cause exactly one POST.
 *
 * Across tabs: the browser Web Locks API (`navigator.locks`) makes refresh a critical section shared
 * by every tab on the same origin. The leading tab does the POST; each follower re-checks the access
 * token BEFORE posting and reuses the rotated token the leader stored. Acquiring the lock also gives
 * a memory barrier: writes the leader made to localStorage under the lock are visible to the next
 * tab that runs under the lock. Tab B is guaranteed to never POST the same cookie generation twice.
 *
 * If Web Locks is unavailable (Firefox < 96, some in-app webviews) a single-slot localStorage marker
 * (with a TTL for crash recovery) is used instead: a live marker from another tab is never
 * overwritten - waiting tabs poll and re-check the access token, and ownership is re-read before
 * every POST. This collapses the dangerous window (two POSTs of the same cookie generation) to a
 * vanishingly rare sub-microsecond race, and even then the backend's replay protection ends the
 * session cleanly ("Session revoked", re-login) rather than corrupting it. On every platform that
 * matters (Chromium, WebKit, modern Gecko) the Web Locks path eliminates the race entirely.
 *
 * Failure semantics
 * -----------------
 *   ok:true                     -> caller stores the new access token.
 *   ok:false, cause:"session"   -> backend rejected the refresh token (rotated/expired/revoked);
 *                                  the session is dead. signalSessionInvalid() fired once, no retry.
 *   ok:false, cause:"infra"     -> network/server problem. NEVER a logout: credentials are kept and
 *                                  the caller retries later (see the proactive scheduler in auth.ts).
 *
 * The refresh POST is exempt from the request layer - api.ts routes other calls, never this one -
 * and always carries a fixed X-Refresh-Protection value, which the backend REQUIRES. A cross-site
 * HTML form cannot set custom headers, so this defeats form-based CSRF on the cookie-authenticated
 * endpoint even under SameSite=None. `credentials: 'include'` is required because the HttpOnly
 * cookie is invisible to JS.
 *
 * This module is intentionally dependency-free and environment-safe so it can be unit-tested under
 * `node --test` with `fetch`, `localStorage`, `BroadcastChannel` and `navigator.locks` all injected
 * or protected by feature detection.
 */

export const DEFAULT_TOKEN_KEY = 'agrobaba_token';
export const DEFAULT_REFRESH_PATH = '/api/auth/refresh';
export const DEFAULT_LOCK_KEY = 'agrobaba-refresh-lock';
export const DEFAULT_CHANNEL_NAME = 'agrobaba-auth';
export const DEFAULT_UNAUTHORIZED_EVENT = 'agrobaba:unauthorized';

export const REFRESH_PROTECTION_HEADER = 'X-Refresh-Protection';
export const REFRESH_PROTECTION_VALUE = 'agrobaba-auth-refresh-1';

export const LOCK_POLL_MS = 100; // Poll interval for the storage-marker fallback.
export const LOCK_ATTEMPTS = 40; // ~40 * 100ms = ~4s of bounded waiting before taking the section.
export const LOCK_TTL_MS = 15_000; // A marker older than this is treated as abandoned.

export interface RefreshStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface RefreshResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type RefreshFetch = (url: string, init: RequestInit) => Promise<RefreshResponseLike>;

export interface WebLocksManagerLike {
  request(name: string, callback: () => Promise<unknown>): Promise<unknown>;
}

export type RefreshCause = 'session' | 'infra';

export interface RefreshOutcome {
  /** True when the access token is valid after this call (freshly minted or reused). */
  ok: boolean;
  /** Present when ok - the access token the caller should store. */
  token?: string;
  /** Present only when !ok - why refresh failed. */
  cause?: RefreshCause;
  /** True when the outcome reused a token minted elsewhere; no POST was performed. */
  alreadyRefreshed?: boolean;
}

export interface RefreshCoordinatorOptions {
  storage?: RefreshStorage;
  fetchImpl?: RefreshFetch;
  lockManager?: WebLocksManagerLike | null;
  refreshPath?: string;
  tokenKey?: string;
  lockKey?: string;
  unauthorizedEvent?: string;
  broadcast?: (message: unknown) => void;
  sleep?: (ms: number) => Promise<void>;
  locksPollMs?: number;
}

export interface RefreshCoordinator {
  getToken(): string | null;
  setToken(token: string | null): void;
  hasToken(): boolean;
  refresh(): Promise<RefreshOutcome>;
  signalSessionInvalid(): void;
}

function randomId(): string {
  try {
    const cryptoLike = globalThis.crypto;
    if (cryptoLike && typeof cryptoLike.randomUUID === 'function') return cryptoLike.randomUUID();
  } catch {
    /* fall back below */
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function defaultStorage(): RefreshStorage {
  const store = typeof localStorage === 'undefined' ? null : localStorage;
  return {
    getItem: (key) => (store ? store.getItem(key) : null),
    setItem: (key, value) => {
      try {
        store?.setItem(key, value);
      } catch {
        /* private mode / quota - the marker is best-effort */
      }
    },
    removeItem: (key) => {
      try {
        store?.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultLockManager(): WebLocksManagerLike | null {
  try {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    if (!locks || typeof locks.request !== 'function') return null;
    return {
      request: (name, callback) => locks.request(name, callback as () => Promise<unknown>) as Promise<unknown>,
    };
  } catch {
    return null;
  }
}

function resolveApiBase(): string {
  const env = (import.meta as { env?: Record<string, string> }).env;
  return String(env?.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
}

function buildRefreshUrl(path: string): string {
  const base = resolveApiBase();
  return `${base}/${path.replace(/^\//, '')}`;
}

/** See the module docs for the precise meaning of "fresh" - used as the cross-tab memory barrier. */
export function createRefreshCoordinator(options?: RefreshCoordinatorOptions): RefreshCoordinator {
  const storage = options?.storage ?? defaultStorage();
  const fetchImpl: RefreshFetch = options?.fetchImpl ?? ((url, init) => fetch(url, init));
  const lockManager = options?.lockManager !== undefined ? options.lockManager : defaultLockManager();
  const refreshPath = options?.refreshPath ?? DEFAULT_REFRESH_PATH;
  const tokenKey = options?.tokenKey ?? DEFAULT_TOKEN_KEY;
  const lockKey = options?.lockKey ?? DEFAULT_LOCK_KEY;
  const lockTtlKey = `${lockKey}:t`;
  const unauthorizedEvent = options?.unauthorizedEvent ?? DEFAULT_UNAUTHORIZED_EVENT;
  const broadcast = options?.broadcast ?? (() => undefined);
  const sleep = options?.sleep ?? defaultSleep;
  const pollMs = options?.locksPollMs ?? LOCK_POLL_MS;
  const maxFallbackWaits = options?.locksPollMs === undefined ? LOCK_ATTEMPTS : Math.max(1, Math.round((LOCK_ATTEMPTS * LOCK_POLL_MS) / Math.max(1, pollMs)));

  const url = buildRefreshUrl(refreshPath);
  let inflight: Promise<RefreshOutcome> | null = null;
  let alreadyInvalidated = false;

  function getToken(): string | null {
    return storage.getItem(tokenKey);
  }

  function hasToken(): boolean {
    return getToken() !== null;
  }

  function setToken(token: string | null): void {
    if (token) storage.setItem(tokenKey, token);
    else storage.removeItem(tokenKey);
    // A new token means the session is valid again for this coordinator instance.
    alreadyInvalidated = false;
  }

  async function performRefreshPost(): Promise<RefreshOutcome> {
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          [REFRESH_PROTECTION_HEADER]: REFRESH_PROTECTION_VALUE,
        },
      });

      if (response.ok) {
        let token: string | null = null;
        try {
          const body = (await response.json()) as Record<string, unknown>;
          if (body && typeof body.token === 'string' && body.token.length > 0) token = body.token;
        } catch {
          /* non-JSON body -> infra below */
        }
        if (!token) return { ok: false, cause: 'infra' };
        return { ok: true, token };
      }

      if (response.status === 401) {
        // The session is genuinely dead (rotated-away token, expired session, revoked session).
        return { ok: false, cause: 'session' };
      }

      // 403/5xx/anything else is NOT a valid "session over" signal and must not log the user out.
      return { ok: false, cause: 'infra' };
    } catch {
      // Network failure / CORS timeout / connection refused - never let an infra problem destroy a
      // valid session. The caller retries later (proactive scheduler / next request).
      return { ok: false, cause: 'infra' };
    }
  }

  /** Null when the token is unchanged; otherwise the fresh token another actor stored. */
  function reusedToken(tokenAtStart: string | null): string | null {
    const current = getToken();
    if (current !== null && current !== tokenAtStart) return current;
    return null;
  }

  async function refreshWithStorageFallback(tokenAtStart: string | null): Promise<RefreshOutcome> {
    const already = reusedToken(tokenAtStart);
    if (already) return { ok: true, token: already, alreadyRefreshed: true };

    const myMarker = randomId();
    const markerId = () => storage.getItem(lockKey);
    const born = () => Number(storage.getItem(lockTtlKey) ?? '0');
    const markerIsLive = () => {
      const b = born();
      return Number.isFinite(b) && Date.now() - b < LOCK_TTL_MS;
    };
    const writeOwn = () => {
      storage.setItem(lockKey, myMarker);
      storage.setItem(lockTtlKey, String(Date.now()));
    };

    try {
      for (let attempt = 0; attempt < maxFallbackWaits; attempt++) {
        const holder = markerId();
        if (holder !== null) {
          if (markerIsLive()) {
            // Another tab is mid-refresh (its marker outlives the POST): wait for it instead of
            // POSTing the same cookie generation. Re-check the token on every wake-up.
            await sleep(pollMs);
            const afterWait = reusedToken(tokenAtStart);
            if (afterWait) return { ok: true, token: afterWait, alreadyRefreshed: true };
            continue;
          }
          // Marker is stale (owner crashed): fall through and take over.
        }

        if (markerId() === null) writeOwn();

        // A sibling wrote after us -> WE lost the ownership race; wait for the winner instead.
        if (markerId() !== myMarker) continue;

        const atPost = reusedToken(tokenAtStart);
        if (atPost) return { ok: true, token: atPost, alreadyRefreshed: true };
        const result = await performRefreshPost();
        if (result.ok && result.token) setToken(result.token);
        return result;
      }

      // Contention never cleared within our budget: take ownership unconditionally and POST. Better
      // to retry the session than to stall the UI; the backend replay guard covers the rare loser.
      writeOwn();
      const atPost = reusedToken(tokenAtStart);
      if (atPost) return { ok: true, token: atPost, alreadyRefreshed: true };
      const result = await performRefreshPost();
      if (result.ok && result.token) setToken(result.token);
      return result;
    } finally {
      if (markerId() === myMarker) {
        storage.removeItem(lockKey);
        storage.removeItem(lockTtlKey);
      }
    }
  }

  async function performSessionRefreshLocked(): Promise<RefreshOutcome> {
    const tokenAtStart = getToken();

    if (lockManager) {
      try {
        const leaderResult = (await lockManager.request(lockKey, async () => {
          // Acquired the critical section: the leader's result may already be visible to us as a
          // fresh token (the cross-tab memory barrier at work).
          const reused = reusedToken(tokenAtStart);
          if (reused) return { ok: true, token: reused, alreadyRefreshed: true } satisfies RefreshOutcome;

          const result = await performRefreshPost();
          if (result.ok && result.token) setToken(result.token);
          return result;
        })) as RefreshOutcome;
        return leaderResult;
      } catch {
        // Lock acquisition failed (e.g. the request was aborted): degrade to the storage fallback.
        // Do NOT recursively await `refresh()` here - `inflight` still points at this very call.
      }
    }

    return refreshWithStorageFallback(tokenAtStart);
  }

  function refresh(): Promise<RefreshOutcome> {
    if (inflight) return inflight;

    const run = async (): Promise<RefreshOutcome> => {
      const result = await performSessionRefreshLocked();
      if (result.ok && result.token) setToken(result.token);
      return result;
    };

    const promise = run();
    inflight = promise;
    promise.then(
      () => {
        if (inflight === promise) inflight = null;
      },
      () => {
        if (inflight === promise) inflight = null;
      },
    );
    return promise;
  }

  function signalSessionInvalid(): void {
    if (alreadyInvalidated) return;
    alreadyInvalidated = true;
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(unauthorizedEvent));
    broadcast({ type: 'session-revoked', source: randomId() });
  }

  return { getToken, setToken, hasToken, refresh, signalSessionInvalid };
}

/** Reads the `exp` claim of a JWT without validating it. Returns null for any malformed token.
 *  Used only to time the proactive refresh - expiry is enforced by the backend, never here. */
export function decodeJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isSessionRevokedMessage(message: unknown): boolean {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'session-revoked'
  );
}