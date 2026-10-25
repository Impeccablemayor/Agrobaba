import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentUser } from '../../lib/auth';
import { consumeSessionEnded } from '../../lib/sessionNotice';
import { showToast } from '../../lib/toastBus';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';

interface LocationState {
  from?: { pathname: string; search: string };
  /** Prefilled when arriving from registration or from the verification-required redirect. */
  email?: string;
  /** Shown once when the redirect explained WHY the user was sent here. */
  notice?: string;
}

export default function LoginPage() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const incoming = location.state as LocationState | null;
  const [email, setEmail] = useState(incoming?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // One-time explanation for an INVOLUNTARY sign-out (expiry / revocation). Consumed on mount -
  // AuthContext wrote the marker when the session ended; it survives the redirect to this page and
  // is never shown twice.
  const [sessionEnded] = useState(() => consumeSessionEnded());

  const from = incoming?.from;
  const redirectTo = from ? from.pathname + from.search : '/account';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const outcome = await login(email, password);
    // 403 from a correct password = the email is not verified yet. Route to the OTP screen
    // with the address so the customer can finish verification instead of retrying a password
    // that was actually right.
    if (outcome === 'verification-required') {
      navigate('/verify-email', {
        state: { email: email.toLowerCase(), notice: 'Please verify your email address to continue.' },
      });
      return;
    }
    if (outcome !== 'success') {
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
    <div className="auth-page-container">
      {/* <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item"><Link to="/">Home</Link></li>
          <li className="breadcrumb-item active">Login</li>
        </ol>
      </nav> */}

      <div className="auth-wrapper">
        <div className="auth-panel">
          <div className="auth-panel-content">
            <div className="auth-panel-header">
              <Link to="/" className="auth-panel-logo" aria-label="Agrobaba Home">
                <span className="auth-logo-badge-pill">
                  <img src="/agrobaba-logo.png" alt="AgroBaba" className="auth-brand-img" />
                </span>
              </Link>
            </div>

            <h1 className="auth-panel-headline">
              Welcome back to Nigeria's agro marketplace.
            </h1>
            <p className="auth-panel-subhead">
              Direct, secure trade between farmers, buyers, and agro-dealers across Nigeria.
            </p>

            <div className="auth-points-list">
              <div className="auth-point">
                <span className="point-bullet"><i className="fa-solid fa-check"></i></span>
                <span>List products and reach buyers instantly</span>
              </div>
              <div className="auth-point">
                <span className="point-bullet"><i className="fa-solid fa-check"></i></span>
                <span>Post demands and get competitive quotes</span>
              </div>
              <div className="auth-point">
                <span className="point-bullet"><i className="fa-solid fa-check"></i></span>
                <span>Escrow-protected payments on every deal</span>
              </div>
              <div className="auth-point">
                <span className="point-bullet"><i className="fa-solid fa-check"></i></span>
                <span>Chat directly with buyers and sellers</span>
              </div>
              <div className="auth-point">
                <span className="point-bullet"><i className="fa-solid fa-check"></i></span>
                <span>Build your reputation with verified reviews</span>
              </div>
              <div className="auth-point">
                <span className="point-bullet"><i className="fa-solid fa-check"></i></span>
                <span>Free to join — no hidden fees</span>
              </div>
            </div>
          </div>

          <div className="auth-pullquote">
            <p className="pullquote-text">
              "Registration was easy. Within a week, I found three buyers for my yam harvest and got 30% more than the market price."
            </p>
            <div className="pullquote-author">
              Fatima B. <span>• Farmer, Ogun State</span>
            </div>
          </div>
        </div>

        <div className="auth-form">
          <div className="auth-mobile-header">
            <Link to="/" className="auth-mobile-logo" aria-label="Agrobaba Home">
              <img src="/agrobaba-logo.png" alt="AgroBaba" className="auth-mobile-logo-img" />
            </Link>
            <span className="auth-mobile-badge"><i className="fa-solid fa-shield-halved"></i> Escrow Protected</span>
          </div>

          <h2>Welcome Back</h2>
          <p className="form-subtitle">Log in to your Agrobaba account to continue trading.</p>

          {sessionEnded && (
            <div
              role="status"
              style={{
                marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                background: 'color-mix(in srgb, #d97706 12%, transparent)',
                color: 'var(--text)', border: '1px solid color-mix(in srgb, #d97706 35%, transparent)',
              }}
            >
              <i className="fa-solid fa-clock-rotate-left" style={{ color: '#d97706', marginRight: 8 }}></i>
              Your session has ended. Please sign in again to continue.
            </div>
          )}

          {incoming?.notice && (
            <div
              role="status"
              style={{
                marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                color: 'var(--text)', border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
              }}
            >
              <i className="fa-solid fa-circle-info" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
              {incoming.notice}
            </div>
          )}

          <GoogleSignInButton
            label="Continue with Google"
            onSuccess={() => {
              if (getCurrentUser()?.role === 'admin') {
                logout();
                showToast('Admin accounts must sign in through the admin portal.', 'error');
                return;
              }
              navigate(redirectTo, { replace: true });
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '16px 0 20px',
              color: 'var(--muted, #6b7280)',
              fontSize: 12.5,
            }}
          >
            <div style={{ flex: 1, height: 1, backgroundColor: 'color-mix(in srgb, var(--border, #e5e7eb) 80%, transparent)' }} />
            <span>or sign in with email</span>
            <div style={{ flex: 1, height: 1, backgroundColor: 'color-mix(in srgb, var(--border, #e5e7eb) 80%, transparent)' }} />
          </div>

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

            <button type="submit" className="btn-primary w-100" disabled={submitting} style={{ padding: '12px', fontSize: 14, marginTop: 4 }}>
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
