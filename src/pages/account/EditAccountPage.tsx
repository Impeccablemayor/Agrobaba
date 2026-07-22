import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function EditAccountPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [contact, setContact] = useState(user?.contact || '');
  const [businessName, setBusinessName] = useState(user?.businessName || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || '');
  const [country, setCountry] = useState(user?.country || '');
  const [bio, setBio] = useState(user?.bio || '');

  if (!user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = await updateUser({ name, contact, businessName, address, city, country, bio });
    if (ok) navigate('/account');
  }

  return (
    <div className="section">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/account">My Account</Link></li>
            <li className="breadcrumb-item active">Edit Profile</li>
          </ol>
        </nav>

        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Edit Profile</h1>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Update your account and contact information.</p>
          </div>
          <span className="role-badge"><i className="fa-solid fa-user-tag"></i> {user.role}</span>
        </div>

        <form onSubmit={handleSubmit} className="form-card" style={{ maxWidth: 720 }}>
          <h3><i className="fa-solid fa-id-card"></i> Account Information</h3>

          <div className="row">
            <div className="col-md-6">
              <div className="field">
                <label>Full Name <span className="req">*</span></label>
                <input type="text" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
            <div className="col-md-6">
              <div className="field">
                <label>Email Address</label>
                <input type="email" placeholder="you@example.com" value={user.email} disabled />
                <p className="hint">Email is used to sign in and can't be changed here.</p>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="field">
                <label>Phone Number <span className="req">*</span></label>
                <input type="tel" placeholder="e.g. 08012345678" value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
            </div>
            <div className="col-md-6">
              <div className="field">
                <label>Business / Farm Name</label>
                <input type="text" placeholder="e.g. Dofolly Bee Farms" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </div>
            </div>
          </div>

          <hr className="form-divider" />
          <h3 style={{ marginBottom: 18 }}><i className="fa-solid fa-location-dot"></i> Location</h3>

          <div className="field">
            <label>Address</label>
            <input type="text" placeholder="House number, street, landmark..." value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="field">
                <label>City / Town</label>
                <input type="text" placeholder="e.g. Ibadan" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>
            <div className="col-md-6">
              <div className="field">
                <label>Country</label>
                <input type="text" placeholder="e.g. Nigeria" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label>About <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
            <textarea placeholder="Tell buyers a bit about what you offer..." value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>

          <hr className="form-divider" />

          <div className="actions">
            <button type="submit" className="btn-primary btn-inline">
              <i className="fa-solid fa-floppy-disk"></i> Save Changes
            </button>
            <Link to="/account" className="btn-outline btn-inline">Cancel</Link>
          </div>
        </form>

        <p style={{ marginTop: 16, fontSize: 13, color: 'var(--muted)' }}>
          <i className="fa-solid fa-key"></i> Want to change your password?{' '}
          <Link to="/account/change-password" style={{ color: 'var(--primary)' }}>Update it here</Link>.
        </p>
      </div>
    </div>
  );
}
