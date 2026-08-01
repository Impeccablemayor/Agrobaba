const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');

interface ApiErrorShape {
  message?: string;
  error?: string;
}

const MAX_RETRIES = 2;

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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('agrobaba_token');
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const normalizedBase = `${API_BASE_URL}/`;
  const url = new URL(path.replace(/^\/+/, ''), normalizedBase);

  const response = await fetchWithRetry(url.toString(), {
    ...init,
    headers,
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  function parseJsonResponse<T>(data: unknown): T {
  if (data !== null && typeof data === 'object') return data as T;
  if (Array.isArray(data)) return data as T;
  return data as T;
}

  if (!response.ok) {
    const errData = data as ApiErrorShape;
const message = (typeof errData === 'object' && errData !== null)
  ? (errData.message || errData.error || 'Request failed')
  : 'Request failed';
    throw new Error(message);
  }

  return parseJsonResponse<T>(data);
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
  if (token) localStorage.setItem('agrobaba_token', token);
  else localStorage.removeItem('agrobaba_token');
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
