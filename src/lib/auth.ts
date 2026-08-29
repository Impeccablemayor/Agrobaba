import { KEYS, getItem, setItem } from './storage';
import { showToast } from './toastBus';
import { api, ApiError, authRefresher, setAuthToken } from './api';
import { decodeJwtExp } from './refresh';
import { authLog } from './authEvents';
import type { Role, SafeUser, User } from '../types';

// Push the token refresh to ~60s before its exp so an active user almost never hits a 401. When a
// refresh cannot complete (network/server trouble) the 60s backoff keeps the check running without
// ever logging the user out or spinning a tight loop.
const PROACTIVE_REFRESH_SKEW_MS = 60_000;
const PROACTIVE_IMMEDIATE_THRESHOLD_MS = 30_000;
const PROACTIVE_RETRY_DELAY_MS = 60_000;
const PROACTIVE_MAX_DELAY_MS = 60 * 60 * 1000;

let proactiveTimer: ReturnType<typeof setTimeout> | null = null;

export function getCurrentUser(): SafeUser | null {
  return getItem<SafeUser>(KEYS.user);
}

export function isLoggedIn(): boolean {
  return getCurrentUser() !== null;
}

export function getUserRole(): Role | null {
  return getCurrentUser()?.role ?? null;
}

/** A JWT alone is NOT proof of authentication - it only means a session _might_ exist. The
 *  backend must confirm it via the /api/auth/me verification call before the app trusts it. */
export function hasStoredToken(): boolean {
  return authRefresher.hasToken();
}

/** True when the backend reached and explicitly rejected the session with 401 (expired, revoked,
 *  or an invalid refresh token). 403 is deliberately NOT treated as session-death here: it means
 *  "forbidden" (e.g. an insufficient-role request), not "logged out", so it must never clear the
 *  user's session. */
export function isAuthRejection(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
  country?: string;
  city?: string;
  contact?: string;
  address?: string;
}

export async function registerUser(data: RegisterInput): Promise<boolean> {
  try {
    const response = await api.post<{ token: string; id: number; role: string; name: string; email: string }>('/api/auth/register', {
      name: data.name,
      email: data.email.toLowerCase(),
      password: data.password,
      role: data.role || 'buyer',
    });

    setAuthToken(response.token);

    const safeUser = {
      id: String(response.id),
      name: response.name,
      email: response.email,
      role: response.role as Role,
      country: data.country || '',
      city: data.city || '',
      contact: data.contact || '',
      address: data.address || '',
      verified: false,
      businessVerified: false,
      joinedAt: new Date().toISOString(),
      avatar: null,
    } as SafeUser;

    setItem(KEYS.user, safeUser);
    showToast(`Welcome to Agrobaba, ${response.name}!`, 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create account';
    showToast(message, 'error');
    return false;
  }
}

export async function loginUser(email: string, password: string): Promise<boolean> {
  try {
    const response = await api.post<{ token: string; id: number; role: string; name: string; email: string }>('/api/auth/login', { email, password });
    setAuthToken(response.token);

    const safeUser = {
      id: String(response.id),
      name: response.name,
      email: response.email,
      role: response.role as Role,
      country: '',
      city: '',
      contact: '',
      address: '',
      verified: false,
      businessVerified: false,
      joinedAt: new Date().toISOString(),
      avatar: null,
    } as SafeUser;

    setItem(KEYS.user, safeUser);
    showToast(`Welcome back, ${response.name}!`, 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sign in';
    showToast(message, 'error');
    return false;
  }
}

export function logoutUser(): void {
  cancelProactiveRefresh();
  localStorage.removeItem(KEYS.user);
  /* The cart is deliberately preserved across logout/session expiry: it is the user's own shopping
     record, and wiping it on a token expiry is exactly the data loss this silent-refresh system
     is meant to prevent. */
  setAuthToken(null);
}

/** Best-effort server-side session revocation (calls /api/auth/logout, which deletes the session
 *  row and clears the HttpOnly refresh cookie). Fire-and-forget on purpose: local logout must never
 *  be blocked by the network or the backend auth cache. The POST is issued while the token is still
 *  present so the Authorization header is attached. */
export async function logoutBackend(): Promise<void> {
  try {
    await api.post('/api/auth/logout');
  } catch {
    // Server-side logout is best-effort; the browser-side refresh cookie dies on its next 401.
  }
}

function armProactiveTimer(delayMs: number, note?: Record<string, unknown>): void {
  if (proactiveTimer !== null) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
  }
  proactiveTimer = setTimeout(() => {
    proactiveTimer = null;
    void runProactiveRefresh();
  }, delayMs);
  authLog('AUTH_PROACTIVE_SCHEDULED', note ? { delayMs, ...note } : { delayMs });
}

export function cancelProactiveRefresh(): void {
  if (proactiveTimer !== null) {
    clearTimeout(proactiveTimer);
    proactiveTimer = null;
    authLog('AUTH_PROACTIVE_CANCELLED');
  }
}

/** Arms exactly ONE timer while the user is authenticated. Called by AuthContext whenever the auth
 *  status becomes 'authenticated' (login, register, silent boot restore). Each firing re-arms itself
 *  from the refreshed token, so a single chain of timers tracks the session without loops. */
export function scheduleProactiveRefresh(): void {
  const token = authRefresher.getToken();
  const expSeconds = token ? decodeJwtExp(token) : null;
  if (!token || expSeconds === null) {
    cancelProactiveRefresh();
    return;
  }
  const remainingMs = expSeconds * 1000 - Date.now() - PROACTIVE_REFRESH_SKEW_MS;
  let delayMs: number;
  if (remainingMs <= PROACTIVE_IMMEDIATE_THRESHOLD_MS) {
    delayMs = 0;
  } else {
    delayMs = Math.min(Math.max(remainingMs, PROACTIVE_RETRY_DELAY_MS), PROACTIVE_MAX_DELAY_MS);
  }
  armProactiveTimer(delayMs);
}

async function runProactiveRefresh(): Promise<void> {
  const token = authRefresher.getToken();
  if (!token) {
    cancelProactiveRefresh();
    return;
  }
  const outcome = await authRefresher.refresh();
  if (outcome.ok) {
    scheduleProactiveRefresh();
  } else if (outcome.cause === 'infra') {
    // Infra failure must never log the user out: keep the session and re-check on a fixed backoff.
    authLog('AUTH_RETRY', { kind: 'proactive', cause: 'infra' });
    armProactiveTimer(PROACTIVE_RETRY_DELAY_MS, { infra: true });
  }
  // cause 'session' already signalled revocation through the 401 path - nothing to re-schedule.
}

interface ProfileResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  country: string | null;
  city: string | null;
  contact: string | null;
  address: string | null;
  businessName: string | null;
  bio: string | null;
  verified: boolean;
  businessVerified: boolean;
  avatar: string | null;
}

