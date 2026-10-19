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
import { isAuthRejection, type LoginOutcome } from '../lib/auth';
import { authRefresher, RefreshUnavailableError } from '../lib/api';
import { DEFAULT_UNAUTHORIZED_EVENT, decodeJwtExp } from '../lib/refresh';
import { authLog } from '../lib/authEvents';
import { markSessionEnded } from '../lib/sessionNotice';
import { showToast } from '../lib/toastBus';
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
 *   phase    = 'restoring' | 'live' | 'degraded' | 'signedOut'
 *
 * The ONLY genuine signed-out state is identity='anonymous' AND phase='signedOut' - reached
 * exclusively through an explicit logout, delete-account, or a confirmed dead session. A confirmed
 * dead session ends GRACEFULLY: the customer is signed out, browsing continues anonymously, the
 * server-side cart stays attached to the account, and a one-time "your session has ended" notice
 * (toast + banner on the login page) explains what happened. The app never demands a password in
 * a modal - the backend has no concept of password re-confirmation, and forcing one on ordinary
 * inactivity is what made the old re-auth modal a problem. Everything else (back-end unavailable,
 * refresh retrying) keeps `user` and a recoverable phase so the UI never shows a bare "Login" for
 * a recoverable session.
 */
export type AuthIdentity = 'authenticated' | 'anonymous' | 'unknown';
export type AuthPhase = 'restoring' | 'live' | 'degraded' | 'signedOut';

/** Kept only as a derived, backward-compatible projection used by a few straggler consumers.
 *  Prefer {@link AuthPhase} and {@link AuthIdentity}. */
export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated' | 'serverUnavailable';

interface AuthContextValue {
  /** Confirmed identity. NULL while anonymous or while the session is being confirmed. */
  user: SafeUser | null;
  identity: AuthIdentity;
  phase: AuthPhase;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  register: (data: RegisterInput) => Promise<boolean>;
  logout: () => void;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [phase, setPhase] = useState<AuthPhase>('restoring');
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
          : 'authenticated';

  const setLive = useCallback((u: SafeUser) => {
    setUser(u);
    setPhase('live');
  }, []);

  /** Confirmed session death (refresh rejected with 401, revocation, delete elsewhere). Ends the
   *  session the way every mainstream storefront does: sign out, keep browsing anonymously, keep
   *  the server-side cart attached to the account, and tell the customer ONCE (toast now + a
   *  one-time banner on the login page via sessionNotice). Never a password modal - the backend
   *  rejected the session, not the person, and re-entering a password restores nothing extra.
   *
   *  Idempotent: repeated 401s, cross-tab broadcasts and heartbeats racing through here together
   *  produce exactly one transition and one notice. Known identity is checked against both live
   *  state and the locally cached profile so a cold boot after an absolute expiry still explains
   *  itself instead of silently redirecting to login. */
  const endSessionGracefully = useCallback(() => {
    const known = stateRef.current.user ?? authLib.getCurrentUser();
    if (!known && stateRef.current.phase === 'signedOut') return; // already signed out - no loop
    authLib.logoutUser();
    setUser(null);
    setPhase('signedOut');
    if (known) {
      markSessionEnded();
      showToast('Your session has ended. Please sign in again.', 'info');
      authLog('AUTH_SESSION_ENDED_GRACEFULLY', { email: known.email });
    }
  }, []);

  const enterSignedOut = useCallback(() => {
    authLib.logoutUser();
    setUser(null);
    setPhase('signedOut');
  }, []);

  const enterDegraded = useCallback(() => {
    // Backend/network unavailable. NEVER a logout: keep identity so the UI can recover in place.
    setPhase('degraded');
  }, []);

