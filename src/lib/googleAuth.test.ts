import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Polyfill BroadcastChannel to prevent Node test runner hanging
Object.defineProperty(globalThis, 'BroadcastChannel', { value: undefined, configurable: true });

// In-memory localStorage mock for node --test
const storage = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, String(v)),
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear(),
  get length() {
    return storage.size;
  },
  key: (i: number) => Array.from(storage.keys())[i] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', {
  value: fakeLocalStorage,
  configurable: true,
  writable: true,
});

const { loginWithGoogle, linkGoogleAccountWithPassword, getCurrentUser } = await import('./auth.ts');
const { authRefresher, setAuthToken } = await import('./api.ts');
const { KEYS, getItem } = await import('./storage.ts');

beforeEach(() => {
  storage.clear();
  setAuthToken(null);
  authRefresher.setRefreshToken(null);
});

test('loginWithGoogle stores AgroBaba token and profile on success', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/api/auth/google')) {
      const body = JSON.parse(String(init?.body || '{}'));
      assert.equal(body.idToken, 'valid-google-id-token');
      assert.equal(body.acceptedTerms, true);

      return new Response(
        JSON.stringify({
          token: 'agrobaba-jwt-access-token',
          refreshToken: 'session-id:refresh-secret-123',
          id: 55,
          role: 'buyer',
          name: 'Jane Farmer',
          email: 'jane@example.com',
          avatar: 'https://lh3.googleusercontent.com/photo.jpg',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('Not Found', { status: 404 });
  };

  try {
    const result = await loginWithGoogle('valid-google-id-token', true);
    assert.equal(result.outcome, 'success');
    assert.equal(result.email, 'jane@example.com');

    // Token must be stored in auth coordinator
    assert.equal(authRefresher.getToken(), 'agrobaba-jwt-access-token');
    assert.equal(authRefresher.getRefreshToken(), 'session-id:refresh-secret-123');

    // Safe user profile must be stored
    const user = getCurrentUser();
    assert.ok(user);
    assert.equal(user?.id, '55');
    assert.equal(user?.name, 'Jane Farmer');
    assert.equal(user?.email, 'jane@example.com');
    assert.equal(user?.role, 'buyer');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('loginWithGoogle returns linking-required when account exists with password (409)', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/auth/google')) {
      return new Response(
        JSON.stringify({
          status: 409,
          error: 'Conflict',
          message: 'An account with this email already exists. Please verify your password to link your Google account.',
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('Not Found', { status: 404 });
  };

  try {
    const result = await loginWithGoogle('google-id-token-conflict', true);
    assert.equal(result.outcome, 'linking-required');

    // No session tokens should be stored
    assert.equal(authRefresher.getToken(), null);
    assert.equal(getCurrentUser(), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('loginWithGoogle returns terms-required when terms must be accepted (400)', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/auth/google')) {
      return new Response(
        JSON.stringify({
          status: 400,
          error: 'Bad Request',
          message: 'Terms of Service and Privacy Policy must be accepted.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('Not Found', { status: 404 });
  };

  try {
    const result = await loginWithGoogle('google-id-token-unaccepted-terms', false);
    assert.equal(result.outcome, 'terms-required');

    // No session tokens should be stored
    assert.equal(authRefresher.getToken(), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('linkGoogleAccountWithPassword successfully links and stores session on correct password', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/api/auth/google/link')) {
      const body = JSON.parse(String(init?.body || '{}'));
      assert.equal(body.idToken, 'google-id-token');
      assert.equal(body.password, 'correct-password');

      return new Response(
        JSON.stringify({
          token: 'agrobaba-jwt-linked-token',
          refreshToken: 'session-id:refresh-secret-linked',
          id: 77,
          role: 'farmer',
          name: 'Old User',
          email: 'olduser@example.com',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('Not Found', { status: 404 });
  };

  try {
    const success = await linkGoogleAccountWithPassword('google-id-token', 'correct-password');
    assert.equal(success, true);

    assert.equal(authRefresher.getToken(), 'agrobaba-jwt-linked-token');
    assert.equal(authRefresher.getRefreshToken(), 'session-id:refresh-secret-linked');

    const user = getCurrentUser();
    assert.ok(user);
    assert.equal(user?.id, '77');
    assert.equal(user?.role, 'farmer'); // Preserves existing role
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('linkGoogleAccountWithPassword returns false on wrong password', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/auth/google/link')) {
      return new Response(
        JSON.stringify({
          status: 401,
          error: 'Unauthorized',
          message: 'Invalid credentials for existing account.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('Not Found', { status: 404 });
  };

  try {
    const success = await linkGoogleAccountWithPassword('google-id-token', 'wrong-password');
    assert.equal(success, false);

    assert.equal(authRefresher.getToken(), null);
    assert.equal(getCurrentUser(), null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
