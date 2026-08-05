import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getMyVerificationStatus, submitVerification, type SubmitVerificationInput } from '../../lib/verification';
import { showToast } from '../../lib/toastBus';
import { formatDate } from '../../lib/format';
import type { VerificationStatusInfo } from '../../types';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function StatusCard({ label, status, submittedAt, reviewedAt, note }: {
  label: string; status: string | null; submittedAt: string | null; reviewedAt: string | null; note: string | null;
}) {
  if (status === 'approved') {
    return (
      <div style={{ background: 'var(--primary-light)', border: '1px solid #c8e6d4', borderRadius: 'var(--radius)', padding: 20, textAlign: 'center', marginBottom: 16 }}>
        <i className="fa-solid fa-circle-check" style={{ fontSize: 26, color: 'var(--primary)', marginBottom: 8, display: 'block' }}></i>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{label} approved</h3>
        <p style={{ color: 'var(--muted)', fontSize: 12.5, margin: 0 }}>Approved {reviewedAt ? `on ${formatDate(reviewedAt)}` : ''}.</p>
      </div>
    );
  }
  if (status === 'pending') {
    return (
      <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, textAlign: 'center', marginBottom: 16 }}>
        <i className="fa-regular fa-clock" style={{ fontSize: 26, color: 'var(--accent)', marginBottom: 8, display: 'block' }}></i>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{label} under review</h3>
        <p style={{ color: 'var(--muted)', fontSize: 12.5, margin: 0 }}>Submitted {submittedAt ? formatDate(submittedAt) : ''}. We'll notify you once it's reviewed.</p>
      </div>
    );
  }
  if (status === 'rejected') {
    return (
      <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <i className="fa-solid fa-circle-xmark" style={{ fontSize: 18, color: 'var(--danger)' }}></i>
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{label} rejected</h3>
        </div>
        {note && <p style={{ color: 'var(--text-secondary)', fontSize: 12.5, margin: 0 }}>Reason: {note}</p>}
      </div>
    );
  }
  return null;
}

function FileField({ label, hint, required, value, onChange }: {
  label: string; hint: string; required?: boolean; value: string | null; onChange: (dataUrl: string) => void;
}) {
  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      showToast('File is too large. Max 5MB.', 'error');
      return;
    }
    onChange(await readFileAsDataUrl(file));
  }

  return (
    <div className="form-group">
      <label>{label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
      <input type="file" accept="image/*,.pdf" required={required && !value} onChange={handleChange} />
      <small style={{ fontSize: 11, color: 'var(--muted)' }}>{hint}</small>
      {value && <p style={{ fontSize: 12, color: 'var(--primary)', marginTop: 6 }}><i className="fa-solid fa-circle-check"></i> File attached</p>}
    </div>
  );
}

