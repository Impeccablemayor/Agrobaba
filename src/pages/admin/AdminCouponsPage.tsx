import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createCoupon, deleteCoupon, getAllCouponsAdmin } from '../../lib/coupons';
import { showToast } from '../../lib/toastBus';
import { timeAgo } from '../../lib/format';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ActionMenu } from '../../components/ActionMenu';
import type { Coupon } from '../../types';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function AdminCouponsPage() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Coupon | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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

  function resetForm() {
    setCode(''); setDiscountValue(''); setMaxUses(''); setExpiresAt('');
  }

  async function handleCreate() {
    if (!code.trim()) { showToast('Please enter a coupon code.', 'error'); return; }
    if (!discountValue || Number(discountValue) <= 0) { showToast('Please enter a valid discount value.', 'error'); return; }
    const result = await createCoupon({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      maxUses: maxUses ? Number(maxUses) : null,
      expiresAt: expiresAt || null,
    });
    if (result) {
      resetForm();
      setCreateOpen(false);
      void load();
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    if (await deleteCoupon(toDelete.id)) { setToDelete(null); void load(); }
  }

  const filtered = useMemo(() => {
    return coupons.filter((c) => {
      if (statusFilter === 'active' && !c.active) return false;
      if (statusFilter === 'inactive' && c.active) return false;
      if (search.trim() && !c.code.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [coupons, statusFilter, search]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Coupon Codes</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Checkout discount codes with optional usage limits and expiry.</p>
        </div>
        <button className="btn-primary btn-inline" onClick={() => setCreateOpen(true)}>
          <i className="fa-solid fa-plus"></i> New Coupon
        </button>
      </div>

      {loading ? (
        <PageLoadingSpinner message="Loading coupons…" />
      ) : (
        <>
          <div className="admin-filters-row">
            <input type="text" placeholder="Search by code…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 220 }} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-cart">
              <i className="fa-solid fa-tag"></i>
              <p>No coupons match this view.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Code</th><th>Discount</th><th>Uses</th><th>Expires</th><th>Status</th><th>Created</th><th></th></tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{c.code}</td>
                      <td>{c.discountType === 'percent' ? `${c.discountValue}%` : `₦${c.discountValue}`}</td>
                      <td>{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                      <td>{c.expiresAt ? timeAgo(c.expiresAt) : 'Never'}</td>
                      <td><span className={`chip ${c.active ? 'chip-success' : 'chip-neutral'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                      <td style={{ color: 'var(--muted)' }}>{timeAgo(c.createdAt)}</td>
                      <td>
                        <ActionMenu items={[
                          { label: 'Delete', icon: 'fa-trash', danger: true, onClick: () => setToDelete(c) },
                        ]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {createOpen && (
        <div className="admin-drawer-overlay" onClick={() => setCreateOpen(false)}>
          <div className="admin-drawer" onClick={(e) => e.stopPropagation()} style={{ width: 'min(440px, 100vw)' }}>
            <div className="admin-drawer-hdr">
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>New Coupon</h3>
              <button className="admin-drawer-close" onClick={() => setCreateOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>

            <div className="form-group">
              <label>Code</label>
              <input type="text" placeholder="e.g. WELCOME10" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}>
                <option value="percent">Percent off (%)</option>
                <option value="fixed">Fixed amount off (₦)</option>
              </select>
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-group">
                  <label>{discountType === 'percent' ? 'Discount %' : 'Discount ₦'}</label>
                  <input type="number" min="0" placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 2000'} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label>Max Uses (optional)</label>
                  <input type="number" min="1" placeholder="Unlimited" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Expires (optional)</label>
              <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>

            <button onClick={handleCreate} className="btn-primary btn-inline">
              <i className="fa-solid fa-plus"></i> Create Coupon
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this coupon?"
        message={`"${toDelete?.code}" will no longer be redeemable at checkout.`}
        confirmLabel="Delete coupon"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
