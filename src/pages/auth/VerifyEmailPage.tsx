import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail, resendVerificationEmail, isLoggedIn } from '../../lib/auth';

type Status = 'verifying' | 'success' | 'error' | 'missing';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'missing');
  const [resending, setResending] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verifyEmail(token).then((ok) => setStatus(ok ? 'success' : 'error'));
  }, [token]);

  async function handleResend() {
    setResending(true);
    await resendVerificationEmail();
    setResending(false);
  }

  const loggedIn = isLoggedIn();

  return (
    <div className="auth-page-container">
      <div className="auth-single-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <i
            className={
              status === 'success' ? 'fa-solid fa-circle-check'
                : status === 'verifying' ? 'fa-solid fa-envelope-open-text'
                  : 'fa-solid fa-circle-exclamation'
            }
            style={{
              fontSize: 28,
              color: status === 'error' || status === 'missing' ? 'var(--danger)' : 'var(--text)',
              marginBottom: 10,
              display: 'block',
            }}
          ></i>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
            {status === 'success' ? 'Email verified'
              : status === 'verifying' ? 'Verifying your email…'
                : 'Verification problem'}
          </h2>
        </div>

        {status === 'verifying' && (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
            Just a moment while we confirm your email address.
          </p>
        )}

        {status === 'success' && (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
            Your email address is confirmed and your account is now fully active.
          </p>
        )}

        {status === 'missing' && (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
            This page is opened from the link in your verification email, which is missing its token.
            {loggedIn
              ? ' Use the button below to send a fresh link to your inbox.'
              : ' Please log in and request a new verification email.'}
          </p>
        )}

        {status === 'error' && (
          <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
            This verification link is invalid or has expired.
            {loggedIn
              ? ' Send a new link to your inbox below.'
              : ' Please log in and request a new verification email.'}
          </p>
        )}

        {(status === 'error' || status === 'missing') && loggedIn && (
          <button
            type="button"
            className="btn-primary w-100"
            disabled={resending}
            onClick={handleResend}
          >
            <i className="fa-solid fa-paper-plane"></i> {resending ? 'Sending…' : 'Resend verification email'}
          </button>
        )}

        <p className="form-footer">
          {loggedIn
            ? <Link to="/account">Go to my account</Link>
            : <Link to="/login">Back to login</Link>}
        </p>
      </div>
    </div>
  );
}
