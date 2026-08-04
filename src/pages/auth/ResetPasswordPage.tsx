import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../lib/auth';
import { showToast } from '../../lib/toastBus';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      showToast('This reset link is missing its token. Please request a new one.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }

    setBusy(true);
    const ok = await resetPassword(token, newPassword);
    setBusy(false);
    if (ok) navigate('/login', { replace: true });
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg-soft)' }}>
      <div style={{ width: '100%', maxWidth: 380, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <i className="fa-solid fa-lock-open" style={{ fontSize: 28, color: 'var(--text)', marginBottom: 10, display: 'block' }}></i>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Set a new password</h2>
          {!token && (
            <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8 }}>
              This link is missing a reset token. Request a new one from the <Link to="/forgot-password">forgot password</Link> page.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password" placeholder="At least 8 characters" required autoComplete="new-password"
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password" required autoComplete="new-password"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary w-100" disabled={busy || !token}>
            <i className="fa-solid fa-check"></i> {busy ? 'Resetting…' : 'Reset password'}
          </button>
          <p className="form-footer">
            <Link to="/login">Back to login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