  const verifyAuth = useCallback(async (): Promise<void> => {
    authLog('AUTH_INITIALIZING');
    const startedAt = Date.now();
    // Only show the restoring phase on a cold boot / explicit re-verify. In-flight refreshes from
    // the renewal loop keep whatever phase they're in; we just silently succeed or recover.
    if (stateRef.current.phase === 'signedOut') {
      setPhase('restoring');
    }
    try {
      // A previous visit asked to log out but the server never confirmed it (offline, tab closed
      // mid-flight). Settle that FIRST and unconditionally - complete the cookie-based revocation
      // and go signed-out. Without this check, a still-live refresh cookie (or a surviving token)
      // would silently restore the session the user explicitly ended.
      if (authLib.hasUnconfirmedLogout()) {
        const revoked = await authLib.revokePendingLogout();
        if (revoked) authLib.confirmLogoutRevoked();
        authLog('AUTH_PENDING_LOGOUT_SETTLED', { confirmed: revoked });
        enterSignedOut();
        return;
      }
      if (authLib.hasStoredToken()) {
        const profile = await authLib.fetchProfile();
        setLive(profile);
      } else {
        const outcome = await authRefresher.refresh();
        if (outcome.ok) {
          const profile = await authLib.fetchProfile();
          setLive(profile);
        } else if (outcome.cause === 'session') {
          // Backend rejected the refresh token itself: the session is genuinely dead. End it
          // gracefully (one-time notice) instead of demanding a password.
          endSessionGracefully();
        } else {
          enterDegraded();
        }
      }
      authLog('AUTH_RESTORED', { authenticated: !!stateRef.current.user });
    } catch (error) {
      if (isAuthRejection(error)) {
        // 401 on /me or on the silent refresh -> the session is genuinely gone.
        endSessionGracefully();
      } else if (error instanceof RefreshUnavailableError) {
        // A 401 on /me meant refresh, but the refresh itself could not complete. Not a logout.
        enterDegraded();
      } else {
        // Backend unreachable. Not a logout - keep identity for in-place recovery.
        enterDegraded();
      }
    } finally {
      // How long the boot/explicit session check took and how it settled. Lets the cold-start
      // hypothesis be measured in the field (VITE_AUTH_LOG) without server-side log access.
      authLog('AUTH_RESTORE_SETTLED', {
        durationMs: Date.now() - startedAt,
        phase: stateRef.current.phase,
        authenticated: !!stateRef.current.user,
      });
    }
  }, [setLive, endSessionGracefully, enterSignedOut, enterDegraded]);

  useEffect(() => {
    void verifyAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase B - the shared silent-renewal path used by the visibility/online/focus/heartbeat
  // triggers below. It refreshes atomically (the coordinator is single-flight) and routes every
  // outcome into the state machine - a live refresh is silent, a dead session ends gracefully
  // (signed out + one-time notice), an infra failure is a degraded (recoverable) state.
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
        endSessionGracefully();
      } else {
        enterDegraded();
      }
    } catch (error) {
      if (isAuthRejection(error)) {
        endSessionGracefully();
      } else {
        enterDegraded();
      }
    }
  }, [setLive, endSessionGracefully, enterDegraded]);

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

  // Single global cleanup path for session death (401 refresh rejection, revocation, logout in
  // another tab). A dead session ends gracefully - signed out with a one-time notice - never a
  // password re-entry prompt.
  useEffect(() => {
    function handleUnauthorized() {
      authLog('AUTH_UNAUTHORIZED', { hadUser: !!stateRef.current.user, phase: stateRef.current.phase });
      endSessionGracefully();
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [endSessionGracefully]);

  // Proactive (pre-expiry) silent renewal: armed for exactly one timer while live. The loop lives
  // in auth.ts (Phase B); AuthContext just turns it on/off with the phase.
  useEffect(() => {
    if (phase === 'live') {
      authLib.scheduleProactiveRefresh();
    } else {
      authLib.cancelProactiveRefresh();
    }
  }, [phase]);

  async function login(email: string, password: string): Promise<LoginOutcome> {
    const outcome = await authLib.loginUser(email, password);
    if (outcome === 'success') {
      const u = authLib.getCurrentUser();
      if (u) setLive(u);
      else {
        setUser(u);
        setPhase('live');
      }
    }
    return outcome;
  }

  /** Registration no longer authenticates: the backend issues no token until the email OTP is
   *  verified, so success only means "account created - go verify". */
  async function register(data: RegisterInput): Promise<boolean> {
    return authLib.registerUser(data);
  }

  function logout(): void {
    // Record the intent FIRST (in case the browser closes before the server call lands), then
    // revoke on the server. Only a confirmed server-side revocation clears the marker.
    authLib.requestLogout();
    void authLib.logoutBackend().then((revoked) => {
      if (revoked) authLib.confirmLogoutRevoked();
    });
    authLib.logoutUser();
    setUser(null);
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
      setPhase('signedOut');
    }
    return ok;
  }

  const value: AuthContextValue = {
    user,
    identity,
    phase,
    status,
    login,
    register,
    logout,
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
