import {
  createRefreshCoordinator,
  DEFAULT_CHANNEL_NAME,
  DEFAULT_LOCK_KEY,
  DEFAULT_REFRESH_PATH,
  DEFAULT_TOKEN_KEY,
  isSessionRevokedMessage,
  decodeJwtExp,
  type RefreshCoordinator,
} from './refresh.ts';
import { authLog } from './authEvents.ts';

const API_BASE_URL = (
  (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8080'
).replace(/\/$/, '');

interface ApiErrorShape {
  message?: string;
  error?: string;
}

const MAX_RETRIES = 2;

/** Hard ceiling for any single API request. A cold backend (e.g. a Render instance waking from
 *  sleep) can otherwise leave a fetch pending until the platform drops the connection, which would
 *  keep the app's session check spinning indefinitely. Bounded so callers always get a result and
 *  can fall back to a recoverable (never "logged out") state. */
const REQUEST_TIMEOUT_MS = 20_000;

/** Error with an HTTP status, thrown whenever the backend responds but not with 2xx. This lets
 *  callers distinguish "backend rejected the request (status)" from "backend unreachable", which
 *  throws the raw fetch TypeError instead. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** The access token could not be re-minted because of a network/server problem while refreshing.
 *  NEVER a logout - the session is still presumed valid, just temporarily unreachable. */
export class RefreshUnavailableError extends Error {
  constructor() {
    super('Refresh unavailable — network or server issue, not a session problem.');
    this.name = 'RefreshUnavailableError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** One fetch guarded by a hard timeout. The caller's own AbortSignal (e.g. a superseded search) is
 *  still honored: aborting it aborts this fetch too, but it must never be retried. */
async function fetchOnce(url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = typeof AbortController === 'undefined' ? null : new AbortController();
  const external = init.signal ?? null;
  const onExternalAbort = () => controller?.abort();
  if (controller && external) {
    if (external.aborted) controller.abort();
    else external.addEventListener('abort', onExternalAbort);
  }
  const timer =
    controller && timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    return await fetch(url, { ...init, ...(controller ? { signal: controller.signal } : {}) });
  } finally {
    if (timer !== null) clearTimeout(timer);
    external?.removeEventListener('abort', onExternalAbort);
  }
}

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const external = init.signal ?? null;
  for (let attempt = 0; ; attempt++) {
    let callerAborted = false;
    const controller = typeof AbortController === 'undefined' ? null : new AbortController();
    const onExternalAbort = () => {
      callerAborted = true;
      controller?.abort();
    };
    if (controller && external) {
      if (external.aborted) {
        callerAborted = true;
        controller.abort();
      } else {
        external.addEventListener('abort', onExternalAbort);
      }
    }
    const timer =
      controller && REQUEST_TIMEOUT_MS > 0
        ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
        : null;
    try {
      return await fetch(url, { ...init, ...(controller ? { signal: controller.signal } : {}) });
    } catch (error) {
      // A caller-initiated abort (e.g. a newer search superseding this one) is not a failure and is
      // never retried. A timeout or network failure IS retried, bounded, so a cold backend that
      // temporarily refuses connections still gets a few chances.
      if (callerAborted) throw error;
      if (attempt >= MAX_RETRIES) throw error;
      await sleep(300 * 2 ** attempt);
    } finally {
      if (timer !== null) clearTimeout(timer);
      external?.removeEventListener('abort', onExternalAbort);
    }
  }
}

/** Endpoints that authenticate with the refresh cookie directly (or need no session) must never
 *  trigger the automatic 401 -> refresh -> retry loop. */
function isRefreshExempt(path: string): boolean {
  return (
    path === '/api/auth/login' ||
    path === '/api/auth/register' ||
    path === '/api/auth/google' ||
    path === '/api/auth/google/link' ||
    path === '/api/auth/refresh' ||
    path === '/api/auth/forgot-password' ||
    path === '/api/auth/reset-password' ||
    // The OTP verification flow runs before any session exists (registration issues no token
    // by policy), so these must never trigger the 401 -> refresh -> retry loop.
    path === '/api/auth/verify-email' ||
    path === '/api/auth/verify-email/otp' ||
    path === '/api/auth/verify-email/resend' ||
    path === '/api/auth/verify-email/status'
  );
}

function readBody(response: Response): Promise<unknown> {
  return response.text().then((text) => {
    try {
      return text ? (JSON.parse(text) as unknown) : null;
    } catch {
      return text;
    }
  });
}

async function throwApiError(response: Response): Promise<never> {
  const data = (await readBody(response)) as ApiErrorShape | null;
  const message =
    typeof data === 'object' && data !== null
      ? data.message || data.error || 'Request failed'
      : 'Request failed';
  throw new ApiError(response.status, message);
}

/** Cross-tab command bus: lets one tab tell every other tab the session was revoked. */
interface AuthBus {
  post(message: unknown): void;
  listen(handler: (message: unknown) => void): void;
}

function createAuthBus(channelName: string): AuthBus {
  let channel: BroadcastChannel | null | undefined;
  const ensure = (): BroadcastChannel | null => {
    if (channel === undefined) {
      try {
        channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(channelName);
      } catch {
        channel = null;
      }
    }
    return channel;
  };
  return {
    post(message: unknown) {
      try {
        ensure()?.postMessage(message);
      } catch {
        /* channel unavailable - local fallback already handled the event */
      }
    },
    listen(handler: (message: unknown) => void) {
      try {
        const ch = ensure();
        if (ch) ch.onmessage = (event) => handler(event.data);
      } catch {
        /* ignore unsupported */
      }
    },
  };
}

const authBus = createAuthBus(DEFAULT_CHANNEL_NAME);

// Keying on DEFAULT_LOCK_KEY matches the coordinator's default; passing it explicitly keeps the
// single-flight contract visible here: one critical section per origin, coordinated across tabs.
export const authRefresher: RefreshCoordinator = createRefreshCoordinator({
  refreshPath: DEFAULT_REFRESH_PATH,
  tokenKey: DEFAULT_TOKEN_KEY,
  lockKey: DEFAULT_LOCK_KEY,
  broadcast: (message) => authBus.post(message),
});

// Any tab hearing "session revoked" must apply the same cleanup it would if the event happened
// locally (signalSessionInvalid guards the once-only broadcast/event).
authBus.listen((message) => {
  if (isSessionRevokedMessage(message)) authRefresher.signalSessionInvalid();
});

/** True when the access token is already expired or within the proactive-renewal skew window of
 *  expiring - the signal to silently renew BEFORE sending rather than waiting for a 401. Never on
 *  the refresh-exempt endpoints (login/register/refresh have no token to guard). */
const PRE_REQUEST_SKEW_MS = 60_000;

function accessTokenStale(): boolean {
  const token = authRefresher.getToken();
  if (!token) return false;
  const expSeconds = decodeJwtExp(token);
  if (expSeconds === null) return true; // unreadable token -> treat as needing a fresh one
  return expSeconds * 1000 - Date.now() <= PRE_REQUEST_SKEW_MS;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Phase B: silently renew BEFORE the request whenever the access token is close to expiring, so
  // the happy path never round-trips a 401. refresh() is single-flight (coordinator), so a burst of
  // simultaneous stale requests share ONE refresh and all continue on the rotated token.
  if (!isRefreshExempt(path) && accessTokenStale()) {
    const renewal = await authRefresher.refresh();
    if (renewal.ok && renewal.token) {
      authLog('AUTH_PRE_REQUEST_RENEW', { path });
    } else if (renewal.cause === 'session') {
      // The session is genuinely dead - surface the global re-auth/signed-out transition exactly
      // once through the same event the 401 path uses.
      authRefresher.signalSessionInvalid();
    }
    // cause 'infra': leave the (possibly stale) token in place; the request will fail as a network
    // error or a 401 -> refresh retry below, both of which are handled gracefully.
  }

  const token = authRefresher.getToken();
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const normalizedBase = `${API_BASE_URL}/`;
  const url = new URL(path.replace(/^\/+/, ''), normalizedBase);

  /* ------------------------------------------------------------------ */
  /*  First attempt                                                     */
  /* ------------------------------------------------------------------ */
  let response = await fetchWithRetry(url.toString(), {
    ...init,
    headers,
  });

  if (response.status === 401 && !isRefreshExempt(path)) {
    const outcome = await authRefresher.refresh();
    if (outcome.ok && outcome.token) {
      // Refresh succeeded (either a POST we made or a token minted by a sibling tab) - retry the
      // original request EXACTLY ONCE with the fresh token. No further 401 handling (no loop).
      headers.set('Authorization', `Bearer ${outcome.token}`);
      authLog('AUTH_RETRY', { path, status: 401 });
      response = await fetchOnce(url.toString(), { ...init, headers });
    } else if (outcome.cause === 'session') {
      // The backend rejected the refresh cookie itself (401): the session is genuinely dead. Fire
      // the global re-auth/signed-out transition exactly once (guarded by the coordinator's
      // once-only guard), then surface the 401 to the caller.
      authRefresher.signalSessionInvalid();
      await throwApiError(response);
    } else {
      // Network/server trouble while refreshing. This is NOT a logout - leave local credentials
      // intact and throw a distinguishable error so callers can offer a graceful retry.
      throw new RefreshUnavailableError();
    }
  }

  if (!response.ok) {
    await throwApiError(response);
  }

  const data = await readBody(response);
  return data as T;
}

export const api = {
  get<T>(path: string, signal?: AbortSignal) {
    return request<T>(path, { method: 'GET', signal });
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  },
  put<T>(path: string, body?: unknown) {
    return request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
  },
  delete<T>(path: string, body?: unknown) {
    return request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined });
  },
};

export function setAuthToken(token: string | null) {
  authRefresher.setToken(token);
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}