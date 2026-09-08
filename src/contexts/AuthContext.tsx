import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as authLib from '../lib/auth';
import { isAuthRejection } from '../lib/auth';
import { authRefresher, RefreshUnavailableError } from '../lib/api';
import { DEFAULT_UNAUTHORIZED_EVENT, decodeJwtExp } from '../lib/refresh';
import { authLog } from '../lib/authEvents';
import type { RegisterInput } from '../lib/auth';
import type { SafeUser, User } from '../types';

/**
 * Authentication state machine.
 *
 * Identity (WHO the user is) and session phase (HOW trusted the session currently is) are two
 * separate axes, so that a temporary token expiry, a one-off network blip, or an in-progress
 * refresh are NEVER mistaken for "logged out".
 *
 *   identity = 'authenticated' | 'anonymous' | 'unknown'
 *   phase    = 'restoring' | 'live' | 'degraded' | 'reauth' | 'signedOut'
 *
 * The ONLY genuine signed-out state is identity='anonymous' AND phase='signedOut' - reached
 * exclusively through an explicit logout, delete-account, or an irrecoverable session failure
 * with no user to re-authenticate. Everything else (back-end unavailable, refresh retrying,
 * session expired but identity known) keeps `user` and a recoverable phase so the UI never
 * shows a bare "Login" for a recoverable session.
 */
export type AuthIdentity = 'authenticated' | 'anonymous' | 'unknown';
export type AuthPhase = 'restoring' | 'live' | 'degraded' | 'reauth' | 'signedOut';

/** Kept only as a derived, backward-compatible projection used by a few straggler consumers.
 *  Prefer {@link AuthPhase} and {@link AuthIdentity}. */
export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated' | 'serverUnavailable';

interface AuthContextValue {
  /** Confirmed identity. NULL while anonymous or while the session is being confirmed. */
  user: SafeUser | null;
  identity: AuthIdentity;
  phase: AuthPhase;
  status: AuthStatus;
  /** Where to return the user after a graceful re-authentication (a valid Cart/Checkout/route). */
  returnTo: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterInput) => Promise<boolean>;
  logout: () => void;
  /** Re-authenticate an already-identified user (Phase C graceful re-auth). */
  reauthenticate: (password: string) => Promise<boolean>;
  /** Dismiss the re-auth prompt and go to the signed-out state explicitly. */
  dismissReauth: () => void;
  /** Re-verify the stored JWT against Spring Boot. Called on boot and by manual retry. */
  verifyAuth: () => Promise<void>;
  /** Phase B silent renewal: refresh near-expiry tokens in the background (single-flight), and
   *  recover from infra blips. Cheap no-op when the token is still fresh. */
  renewSession: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<boolean>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
  deleteAccount: (password: string) => Promise<boolean>;
}

/** Convenience predicate shared by booking/checkout/payment gates and guards. */
export function isHealthySession(identity: AuthIdentity, phase: AuthPhase): boolean {
  return identity === 'authenticated' && phase === 'live';
}

const AuthContext = createContext<AuthContextValue | null>(null);

const UNAUTHORIZED_EVENT = DEFAULT_UNAUTHORIZED_EVENT;
const REAUTH_RETURNTO_KEY = 'agrobaba_reauth_returnTo';

