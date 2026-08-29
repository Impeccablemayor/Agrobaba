import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as authLib from '../lib/auth';
import { isAuthRejection } from '../lib/auth';
import { authRefresher, RefreshUnavailableError } from '../lib/api';
import { DEFAULT_UNAUTHORIZED_EVENT } from '../lib/refresh';
import { authLog } from '../lib/authEvents';
import type { RegisterInput } from '../lib/auth';
import type { SafeUser, User } from '../types';

/** How the app knows whether the current user can be trusted. The backend is the source of
 *  truth - a JWT in localStorage is never treated as proof of authentication by itself. */
export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated' | 'serverUnavailable';

interface AuthContextValue {
  user: SafeUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterInput) => Promise<boolean>;
  logout: () => void;
  /** Re-verify the stored JWT against Spring Boot. Called on boot and by the retry button. */
  verifyAuth: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  deleteAccount: (password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const UNAUTHORIZED_EVENT = DEFAULT_UNAUTHORIZED_EVENT;

export function AuthProvider({ children }: { children: ReactNode }) {
  // Deliberately NOT seeded from localStorage - the backend must confirm any stored session first.
  const [user, setUser] = useState<SafeUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('initializing');

  const clearAuth = useCallback(() => {
    authLib.logoutUser();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const verifyAuth = useCallback(async (): Promise<void> => {
    authLog('AUTH_INITIALIZING');
    setStatus('initializing');
    let authenticated = false;
    try {
      if (authLib.hasStoredToken()) {
        // Normal restore: /api/auth/me silently confirms the session (and transparently runs
        // refresh if the stored token already expired - see request()).
        const profile = await authLib.fetchProfile();
        setUser(profile);
        setStatus('authenticated');
        authenticated = true;
      } else {
        // No JWT in localStorage (fresh visit, storage cleared, or a sibling tab signed out). The
        // HttpOnly refresh cookie may still be valid: restore the session silently from it before
        // giving up on the "logged in" state. This is the whole point of the refresh system.
        const outcome = await authRefresher.refresh();
        if (outcome.ok) {
          const profile = await authLib.fetchProfile();
          setUser(profile);
          setStatus('authenticated');
          authenticated = true;
        } else if (outcome.cause === 'session') {
          setUser(null);
          setStatus('unauthenticated');
        } else {
          // Backend unreachable while restoring: cannot confirm the session, but MUST NOT treat a
          // possibly-valid session as logged-out. The user can retry from the BackendUnavailable UI.
          setUser(null);
          setStatus('serverUnavailable');
        }
      }
      authLog('AUTH_RESTORED', { authenticated });
    } catch (error) {
      if (isAuthRejection(error)) {
        // Backend is reachable but the JWT/session is invalid or expired (401 on /me or on the
        // silent refresh) - the user really is logged out. (A 403 is "forbidden", not "logged
        // out", and is handled by the respective pages, never by clearing the session.)
        clearAuth();
      } else if (error instanceof RefreshUnavailableError) {
        // A 401 on /me meant refresh, but the refresh itself could not complete (network/server
        // trouble). NOT a logout - keep credentials, surface the retry UI.
        setUser(null);
        setStatus('serverUnavailable');
      } else {
        // Backend unreachable (connection refused/timeout) or failed to verify: we cannot confirm
        // the session, so the user must NOT be treated as authenticated. The JWT is left in place
        // (localStorage is preserved) so it can be re-verified once the backend is reachable again.
        setUser(null);
        setStatus('serverUnavailable');
      }
    }
  }, [clearAuth]);

  useEffect(() => {
    void verifyAuth();
  }, [verifyAuth]);

  // Any 401 anywhere in the app (refresh rejection, revoked session, account deleted) funnels
  // through this single event. Cross-tab revocations arrive here too: api.ts listens on the
  // BroadcastChannel and forwards "session-revoked" messages back through the same window event,
  // so there is exactly one cleanup path.
  useEffect(() => {
    function handleUnauthorized() {
      clearAuth();
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [clearAuth]);

  // Proactive (pre-expiry) silent refresh: armed for exactly one timer only while authenticated.
  useEffect(() => {
    if (status === 'authenticated') {
      authLib.scheduleProactiveRefresh();
    } else {
      authLib.cancelProactiveRefresh();
    }
  }, [status]);

  async function login(email: string, password: string): Promise<boolean> {
    const ok = await authLib.loginUser(email, password);
    if (ok) {
      setUser(authLib.getCurrentUser());
      setStatus('authenticated');
    }
    return ok;
  }

  async function register(data: RegisterInput): Promise<boolean> {
    const ok = await authLib.registerUser(data);
    if (ok) {
      setUser(authLib.getCurrentUser());
      setStatus('authenticated');
    }
    return ok;
  }

  function logout(): void {
    // Revoke the server session first (uses the still-present token), then clear locally. Local
    // logout is synchronous so the UI never waits on the network.
    void authLib.logoutBackend();
    authLib.logoutUser();
    setUser(null);
    setStatus('unauthenticated');
  }

  async function updateUser(data: Partial<User>): Promise<boolean> {
    const ok = await authLib.updateUser(data);
    if (ok) setUser(authLib.getCurrentUser());
    return ok;
  }

  async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    return await authLib.changePassword(oldPassword, newPassword);
  }

  async function deleteAccount(password: string): Promise<boolean> {
    const ok = await authLib.deleteAccount(password);
    if (ok) {
      setUser(null);
      setStatus('unauthenticated');
    }
    return ok;
  }

  return (
    <AuthContext.Provider value={{ user, status, login, register, logout, verifyAuth, updateUser, changePassword, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}