import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../lib/toastBus';
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
  const [form, setForm] = useState({
    name: '', email: '', password: '', contact: '', country: 'Nigeria', city: '', address: '',
  });

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!termsChecked) {
      showToast('Please accept the Terms of Service to continue.', 'error');
      return;
    }
    if (!form.name || !form.email || !form.password) {
      showToast('Please fill in all required fields.', 'error');
      return;
    }
    const success = await register({ ...form, role });
    if (success) {
      navigate('/onboarding');
    }
  }

  return (
    <div className="container" style={{ padding: '40px 24px' }}>

      <div className="auth-wrapper">
        <div className="auth-panel">
          <div>
            <div className="auth-panel-logo">
              <i className="fa-solid fa-seedling"></i> Agro<span>baba</span>
            </div>
            <p className="auth-panel-tagline">
              Join thousands of farmers, buyers and agro-dealers transforming agricultural trade across Nigeria.
            </p>
            <ul>
              <li><i className="fa-solid fa-circle-check"></i> List products and reach buyers instantly</li>
              <li><i className="fa-solid fa-circle-check"></i> Post demands and get competitive quotes</li>
              <li><i className="fa-solid fa-circle-check"></i> Escrow-protected payments on every deal</li>
              <li><i className="fa-solid fa-circle-check"></i> Chat directly with buyers and sellers</li>
              <li><i className="fa-solid fa-circle-check"></i> Build your reputation with verified reviews</li>
              <li><i className="fa-solid fa-circle-check"></i> Free to join — no hidden fees</li>
            </ul>
          </div>

          <div className="auth-testimonial">
            <p>"Registration was easy. Within a week, I found three buyers for my yam harvest and got 30% more than the market price."</p>
            <div className="cite">— Fatima B., Farmer, Ogun State</div>
          </div>
        </div>

        <div className="auth-form">
          <h2>Create Your Account</h2>
          <p className="form-subtitle">Join Nigeria's #1 agro marketplace — it's completely free!</p>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
              I am joining as a...
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {ROLE_OPTIONS.map((opt) => (
                <div
                  key={opt.role}
                  className={`role-option ${role === opt.role ? 'active' : ''}`}
                  onClick={() => setRole(opt.role)}
                >
                  <i className={`fa-solid ${opt.icon}`}></i>
                  <span>{opt.label}</span>
                  <small>{opt.blurb}</small>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Full Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" placeholder="Your full name" required autoComplete="name" value={form.name} onChange={(e) => update('name', e.target.value)} />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Email Address <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="email" placeholder="you@example.com" required autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Password <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      required
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
              <div className="col-md-6">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Phone Number <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="tel" placeholder="+234..." required autoComplete="tel" value={form.contact} onChange={(e) => update('contact', e.target.value)} />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Country <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" placeholder="Nigeria" required value={form.country} onChange={(e) => update('country', e.target.value)} />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>City / State <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" placeholder="e.g. Ibadan, Oyo" required value={form.city} onChange={(e) => update('city', e.target.value)} />
                </div>
              </div>
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

            <button type="submit" className="btn-primary">
              <i className="fa-solid fa-user-plus"></i> Create Account
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
