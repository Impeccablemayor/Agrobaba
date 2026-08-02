import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createCoupon, deleteCoupon, getAllCouponsAdmin } from '../../lib/coupons';
import { showToast } from '../../lib/toastBus';
import { timeAgo } from '../../lib/format';
import { Breadcrumb } from '../../components/Breadcrumb';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import type { Coupon } from '../../types';

export default function AdminCouponsPage() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  async function load() {
    setLoading(true);
    setCoupons(await getAllCouponsAdmin());
    setLoading(false);
  }

  useEffect(() => {
    if (user?.role === 'admin') void load();
  }, [user]);

  if (!user) return null;
  if (user.role !== 'admin') return <Navigate to="/account" replace />;

  async function handleCreate() {
    if (!code.trim()) {
      showToast('Please enter a coupon code.', 'error');
      return;
    }
    if (!discountValue || Number(discountValue) <= 0) {
      showToast('Please enter a valid discount value.', 'error');
      return;
    }
    const result = await createCoupon({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      maxUses: maxUses ? Number(maxUses) : null,
      expiresAt: expiresAt || null,
    });
    if (result) {
      setCode(''); setDiscountValue(''); setMaxUses(''); setExpiresAt('');
      void load();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this coupon?')) return;
    if (await deleteCoupon(id)) void load();
  }

  return (
    <div className="section">
      <div className="container">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'My Account', href: '/account' }, { label: 'Coupons' }]} />

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Coupon Codes</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Create checkout discount codes with optional usage limits and expiry.</p>
        </div>

        {loading ? (
          <PageLoadingSpinner message="Loading coupons…" />
        ) : (
          <>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, marginBottom: 28 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Create a Coupon</h3>

              <div className="row g-3">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Code</label>
                    <input type="text" placeholder="e.g. WELCOME10" value={code} onChange={(e) => setCode(e.target.value)} />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Type</label>
                    <select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}>
                      <option value="percent">Percent off (%)</option>
                      <option value="fixed">Fixed amount off (₦)</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>{discountType === 'percent' ? 'Discount %' : 'Discount ₦'}</label>
                    <input type="number" min="0" placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 2000'} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Max Uses (optional)</label>
                    <input type="number" min="1" placeholder="Unlimited" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Expires (optional)</label>
                    <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                  </div>
                </div>
              </div>

              <button onClick={handleCreate} className="btn-primary btn-inline">
                <i className="fa-solid fa-plus"></i> Create Coupon
              </button>
            </div>

            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>All Coupons</h3>
            {coupons.length === 0 ? (
              <div className="empty-cart">
                <i className="fa-solid fa-tag"></i>
                <p>No coupons created yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="orders-table">
                  <thead>
                    <tr><th>Code</th><th>Discount</th><th>Uses</th><th>Expires</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{c.code}</td>
                        <td>{c.discountType === 'percent' ? `${c.discountValue}%` : `₦${c.discountValue}`}</td>
                        <td>{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                        <td>{c.expiresAt ? timeAgo(c.expiresAt) : 'Never'}</td>
                        <td><span className={`status-${c.active ? 'delivered' : 'pending'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                        <td>
                          <button onClick={() => handleDelete(c.id)} className="btn-danger btn-sm btn-inline">
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
