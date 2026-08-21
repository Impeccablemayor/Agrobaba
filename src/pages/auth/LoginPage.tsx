import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentUser } from '../../lib/auth';
import { showToast } from '../../lib/toastBus';

interface LocationState {
  from?: { pathname: string; search: string };
}

export default function LoginPage() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as LocationState | null)?.from;
  const redirectTo = from ? from.pathname + from.search : '/account';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const ok = await login(email, password);
    if (!ok) {
      setSubmitting(false);
      return;
    }

    if (getCurrentUser()?.role === 'admin') {
      logout();
      showToast('Admin accounts must sign in through the admin portal.', 'error');
      setSubmitting(false);
      return;
    }

    navigate(redirectTo, { replace: true });
  }

  return (
    <div className="container" style={{ padding: '40px 24px' }}>
      {/* <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/">Home</Link></li>
          <li className="breadcrumb-item active">Login</li>
        </ol>
      </nav> */}

      <div className="auth-wrapper">
        <div className="auth-panel">
          <div>
            <div className="auth-panel-logo">
              <i className="fa-solid fa-seedling"></i> Agro<span>baba</span>
            </div>
            <p className="auth-panel-tagline">
              Nigeria's trusted agricultural marketplace — where farmers, buyers, dealers and service providers meet.
            </p>
            <ul>
              <li><i className="fa-solid fa-circle-check"></i> Escrow-protected payments on every deal</li>
              <li><i className="fa-solid fa-circle-check"></i> Verified farmers and suppliers</li>
              <li><i className="fa-solid fa-circle-check"></i> Direct trade — no middlemen</li>
              <li><i className="fa-solid fa-circle-check"></i> Post demands and get offers</li>
              <li><i className="fa-solid fa-circle-check"></i> Chat directly with buyers and sellers</li>
            </ul>
          </div>

          <div className="auth-testimonial">
            <p>"Agrobaba changed how I sell my produce. Direct access to buyers with secure payments — I now earn 40% more."</p>
            <div className="cite">— Chidi O., Maize Farmer, Kaduna</div>
          </div>
        </div>

        <div className="auth-form">
          <h2>Welcome Back</h2>
          <p className="form-subtitle">Log in to your Agrobaba account to continue trading.</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" placeholder="you@example.com" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label>Password</label>
                <Link to="/forgot-password" style={{ fontSize: 12.5 }}>Forgot password?</Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
                >
                  <i className={showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'}></i>
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }}></i> Logging in…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-right-to-bracket"></i> Login
                </>
              )}
            </button>
          </form>

          <p className="form-footer">
            Don't have an account? <Link to="/register">Register free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
