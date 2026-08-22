import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export default function DeleteAccountPage() {
  const { deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const ok = await deleteAccount(password);
    if (ok) {
      setConfirmOpen(false);
      navigate('/');
      return;
    }
    setDeleting(false);
    setConfirmOpen(false);
  }

  return (
    <div className="section">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/account">My Account</Link></li>
            <li className="breadcrumb-item active">Delete Account</li>
          </ol>
        </nav>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Delete Account</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Permanently remove your Agrobaba account and all associated data.</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); setConfirmOpen(true); }}
          className="danger-card"
        >
          <h3><i className="fa-solid fa-triangle-exclamation"></i> This action cannot be undone</h3>
          <p className="sub">Deleting your account will permanently remove:</p>

          <ul className="warn-list">
            <li>Your profile and login details</li>
            <li>All your listings, produce and services</li>
            <li>Your demands, orders and sales history</li>
            <li>Your messages and conversations</li>
          </ul>

          <div className="field">
            <label>Confirm your password <span className="req">*</span></label>
            <input
              type="password" placeholder="Enter your password to continue" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <label className="ack">
            <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
            <span>I understand this is permanent and I want to delete my Agrobaba account and all its data.</span>
          </label>

          <button type="submit" className="btn-danger-full" disabled={!acknowledged || !password}>
            <i className="fa-solid fa-trash-can"></i> Permanently Delete My Account
          </button>
        </form>

        <Link to="/account" className="cancel-link"><i className="fa-solid fa-arrow-left"></i> No, take me back to my account</Link>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Permanently delete your account?"
        message="This action will permanently remove your account, listings, orders, messages and all associated data. It cannot be undone."
        confirmLabel="Delete My Account"
        destructive
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