function readReturnTo(): string | null {
  try {
    return sessionStorage.getItem(REAUTH_RETURNTO_KEY);
  } catch {
    return null;
  }
}
function writeReturnTo(value: string | null): void {
  try {
    if (value) sessionStorage.setItem(REAUTH_RETURNTO_KEY, value);
    else sessionStorage.removeItem(REAUTH_RETURNTO_KEY);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [phase, setPhase] = useState<AuthPhase>('restoring');
  const [returnTo, setReturnTo] = useState<string | null>(readReturnTo());
  // Ref so the global 401 handler and refocus/recovery loop can read the latest state without
  // re-registering listeners, and so we never close over a stale user.
  const stateRef = useRef<{ user: SafeUser | null; phase: AuthPhase }>({ user: null, phase: 'restoring' });
  stateRef.current = { user, phase };

  const identity: AuthIdentity = user
    ? 'authenticated'
    : phase === 'restoring'
      ? 'unknown'
      : 'anonymous';

  const status: AuthStatus =
    phase === 'restoring' ? 'initializing'
      : phase === 'degraded' ? 'serverUnavailable'
        : phase === 'signedOut' ? 'unauthenticated'
          : 'authenticated'; // live || reauth both present the authenticated identity.

  const setLive = useCallback((u: SafeUser) => {
    setUser(u);
    setPhase('live');
    const saved = readReturnTo();
    if (saved) {
      writeReturnTo(null);
      setReturnTo(saved);
    } else {
      writeReturnTo(null);
      setReturnTo(null);
    }
  }, []);

  const beginReauth = useCallback(() => {
    // Preserve current location as the post-reauth destination (Phase C) - never lose it.
    const path = (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '') || '/account';
    writeReturnTo(path);
    setReturnTo(path);
    setPhase('reauth');
    // Keep user + phase only; don't clear the token (re-auth will replace it).
  }, []);

  const enterSignedOut = useCallback(() => {
    authLib.logoutUser();
    setUser(null);
    writeReturnTo(null);
    setReturnTo(null);
    setPhase('signedOut');
  }, []);

  const enterDegraded = useCallback(() => {
    // Backend/network unavailable. NEVER a logout: keep identity so the UI can recover in place.
    setPhase('degraded');
  }, []);

  const verifyAuth = useCallback(async (): Promise<void> => {
    authLog('AUTH_INITIALIZING');
    // Only show the restoring phase on a cold boot / explicit re-verify. In-flight refreshes from
    // the renewal loop keep whatever phase they're in; we just silently succeed or recover.
    if (stateRef.current.phase === 'signedOut') {
      setPhase('restoring');
    }
    try {
      if (authLib.hasStoredToken()) {
        const profile = await authLib.fetchProfile();
        setLive(profile);
      } else {
        const outcome = await authRefresher.refresh();
        if (outcome.ok) {
          const profile = await authLib.fetchProfile();
          setLive(profile);
        } else if (outcome.cause === 'session') {
          // Backend rejected the refresh token itself. If we still know the user, that is a
          // graceful re-auth (identity preserved); otherwise it's a plain signed-out state.
          if (stateRef.current.user) beginReauth();
          else enterSignedOut();
        } else {
          enterDegraded();
        }
      }
      authLog('AUTH_RESTORED', { authenticated: !!stateRef.current.user });
    } catch (error) {
      if (isAuthRejection(error)) {
        // 401 on /me or on the silent refresh -> the session is genuinely gone.
        if (stateRef.current.user) beginReauth();
        else enterSignedOut();
      } else if (error instanceof RefreshUnavailableError) {
        // A 401 on /me meant refresh, but the refresh itself could not complete. Not a logout.
        enterDegraded();
      } else {
        // Backend unreachable. Not a logout - keep identity for in-place recovery.
        enterDegraded();
      }
    }
  }, [setLive, beginReauth, enterSignedOut, enterDegraded]);

  useEffect(() => {
    void verifyAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase B - the shared silent-renewal path used by the visibility/online/focus/heartbeat
  // triggers below. It refreshes atomically (the coordinator is single-flight) and routes every
  // outcome into the state machine - a live refresh is silent, a dead session is a graceful
  // re-auth (identity kept), an infra failure is a degraded (recoverable) state.
  const renewSession = useCallback(async (): Promise<void> => {
    if (stateRef.current.phase === 'restoring') return; // boot flow owns this
    const token = authRefresher.getToken();
    const exp = token ? decodeJwtExp(token) : null;
    const fresh = exp !== null && exp * 1000 - Date.now() > 60_000;
    if (fresh) return; // nothing to do - avoid touching the backend on every focus event
    try {
      const outcome = await authRefresher.refresh();
      if (outcome.ok) {
        const profile = await authLib.fetchProfile();
        setLive(profile);
      } else if (outcome.cause === 'session') {
        if (stateRef.current.user) beginReauth();
        else enterSignedOut();
      } else {
        enterDegraded();
      }
    } catch (error) {
      if (isAuthRejection(error)) {
        if (stateRef.current.user) beginReauth();
        else enterSignedOut();
      } else {
        enterDegraded();
      }
    }
  }, [setLive, beginReauth, enterDegraded, enterSignedOut]);

  // Phase B - tab refocus, visibility, and reconnecting to the network are the moments a user most
  // often notices the app is "stuck". Hook them all into silent renewal so an expired-but-recoverable
  // session heals by itself instead of showing a login screen.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void renewSession();
    };
    const onOnline = () => void renewSession();
    const onFocus = () => void renewSession();
    // Light heartbeat so a long-open idle tab still renews before absolute expiry without needing a
    // user interaction; renewSession() is a cheap no-op while the token is fresh.
    const heartbeat = window.setInterval(() => void renewSession(), 60_000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', onFocus);
    };
  }, [renewSession]);

  // Single global cleanup path for session death (401 refresh rejection, revocation, delete).
  // Mid-session 401s with a known user transition to 'reauth' (graceful), NOT signed-out.
  useEffect(() => {
    function handleUnauthorized() {
      authLog('AUTH_UNAUTHORIZED', { hadUser: !!stateRef.current.user, phase: stateRef.current.phase });
      if (stateRef.current.user) beginReauth();
      else enterSignedOut();
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [beginReauth, enterSignedOut]);

  // Proactive (pre-expiry) silent renewal: armed for exactly one timer while live. The loop lives
  // in auth.ts (Phase B); AuthContext just turns it on/off with the phase.
  useEffect(() => {
    if (phase === 'live') {
      authLib.scheduleProactiveRefresh();
    } else {
      authLib.cancelProactiveRefresh();
    }
  }, [phase]);

  async function login(email: string, password: string): Promise<boolean> {
    const ok = await authLib.loginUser(email, password);
    if (ok) {
      const u = authLib.getCurrentUser();
      if (u) setLive(u);
      else {
        setUser(u);
        setPhase('live');
      }
    }
    return ok;
  }

  async function register(data: RegisterInput): Promise<boolean> {
    const ok = await authLib.registerUser(data);
    if (ok) {
      const u = authLib.getCurrentUser();
      if (u) setLive(u);
      else {
        setUser(u);
        setPhase('live');
      }
    }
    return ok;
  }

  /** Phase C: re-authenticate an already-identified user from the graceful prompt. On success the
   *  session returns to 'live' and the previously-captured returnTo resumes (see setLive). */
  async function reauthenticate(password: string): Promise<boolean> {
    const current = stateRef.current.user;
    if (!current) return false;
    const ok = await authLib.loginUser(current.email, password);
    if (ok) {
      authLog('AUTH_REAUTH_SUCCEEDED', { email: current.email });
      const u = authLib.getCurrentUser();
      if (u) setLive(u);
      else setPhase('live');
      return true;
    }
    setPhase('reauth');
    return false;
  }

  function dismissReauth(): void {
    enterSignedOut();
  }

  function logout(): void {
    void authLib.logoutBackend();
    authLib.logoutUser();
    setUser(null);
    writeReturnTo(null);
    setReturnTo(null);
    setPhase('signedOut');
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
      writeReturnTo(null);
      setReturnTo(null);
      setPhase('signedOut');
    }
    return ok;
  }

  const value: AuthContextValue = {
    user,
    identity,
    phase,
    status,
    returnTo,
    login,
    register,
    logout,
    reauthenticate,
    dismissReauth,
    verifyAuth,
    renewSession,
    updateUser,
    changePassword,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