function mapProfileToSafeUser(profile: ProfileResponse): SafeUser {
  return {
    id: String(profile.id),
    name: profile.name,
    email: profile.email,
    role: profile.role as Role,
    country: profile.country || '',
    city: profile.city || '',
    contact: profile.contact || '',
    address: profile.address || '',
    businessName: profile.businessName || undefined,
    bio: profile.bio || undefined,
    verified: profile.verified,
    businessVerified: profile.businessVerified,
    joinedAt: '',
    avatar: profile.avatar || null,
  };
}

/** Asks Spring Boot to verify the stored JWT and returns the freshly confirmed user. Throws
 *  an ApiError on 401/403 (invalid session) or a network error when the backend is unreachable,
 *  letting the caller distinguish the two cases. */
export async function fetchProfile(): Promise<SafeUser> {
  const profile = await api.get<ProfileResponse>('/api/auth/me');
  const safeUser = mapProfileToSafeUser(profile);
  setItem(KEYS.user, safeUser);
  return safeUser;
}

export async function updateUser(updatedData: Partial<User>): Promise<boolean> {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  try {
    const profile = await api.put<ProfileResponse>('/api/auth/profile', {
      name: updatedData.name,
      country: updatedData.country,
      city: updatedData.city,
      contact: updatedData.contact,
      address: updatedData.address,
      businessName: updatedData.businessName,
      bio: updatedData.bio,
    });

    const safeUser = mapProfileToSafeUser(profile);
    setItem(KEYS.user, safeUser);
    showToast('Profile updated successfully!', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update profile';
    showToast(message, 'error');
    return false;
  }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  try {
    await api.put('/api/auth/password', { oldPassword, newPassword });
    showToast('Password updated successfully!', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to change password';
    showToast(message, 'error');
    return false;
  }
}

export async function forgotPassword(email: string): Promise<boolean> {
  try {
    await api.post('/api/auth/forgot-password', { email });
    showToast("If that email is registered, we've sent a reset link.", 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send reset email';
    showToast(message, 'error');
    return false;
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  try {
    await api.post('/api/auth/reset-password', { token, newPassword });
    showToast('Password reset. You can now log in with your new password.', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reset password';
    showToast(message, 'error');
    return false;
  }
}

export async function deleteAccount(password: string): Promise<boolean> {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;

  try {
    await api.delete('/api/auth/account', { password });
    cancelProactiveRefresh();
    localStorage.removeItem(KEYS.user);
    localStorage.removeItem(KEYS.cart);
    setAuthToken(null);
    showToast('Account deleted. Goodbye!', 'info');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete account';
    showToast(message, 'error');
    return false;
  }
}

