/**
 * One-time marker that a signed-in session ended involuntarily (expiry, revocation, or logout in
 * another tab) while the customer still had an identity. It survives the automatic redirect to
 * /login via sessionStorage and is consumed exactly once, so the "your session has ended" notice
 * is shown precisely once per ended session - never repeatedly, and never in a redirect loop.
 *
 * Storage is injectable so the semantics are unit-testable without a browser.
 */
const SESSION_ENDED_KEY = 'agrobaba_session_ended';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** Records that a session ended involuntarily. Best-effort: if storage is unavailable the caller's
 *  toast still carries the message, so a failure here must never throw into the auth flow. */
export function markSessionEnded(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(SESSION_ENDED_KEY, '1');
  } catch {
    /* storage unavailable - not fatal */
  }
}

/** Reads and clears the marker. Returns true at most once per ended session. */
export function consumeSessionEnded(storage: StorageLike | null = defaultStorage()): boolean {
  try {
    if (!storage) return false;
    const present = storage.getItem(SESSION_ENDED_KEY) === '1';
    storage.removeItem(SESSION_ENDED_KEY);
    return present;
  } catch {
    return false;
  }
}
