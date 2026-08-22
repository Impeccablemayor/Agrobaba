import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../lib/toastBus';

export default function ChangePasswordPage() {
  const { changePassword } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }

    setSubmitting(true);
    const success = await changePassword(oldPassword, newPassword);
    setSubmitting(false);
    if (success) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }

  return (
    <div className="section">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/account">My Account</Link></li>
            <li className="breadcrumb-item active">Change Password</li>
          </ol>
        </nav>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Change Password</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Choose a strong password to keep your account secure.</p>
        </div>

        <form onSubmit={handleSubmit} className="form-card" style={{ maxWidth: 520 }}>
          <h3><i className="fa-solid fa-lock"></i> Update Password</h3>
          <p className="sub">Enter your current password, then your new one.</p>

          <div className="field">
            <label>Current Password <span className="req">*</span></label>
            <input
              type="password" placeholder="Your current password" autoComplete="current-password"
              value={oldPassword} onChange={(e) => setOldPassword(e.target.value)}
            />
          </div>

          <div className="field">
            <label>New Password <span className="req">*</span></label>
            <input
              type="password" placeholder="At least 8 characters" autoComplete="new-password"
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="hint">Use a mix of letters, numbers and symbols.</p>
          </div>

          <div className="field">
            <label>Confirm New Password <span className="req">*</span></label>
            <input
              type="password" placeholder="Re-enter new password" autoComplete="new-password"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary btn-inline" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
            {submitting && <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>}
            {submitting ? 'Updating…' : (<><i className="fa-solid fa-floppy-disk"></i> Update Password</>)}
          </button>
        </form>
      </div>
    </div>
  );
}
