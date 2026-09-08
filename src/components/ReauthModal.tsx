import { useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authLog } from '../lib/authEvents';

/**
 * Phase C - graceful re-authentication.
 *
 * Rendered globally by Layout whenever the session is in the 'reauth' phase - i.e. the access token
 * expired/was rotated and the backend could not silently refresh the session, but the user's
 * identity is still known. We ask for their password IN PLACE (no redirect, cart/checkout state and
 * the current route are preserved) and, on success, return them exactly where they left off.
 *
 * It is NOT a login page: it never clears the user or the cart, and dismissing it is an explicit
 * decision that produces the real signed-out state. A "Login" bare prompt is never shown for a
 * recoverable session.
 */
export function ReauthModal() {
  const { phase, user, returnTo, reauthenticate, dismissReauth } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const open = phase === 'reauth';
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setPassword('');
      const t = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setPending(true);
    setError(null);
    try {
      const ok = await reauthenticate(password);
      if (!ok) setError('Incorrect password. Please try again.');
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setPending(false);
    }
  }

  function handleDismiss() {
    authLog('AUTH_REAUTH_DISMISSED');
    dismissReauth();
  }

  if (!open) return null;

  const display = user?.name ? (user.name.split(' ')[0] || user.name) : 'there';

  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="confirm-icon" aria-hidden="true">
          <i className="fa-solid fa-shield-halved"></i>
        </div>
        <h3 id={titleId}>Session expired – confirm it’s you, {display}</h3>
        <p>
          For your security we need to confirm your password to continue.
          {returnTo ? ' We’ll return you to where you left off.' : ' Your cart and progress are saved.'}
        </p>
        <form onSubmit={handleSubmit} className="reauth-form">
          <label htmlFor="reauth-password" className="sr-only">Password</label>
          <input
            id="reauth-password"
            ref={inputRef}
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={pending}
          />
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="confirm-actions">
            <button type="button" className="btn btn-outline" onClick={handleDismiss} disabled={pending}>
              Not right now – log out
            </button>
            <button type="submit" className="btn btn-primary" disabled={pending || !password}>
              {pending && <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>}
              {pending ? 'Signing you back in…' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
