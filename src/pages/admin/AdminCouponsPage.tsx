import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminCoupons } from '../../hooks/queries/useAdmin';
import { useCreateCoupon, useDeleteCoupon, useUpdateCoupon } from '../../hooks/mutations/useAdminMutations';
import { useInfluencers } from '../../hooks/queries/useInfluencers';
import { showToast } from '../../lib/toastBus';
import { formatDate, timeAgo } from '../../lib/format';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ActionMenu } from '../../components/ActionMenu';
import type { Coupon } from '../../types';

type StatusFilter = 'all' | 'active' | 'inactive';

/** API timestamps are UTC ("...Z"); a datetime-local input shows the admin's own clock (Lagos). */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The server compares expiry against a UTC clock, so send the admin's local choice as UTC. */
function toUtc(localValue: string): string | null {
  if (!localValue) return null;
  return new Date(localValue).toISOString().slice(0, 19);
}

/** Coupon codes. Today they are influencer codes paid for by AgroBaba (the buyer gets a discount,
 *  the influencer earns a commission, sellers are paid in full). A code can also be seller-funded. */
export default function AdminCouponsPage() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [toDelete, setToDelete] = useState<Coupon | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('1');
  const [maxUses, setMaxUses] = useState('');
  const [perBuyer, setPerBuyer] = useState('1');
  const [expiresAt, setExpiresAt] = useState('');
  const [fundedBy, setFundedBy] = useState<'PLATFORM' | 'SELLER'>('PLATFORM');
  const [influencerId, setInfluencerId] = useState('');
  const [influencerRate, setInfluencerRate] = useState('1');
  const [sellerId, setSellerId] = useState('');

  const { data: coupons = [], isLoading: loading } = useAdminCoupons();
  const { data: influencers = [] } = useInfluencers();
  const createMutation = useCreateCoupon();
  const deleteMutation = useDeleteCoupon();

  const filtered = useMemo(() => {
    return coupons.filter((c) => {
      if (statusFilter === 'active' && !c.active) return false;
      if (statusFilter === 'inactive' && c.active) return false;
      if (search.trim() && !c.code.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [coupons, statusFilter, search]);

  if (!user) return null;
  if (user.role !== 'admin') return <Navigate to="/account" replace />;

  function resetForm() {
    setCode(''); setDiscountValue('1'); setMaxUses(''); setPerBuyer('1'); setExpiresAt('');
    setFundedBy('PLATFORM'); setInfluencerId(''); setInfluencerRate('1'); setSellerId('');
  }

  async function handleCreate() {
    if (!code.trim()) { showToast('Please enter a coupon code.', 'error'); return; }
    if (!discountValue || Number(discountValue) <= 0) { showToast('Please enter a valid discount value.', 'error'); return; }
    const result = await createMutation.mutateAsync({
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      maxUses: maxUses ? Number(maxUses) : null,
      maxUsesPerBuyer: perBuyer ? Number(perBuyer) : 1,
      expiresAt: toUtc(expiresAt),
      fundedBy,
      sellerId: fundedBy === 'SELLER' && sellerId ? Number(sellerId) : null,
      influencerId: fundedBy === 'PLATFORM' && influencerId ? Number(influencerId) : null,
      influencerRate: fundedBy === 'PLATFORM' && influencerId ? Number(influencerRate || '0') : null,
    });
    if (result) {
      resetForm();
      setCreateOpen(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    if (await deleteMutation.mutateAsync(toDelete.id)) setToDelete(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Coupon Codes</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Influencer codes: the buyer gets a discount and the influencer earns a commission, both paid by AgroBaba.
            Discounts never apply to delivery. <Link to="/admin/influencers">Manage influencers</Link>
          </p>
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
            <input type="text" placeholder="Search by code…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  <tr><th>Code</th><th>Discount</th><th>Paid by</th><th>Uses</th><th>Expires</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{c.code}</td>
                      <td>{c.discountType === 'percent' ? `${c.discountValue}%` : `₦${c.discountValue}`}</td>
                      <td style={{ fontSize: 12 }}>
                        {c.fundedBy === 'SELLER'
                          ? <>Seller: {c.sellerName || `#${c.sellerId}`}</>
                          : c.influencerId
                            ? <>AgroBaba · {c.influencerName || `Influencer #${c.influencerId}`} earns {c.influencerRate}%</>
                            : 'AgroBaba'}
                      </td>
                      <td>{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}<div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.maxUsesPerBuyer} per customer</div></td>
                      <td>{c.expiresAt ? formatDate(c.expiresAt) : 'Never'}</td>
                      <td><span className={`chip ${c.active ? 'chip-success' : 'chip-neutral'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <ActionMenu items={[
                          { label: 'Edit expiry & limits', icon: 'fa-pen', onClick: () => setEditing(c) },
                          ...(c.active ? [{ label: 'Deactivate', icon: 'fa-ban', danger: true, onClick: () => setToDelete(c) }] : []),
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
          <div className="admin-drawer" onClick={(e) => e.stopPropagation()} style={{ width: 'min(460px, 100vw)' }}>
            <div className="admin-drawer-hdr">
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>New Coupon</h3>
              <button className="admin-drawer-close" aria-label="Close" onClick={() => setCreateOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>

            <div className="form-group">
              <label htmlFor="c-code">Code</label>
              <input id="c-code" type="text" placeholder="e.g. TOLU1" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="c-funded">Who pays for the discount?</label>
              <select id="c-funded" value={fundedBy} onChange={(e) => setFundedBy(e.target.value as 'PLATFORM' | 'SELLER')}>
                <option value="PLATFORM">AgroBaba (influencer / promotion code)</option>
                <option value="SELLER">A seller (only their products)</option>
              </select>
            </div>
            {fundedBy === 'PLATFORM' ? (
              <div className="row g-3">
                <div className="col-md-7">
                  <div className="form-group">
                    <label htmlFor="c-inf">Influencer (optional)</label>
                    <select id="c-inf" value={influencerId} onChange={(e) => setInfluencerId(e.target.value)}>
                      <option value="">No influencer</option>
                      {influencers.filter((i) => i.active).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="col-md-5">
                  <div className="form-group">
                    <label htmlFor="c-rate">Influencer earns %</label>
                    <input id="c-rate" type="number" min="0" max="100" step="0.01" disabled={!influencerId} value={influencerRate} onChange={(e) => setInfluencerRate(e.target.value)} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="c-seller">Seller account ID</label>
                <input id="c-seller" type="number" min="1" placeholder="From the seller's profile in Users" value={sellerId} onChange={(e) => setSellerId(e.target.value)} />
              </div>
            )}
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-group">
                  <label htmlFor="c-type">Type</label>
                  <select id="c-type" value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}>
                    <option value="percent">Percent off (%)</option>
                    <option value="fixed">Fixed amount off (₦)</option>
                  </select>
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label htmlFor="c-value">{discountType === 'percent' ? 'Discount %' : 'Discount ₦'}</label>
                  <input id="c-value" type="number" min="0" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label htmlFor="c-max">Total uses (optional)</label>
                  <input id="c-max" type="number" min="1" placeholder="Unlimited" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label htmlFor="c-buyer">Uses per customer</label>
                  <input id="c-buyer" type="number" min="1" value={perBuyer} onChange={(e) => setPerBuyer(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="c-exp">Expires (optional)</label>
              <input id="c-exp" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>

            <button onClick={handleCreate} disabled={createMutation.isPending} className="btn-primary btn-inline">
              <i className="fa-solid fa-plus"></i> Create Coupon
            </button>
          </div>
        </div>
      )}

      {editing && <EditCouponDrawer coupon={editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={!!toDelete}
        title="Deactivate this coupon?"
        message={`"${toDelete?.code}" will stop working at checkout. Orders that already used it keep their record.`}
        confirmLabel="Deactivate"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function EditCouponDrawer({ coupon, onClose }: { coupon: Coupon; onClose: () => void }) {
  const update = useUpdateCoupon();
  const [expiresAt, setExpiresAt] = useState(toLocalInput(coupon.expiresAt));
  const [noExpiry, setNoExpiry] = useState(!coupon.expiresAt);
  const [maxUses, setMaxUses] = useState(coupon.maxUses ? String(coupon.maxUses) : '');
  const [perBuyer, setPerBuyer] = useState(String(coupon.maxUsesPerBuyer));
  const [active, setActive] = useState(coupon.active);

  async function save() {
    const ok = await update.mutateAsync({
      id: coupon.id,
      input: {
        noExpiry,
        expiresAt: noExpiry ? null : toUtc(expiresAt),
        unlimitedUses: !maxUses,
        maxUses: maxUses ? Number(maxUses) : null,
        maxUsesPerBuyer: Number(perBuyer || '1'),
        active,
      },
    });
    if (ok) onClose();
  }

  return (
    <div className="admin-drawer-overlay" onClick={onClose}>
      <div className="admin-drawer" onClick={(e) => e.stopPropagation()} style={{ width: 'min(420px, 100vw)' }}>
        <div className="admin-drawer-hdr">
          <div><h3 style={{ fontSize: 16, fontWeight: 800 }}>Edit {coupon.code}</h3><p>Used {coupon.usedCount} times · created {timeAgo(coupon.createdAt)}</p></div>
          <button className="admin-drawer-close" aria-label="Close" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
        <div className="form-group">
          <label htmlFor="e-exp">Expiry date</label>
          <input id="e-exp" type="datetime-local" disabled={noExpiry} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, marginTop: 6 }}>
            <input type="checkbox" checked={noExpiry} onChange={(e) => setNoExpiry(e.target.checked)} /> Never expires
          </label>
        </div>
        <div className="form-group">
          <label htmlFor="e-max">Total uses (blank = unlimited)</label>
          <input id="e-max" type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="e-buyer">Uses per customer</label>
          <input id="e-buyer" type="number" min="1" value={perBuyer} onChange={(e) => setPerBuyer(e.target.value)} />
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, margin: '4px 0 14px' }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
        </label>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>The discount and who pays for it can't change after creation - create a new code instead.</p>
        <button className="btn-primary btn-inline" disabled={update.isPending} onClick={() => void save()}>Save changes</button>
      </div>
    </div>
  );
}
