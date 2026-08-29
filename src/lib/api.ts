import {
  createRefreshCoordinator,
  DEFAULT_CHANNEL_NAME,
  DEFAULT_LOCK_KEY,
  DEFAULT_REFRESH_PATH,
  DEFAULT_TOKEN_KEY,
  isSessionRevokedMessage,
  type RefreshCoordinator,
} from './refresh';
import { authLog } from './authEvents';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

interface ApiErrorShape {
  message?: string;
  error?: string;
}

const MAX_RETRIES = 2;

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

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetch(url, init);
    } catch (error) {
      // An intentional abort (e.g. a newer search superseding this one) is not a failure - never retry it.
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      // Only retry a genuine network failure (server unreachable) — never a real HTTP error response.
      if (attempt >= MAX_RETRIES) throw error;
      await sleep(300 * 2 ** attempt);
    }
  }
}

/** Endpoints that authenticate with the refresh cookie directly (or need no session) must never
 *  trigger the automatic 401 -> refresh -> retry loop. */
function isRefreshExempt(path: string): boolean {
  return (
    path === '/api/auth/login' ||
    path === '/api/auth/register' ||
    path === '/api/auth/refresh' ||
    path === '/api/auth/forgot-password' ||
    path === '/api/auth/reset-password'
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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
      response = await fetch(url.toString(), { ...init, headers });
    } else if (outcome.cause === 'session') {
      // The backend rejected the refresh cookie itself (401). signalSessionInvalid() has already
      // fired once; every in-flight request now surfaces as an auth rejection.
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