export default function VerifyAccountPage() {
  const { user } = useAuth();

  const [status, setStatus] = useState<VerificationStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCac, setShowCac] = useState(false);

  const [form, setForm] = useState<SubmitVerificationInput>({
    idNumber: '', governmentIdDocument: '', selfieDocument: undefined,
    bankAccountName: '', bankAccountNumber: '', bankName: '',
    declarationAccepted: false,
    farmName: '', cropsOrLivestock: '',
    businessName: '', businessAddress: '', productCategoriesSold: '',
    professionalCertificates: undefined, portfolioDocument: undefined,
    cacNumber: '', cacDocument: undefined,
  });

  function set<K extends keyof SubmitVerificationInput>(key: K, value: SubmitVerificationInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await getMyVerificationStatus();
      if (active) {
        setStatus(data);
        if (data) {
          setForm((f) => ({
            ...f,
            idNumber: data.idNumber || '',
            bankAccountName: data.bankAccountName || '',
            bankAccountNumber: data.bankAccountNumber || '',
            bankName: data.bankName || '',
            farmName: data.farmName || '',
            cropsOrLivestock: data.cropsOrLivestock || '',
            businessName: data.businessName || '',
            businessAddress: data.businessAddress || '',
            productCategoriesSold: data.productCategoriesSold || '',
            cacNumber: data.cacNumber || '',
          }));
          setShowCac(!!(data.cacNumber || data.cacDocument));
        }
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

  const isFarmer = user.role === 'farmer';
  const isDealer = user.role === 'agro-dealer';
  const isProvider = user.role === 'service-provider';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.declarationAccepted) {
      showToast('Please accept the verification declaration to continue.', 'error');
      return;
    }
    if (isFarmer && !form.selfieDocument) {
      showToast('A selfie is required for identity verification.', 'error');
      return;
    }
    setSubmitting(true);
    const result = await submitVerification(form);
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

  const canEditIdentity = !status || status.status === 'unsubmitted' || status.status === 'rejected';

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
            Identity verification earns the <strong>Verified Seller</strong> badge. Registering a business (CAC) earns
            the separate <strong>Registered Business</strong> badge, shown alongside it. Both are reviewed by our team.
          </p>
        </div>

        <StatusCard label="Verified Seller" status={status?.status || null} submittedAt={status?.submittedAt || null} reviewedAt={status?.reviewedAt || null} note={status?.note || null} />
        {status?.businessStatus && (
          <StatusCard label="Registered Business" status={status.businessStatus} submittedAt={status.submittedAt} reviewedAt={status.businessReviewedAt} note={status.businessNote} />
        )}

        {canEditIdentity && (
          <form onSubmit={handleSubmit} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Identity</h3>
            <p className="sub" style={{ marginBottom: 16 }}>Required for everyone.</p>

            <div className="form-group">
              <label>Government-Issued ID Number <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" placeholder="e.g. NIN" required value={form.idNumber} onChange={(e) => set('idNumber', e.target.value)} />
            </div>
            <FileField label="Government-Issued ID" required hint="A clear photo or scan of your ID card, driver's license, or passport. Max 5MB." value={form.governmentIdDocument || null} onChange={(v) => set('governmentIdDocument', v)} />
            {isFarmer && (
              <FileField label="Selfie" required hint="A clear photo of your face, for identity matching. Max 5MB." value={form.selfieDocument || null} onChange={(v) => set('selfieDocument', v)} />
            )}

            {isFarmer && (
              <>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: '24px 0 4px' }}>Farm Details</h3>
                <div className="form-group">
                  <label>Farm Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" placeholder="e.g. Adewale Farms" required value={form.farmName} onChange={(e) => set('farmName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Products / Crops or Livestock Produced</label>
                  <textarea rows={2} placeholder="e.g. Maize, cassava, poultry" value={form.cropsOrLivestock} onChange={(e) => set('cropsOrLivestock', e.target.value)} />
                </div>
              </>
            )}

            {(isDealer || isProvider) && (
              <>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: '24px 0 4px' }}>Business Details</h3>
                <div className="form-group">
                  <label>Business Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" placeholder="e.g. Adewale Agro Supplies Ltd" required value={form.businessName} onChange={(e) => set('businessName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>{isDealer ? 'Business Address' : 'Business Address / Area of Operation'} <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input type="text" placeholder="e.g. 12 Market Road, Ibadan" required value={form.businessAddress} onChange={(e) => set('businessAddress', e.target.value)} />
                </div>
              </>
            )}

            {isDealer && (
              <div className="form-group">
                <label>Product Categories Sold <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea rows={2} placeholder="e.g. Fertilizers, seeds, pesticides" required value={form.productCategoriesSold} onChange={(e) => set('productCategoriesSold', e.target.value)} />
              </div>
            )}

            {isProvider && (
              <>
                <FileField label="Professional Certificates / Licenses" hint="Where applicable — e.g. veterinary license. Optional. Max 5MB." value={form.professionalCertificates || null} onChange={(v) => set('professionalCertificates', v)} />
                <FileField label="Portfolio / Photos of Previous Work" hint="Optional, but recommended — helps buyers trust your work. Max 5MB." value={form.portfolioDocument || null} onChange={(v) => set('portfolioDocument', v)} />
              </>
            )}

            <h3 style={{ fontSize: 14, fontWeight: 800, margin: '24px 0 4px' }}>Bank Account Details</h3>
            <div className="form-group">
              <label>Account Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" required value={form.bankAccountName} onChange={(e) => set('bankAccountName', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Account Number <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" required value={form.bankAccountNumber} onChange={(e) => set('bankAccountNumber', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Bank Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" required value={form.bankName} onChange={(e) => set('bankName', e.target.value)} />
            </div>

            <div style={{ margin: '24px 0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Registered Business (Optional)</h3>
              <button type="button" onClick={() => setShowCac((s) => !s)} className="btn-outline btn-sm btn-inline">
                {showCac ? 'Remove' : 'Add CAC Details'}
              </button>
            </div>
            <p className="sub" style={{ marginBottom: 12 }}>
              Optional — registering your CAC-registered business earns a separate Registered Business badge, higher search
              visibility, and eligibility for featured listings and future grants/financing programs. You can join and sell
              on Agrobaba fully without it.
            </p>
            {showCac && (
              <>
                <div className="form-group">
                  <label>CAC Registration Number</label>
                  <input type="text" placeholder="e.g. RC1234567" value={form.cacNumber} onChange={(e) => set('cacNumber', e.target.value)} />
                </div>
                <FileField label="CAC Certificate" hint="A clear photo or scan of your CAC certificate. Max 5MB." value={form.cacDocument || null} onChange={(v) => set('cacDocument', v)} />
              </>
            )}

            <div style={{ margin: '24px 0 16px', display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
              <input
                type="checkbox" id="declaration" checked={form.declarationAccepted}
                onChange={(e) => set('declarationAccepted', e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <label htmlFor="declaration" style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                I certify that all the information and documents provided are true and accurate. I understand that providing
                false or misleading information may result in the rejection of my verification request, suspension of my
                account, or permanent removal from the Agrobaba platform.
              </label>
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
