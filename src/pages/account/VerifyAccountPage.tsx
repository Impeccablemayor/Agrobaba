import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getMyVerificationStatus, submitVerification } from '../../lib/verification';
import { showToast } from '../../lib/toastBus';
import { formatDate } from '../../lib/format';
import type { VerificationStatusInfo } from '../../types';

export default function VerifyAccountPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<VerificationStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [document, setDocument] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await getMyVerificationStatus();
      if (active) {
        setStatus(data);
        setBusinessName(data?.businessName || '');
        setIdNumber(data?.idNumber || '');
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (!user) return null;

  if (user.role === 'buyer') {
    return (
      <div className="section">
        <div className="container" style={{ maxWidth: 640 }}>
          <div className="empty-cart">
            <i className="fa-solid fa-circle-info"></i>
            <p>Buyers don't need account verification — it's only for farmers, dealers, and service-providers who sell on Agrobaba.</p>
          </div>
        </div>
      </div>
    );
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('File is too large. Max 5MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setDocument(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!businessName || !idNumber || !document) {
      showToast('Please fill in all fields and upload your ID/business document.', 'error');
      return;
    }
    setSubmitting(true);
    const result = await submitVerification({ businessName, idNumber, document });
    setSubmitting(false);
    if (result) setStatus(result);
  }

  if (loading) {
    return (
      <div className="section"><div className="container">
        <div className="empty-cart">
          <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }}></i>
          <p>Loading verification status…</p>
        </div>
      </div></div>
    );
  }

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/account">My Account</Link></li>
            <li className="breadcrumb-item active">Verify Account</li>
          </ol>
        </nav>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Verify Your Account</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            Verified accounts get a trust badge buyers can see on your listings. Submission is reviewed by our team.
          </p>
        </div>

        {status?.status === 'approved' && (
          <div style={{ background: 'var(--primary-light)', border: '1px solid #c8e6d4', borderRadius: 'var(--radius)', padding: 24, textAlign: 'center', marginBottom: 20 }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: 32, color: 'var(--primary)', marginBottom: 12, display: 'block' }}></i>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>You're verified!</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Approved on {formatDate(status.reviewedAt)}. Your listings now show the verified badge.
            </p>
          </div>
        )}

        {status?.status === 'pending' && (
          <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, textAlign: 'center', marginBottom: 20 }}>
            <i className="fa-regular fa-clock" style={{ fontSize: 32, color: 'var(--accent)', marginBottom: 12, display: 'block' }}></i>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>Under review</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
              Submitted {formatDate(status.submittedAt)}. We'll notify you once it's reviewed.
            </p>
          </div>
        )}

        {status?.status === 'rejected' && (
          <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: 24, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <i className="fa-solid fa-circle-xmark" style={{ fontSize: 20, color: 'var(--danger)' }}></i>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Verification rejected</h3>
            </div>
            {status.note && <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Reason: {status.note}</p>}
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>You can update your details below and resubmit.</p>
          </div>
        )}

        {(status?.status === 'unsubmitted' || status?.status === 'rejected') && (
          <form onSubmit={handleSubmit} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32 }}>
            <div className="form-group">
              <label>Business Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" placeholder="e.g. Adewale Farms Ltd" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>

            <div className="form-group">
              <label>ID / Business Registration Number <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" placeholder="e.g. NIN, CAC number" required value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
            </div>

            <div className="form-group">
              <label>ID or Business Document <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="file" accept="image/*,.pdf" ref={fileInputRef} onChange={handleFileChange} />
              <small style={{ fontSize: 11, color: 'var(--muted)' }}>Upload a photo of your ID, CAC certificate, or similar. Max 5MB.</small>
              {document && <p style={{ fontSize: 12, color: 'var(--primary)', marginTop: 6 }}><i className="fa-solid fa-circle-check"></i> Document attached</p>}
            </div>

            <button type="submit" className="btn-primary w-100" disabled={submitting}>
              <i className="fa-solid fa-paper-plane"></i> {submitting ? 'Submitting…' : 'Submit for Review'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
