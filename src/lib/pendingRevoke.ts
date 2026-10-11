/**
 * Pending-logout revocation marker.
 *
 * When the user clicks "Log out", the backend session is revoked and the HttpOnly refresh cookie is
 * cleared by POST /api/auth/logout. If that call cannot complete (offline, backend down, tab closed
 * mid-flight), the HttpOnly cookie survives with its 7-day max-age - and a later silent refresh would
 * resurrect the session, silently logging the user back in after an explicit logout. The marker below
 * records "this person just asked to be logged out and the server has NOT yet confirmed it". On the
 * next app start the boot flow finds it and calls the cookie-authenticated logout path instead of the
 * silent-refresh path, which completes the revocation and clears the cookie for good. The marker only
 * disappears once the server has confirmed the revocation, so it can never auto-restore a session.
 *
 * localStorage (not sessionStorage) is deliberate: closing/opening the browser must NOT erase the
 * fact that a logout still needs to reach the server.
 */

export const PENDING_REVOKE_KEY = 'agrobaba_pending_logout_revoke';

function store(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function markPendingRevoke(): void {
  try {
    store()?.setItem(PENDING_REVOKE_KEY, '1');
  } catch {
    /* ignore - best effort */
  }
}

export function clearPendingRevoke(): void {
  try {
    store()?.removeItem(PENDING_REVOKE_KEY);
  } catch {
    /* ignore - best effort */
  }
}

export function hasPendingRevoke(): boolean {
  try {
    return store()?.getItem(PENDING_REVOKE_KEY) != null;
  } catch {
    return false;
  }
}