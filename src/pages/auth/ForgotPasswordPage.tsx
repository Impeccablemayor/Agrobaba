import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const ok = await forgotPassword(email);
    setBusy(false);
    if (ok) setSent(true);
  }

  return (
    <div className="auth-page-container">
      <div className="auth-single-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <i className="fa-solid fa-key" style={{ fontSize: 28, color: 'var(--text)', marginBottom: 10, display: 'block' }}></i>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Reset your password</h2>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Enter your account email and we'll send you a reset link.
          </p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <i className="fa-solid fa-envelope-circle-check" style={{ fontSize: 22, color: 'var(--primary)', marginBottom: 10, display: 'block' }}></i>
            If that email is registered with Agrobaba, a reset link is on its way. It expires in 30 minutes.
            <div style={{ marginTop: 20 }}>
              <Link to="/login" className="btn-outline btn-sm btn-inline">Back to login</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email" placeholder="you@example.com" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-100" disabled={busy}>
              <i className="fa-solid fa-paper-plane"></i> {busy ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="form-footer">
              <Link to="/login">Back to login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
