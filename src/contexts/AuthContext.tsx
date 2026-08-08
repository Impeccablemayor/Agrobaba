import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as authLib from '../lib/auth';
import { isAuthRejection } from '../lib/auth';
import type { RegisterInput } from '../lib/auth';
import type { SafeUser, User } from '../types';

/** How the app knows whether the current user can be trusted. The backend is the source of
 *  truth - a JWT in localStorage is never treated as proof of authentication by itself. */
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'serverUnavailable';

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

const UNAUTHORIZED_EVENT = 'agrobaba:unauthorized';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Deliberately NOT seeded from localStorage - the backend must confirm any stored session first.
  const [user, setUser] = useState<SafeUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const clearAuth = useCallback(() => {
    authLib.logoutUser();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const verifyAuth = useCallback(async (): Promise<void> => {
    if (!authLib.hasStoredToken()) {
      // No JWT at all → nothing to verify; drop any stale cached session too.
      clearAuth();
      return;
    }

    setStatus('loading');
    try {
      const profile = await authLib.fetchProfile();
      setUser(profile);
      setStatus('authenticated');
    } catch (error) {
      if (isAuthRejection(error)) {
        // Backend is reachable but the JWT/session is invalid or expired - the user really is logged out.
        clearAuth();
      } else {
        // Backend unreachable (connection refused, timeout) or failed to verify: we cannot confirm
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

  // Consistent handling of any 401 anywhere in the app (not just the boot verification).
  useEffect(() => {
    function handleUnauthorized() {
      clearAuth();
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [clearAuth]);

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