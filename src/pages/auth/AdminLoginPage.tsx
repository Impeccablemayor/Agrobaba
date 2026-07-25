import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentUser } from '../../lib/auth';
import { showToast } from '../../lib/toastBus';

export default function AdminLoginPage() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = await login(email, password);
    if (!ok) return;

    if (getCurrentUser()?.role !== 'admin') {
      logout();
      showToast('This portal is for administrators only.', 'error');
      return;
    }

    navigate('/admin/verifications', { replace: true });
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg-soft)' }}>
      <div style={{ width: '100%', maxWidth: 380, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <i className="fa-solid fa-user-shield" style={{ fontSize: 28, color: 'var(--text)', marginBottom: 10, display: 'block' }}></i>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Admin Sign In</h2>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Restricted access</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary w-100">
            <i className="fa-solid fa-right-to-bracket"></i> Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
