import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StateCitySelect } from '../../components/StateCitySelect';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../lib/toastBus';
import { buildLocationPayload, EMPTY_LOCATION, type LocationSelection } from '../../lib/locations';
import { isValidPhoneNumber, normalizePhoneNumber, PHONE_INPUT_PATTERN } from '../../lib/validation';
import type { Role } from '../../types';

const ROLE_OPTIONS: { role: Role; icon: string; label: string; blurb: string }[] = [
  { role: 'buyer', icon: 'fa-basket-shopping', label: 'Buyer', blurb: 'I want to buy or source products' },
  { role: 'farmer', icon: 'fa-tractor', label: 'Farmer', blurb: 'I want to sell my produce' },
  { role: 'agro-dealer', icon: 'fa-store', label: 'Agro-Dealer', blurb: 'I sell agro inputs & equipment' },
  { role: 'service-provider', icon: 'fa-stethoscope', label: 'Service Provider', blurb: 'I offer agricultural services' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('buyer');
  const [showPassword, setShowPassword] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', password: '', contact: '', country: 'Nigeria', address: '',
  });
  const [location, setLocation] = useState<LocationSelection>(EMPTY_LOCATION);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!termsChecked) {
      showToast('Please accept the Terms of Service to continue.', 'error');
      return;
    }
    if (!form.name || !form.email || !form.password || !form.contact || !form.country) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    const locationIds = buildLocationPayload(location);
    if (!locationIds) {
      showToast('Please select your state and city.', 'error');
      return;
    }
    if (!isValidPhoneNumber(form.contact)) {
      showToast('Please enter a valid phone number (e.g. 08012345678 or +2348012345678).', 'error');
      return;
    }
    if (form.password.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }
    setSubmitting(true);
    const success = await register({
      ...form,
      contact: normalizePhoneNumber(form.contact),
      role,
      acceptedTerms: termsChecked,
      stateId: locationIds.stateId,
      cityId: locationIds.cityId,
    });
    if (success) {
      // Registration no longer signs the customer in - the account must verify its email
      // first. Hand the address to the OTP screen so it knows which inbox received the code.
      navigate('/verify-email', { state: { email: form.email.toLowerCase() } });
      return;
    }
    setSubmitting(false);
  }

  return (
    <div className="auth-page-container">

      <div className="auth-wrapper">
        <div className="auth-panel">
          <div className="auth-panel-content">
            <div className="auth-panel-header">
              <Link to="/" className="auth-panel-logo">
                <span className="auth-logo-badge">
                  <i className="fa-solid fa-seedling"></i>
                </span>
                Agro<span>baba</span>
              </Link>
            </div>

            <h1 className="auth-panel-headline">
              Trade agricultural produce with confidence.
            </h1>
            <p className="auth-panel-subhead">
              Join farmers, buyers, and agro-dealers transforming agricultural commerce across Nigeria.
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
            <Link to="/" className="auth-mobile-logo">
              <i className="fa-solid fa-seedling"></i> Agro<span>baba</span>
            </Link>
            <span className="auth-mobile-badge"><i className="fa-solid fa-shield-halved"></i> Escrow Protected</span>
          </div>

          <h2>Create Your Account</h2>
          <p className="form-subtitle">Join Nigeria's #1 agro marketplace — it's completely free!</p>

          <GoogleSignInButton
            label="Sign up with Google"
            acceptedTerms={termsChecked}
            onSuccess={() => {
              navigate('/account', { replace: true });
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
            <span>or register with email</span>
            <div style={{ flex: 1, height: 1, backgroundColor: 'color-mix(in srgb, var(--border, #e5e7eb) 80%, transparent)' }} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
              I am joining as a...
            </label>
            <div className="role-options-grid">
              {ROLE_OPTIONS.map((opt) => (
                <div
                  key={opt.role}
                  className={`role-option ${role === opt.role ? 'active' : ''}`}
                  onClick={() => setRole(opt.role)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setRole(opt.role); }}
                >
                  <div className="role-option-head">
                    <div className="role-icon-box">
                      <i className={`fa-solid ${opt.icon}`}></i>
                    </div>
                    <span className="role-title">{opt.label}</span>
                    <i className="fa-solid fa-circle-check role-check"></i>
                  </div>
                  <small className="role-blurb">{opt.blurb}</small>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" placeholder="Your full name" required autoComplete="name" value={form.name} onChange={(e) => update('name', e.target.value)} />
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Email Address <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="email" placeholder="you@example.com" required autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Password <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      style={{ paddingRight: 44 }}
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                    >
                      <i className={showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'}></i>
                    </button>
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Phone Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input
                    type="tel"
                    placeholder="+234... or 080..."
                    required
                    autoComplete="tel"
                    pattern={PHONE_INPUT_PATTERN}
                    title="Please enter a valid Nigerian phone number (e.g. 08012345678 or +2348012345678)"
                    value={form.contact}
                    onChange={(e) => update('contact', e.target.value)}
                  />
                </div>
              </div>
              <div className="col-12 col-md-4">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Country <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" placeholder="Nigeria" required value={form.country} onChange={(e) => update('country', e.target.value)} />
                </div>
              </div>
              <StateCitySelect
                idPrefix="register"
                fieldClassName="form-group"
                wrapperClassName="col-12 col-md-4"
                wrapperStyle={{ marginBottom: 0 }}
                required
                cityLabel="City"
                onChange={setLocation}
              />
              <div className="col-12">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Delivery / Business Address</label>
                  <input type="text" placeholder="Street address, area..." autoComplete="street-address" value={form.address} onChange={(e) => update('address', e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 20, marginBottom: 20 }}>
              <input
                type="checkbox"
                id="terms-check"
                style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, cursor: 'pointer' }}
                checked={termsChecked}
                onChange={(e) => setTermsChecked(e.target.checked)}
              />
              <label htmlFor="terms-check" style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer', lineHeight: 1.5 }}>
                I agree to Agrobaba's <a href="#" style={{ color: 'var(--primary)', fontWeight: 600 }}>Terms of Service</a> and{' '}
                <a href="#" style={{ color: 'var(--primary)', fontWeight: 600 }}>Privacy Policy</a>. I understand that all transactions are escrow-protected.
              </label>
            </div>

            <button type="submit" disabled={submitting} className="btn-primary w-100" style={{ padding: '12px', fontSize: 14 }}>
              {submitting && <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>}
              {submitting ? 'Creating Account…' : (<><i className="fa-solid fa-user-plus"></i> Create Account</>)}
            </button>
          </form>

          <p className="form-footer">
            Already have an account? <Link to="/login">Log in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
