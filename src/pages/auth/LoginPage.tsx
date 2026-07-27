import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentUser } from '../../lib/auth';
import { showToast } from '../../lib/toastBus';
import { QUICK_LOGIN_USERS } from '../../lib/constants';

interface LocationState {
  from?: { pathname: string; search: string };
}

export default function LoginPage() {
  const { login, register, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const from = (location.state as LocationState | null)?.from;
  const redirectTo = from ? from.pathname + from.search : '/account';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = await login(email, password);
    if (!ok) return;

    if (getCurrentUser()?.role === 'admin') {
      logout();
      showToast('Admin accounts must sign in through the admin portal.', 'error');
      return;
    }

    navigate(redirectTo, { replace: true });
  }

  async function quickLogin(role: string) {
    if (!QUICK_LOGIN_USERS) return;
    const data = QUICK_LOGIN_USERS[role];
    if (!data) return;

    const ok = await login(data.email, data.password);
    if (ok) {
      navigate('/account');
      return;
    }

    const registered = await register(data);
    if (registered) {
      const signedIn = await login(data.email, data.password);
      if (signedIn) navigate('/account');
    }
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
              <label>Password</label>
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

            <button type="submit" className="btn-primary">
              <i className="fa-solid fa-right-to-bracket"></i> Login
            </button>
          </form>

          <p className="form-footer">
            Don't have an account? <Link to="/register">Register free</Link>
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
          </div>

          {QUICK_LOGIN_USERS && (
            <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                <i className="fa-solid fa-flask"></i> Quick Test Login
              </p>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5 }}>
                Don't have an account yet? Use a test account to explore the platform.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => quickLogin('farmer')} className="btn-outline btn-sm btn-inline" style={{ justifyContent: 'flex-start', gap: 10 }}>
                  <i className="fa-solid fa-tractor" style={{ color: 'var(--primary)' }}></i> Login as Farmer
                </button>
                <button onClick={() => quickLogin('buyer')} className="btn-outline btn-sm btn-inline" style={{ justifyContent: 'flex-start', gap: 10 }}>
                  <i className="fa-solid fa-basket-shopping" style={{ color: 'var(--accent)' }}></i> Login as Buyer
                </button>
                <button onClick={() => quickLogin('agro-dealer')} className="btn-outline btn-sm btn-inline" style={{ justifyContent: 'flex-start', gap: 10 }}>
                  <i className="fa-solid fa-store" style={{ color: 'var(--primary)' }}></i> Login as Agro-Dealer
                </button>
                <button onClick={() => quickLogin('service-provider')} className="btn-outline btn-sm btn-inline" style={{ justifyContent: 'flex-start', gap: 10 }}>
                  <i className="fa-solid fa-stethoscope" style={{ color: 'var(--primary)' }}></i> Login as Service Provider
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
