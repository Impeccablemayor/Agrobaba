import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getProducts } from '../../lib/products';
import { createFlashSale, deleteFlashSale, getAllFlashSalesAdmin } from '../../lib/flashSales';
import { showToast } from '../../lib/toastBus';
import { formatDate, formatPrice, timeAgo } from '../../lib/format';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ActionMenu } from '../../components/ActionMenu';
import type { FlashSale, Product } from '../../types';

interface SelectedItem { productId: string; salePrice: string; }

type Phase = 'upcoming' | 'active' | 'ended';

function phaseOf(f: FlashSale): Phase {
  const now = Date.now();
  if (new Date(f.startAt).getTime() > now) return 'upcoming';
  if (new Date(f.endAt).getTime() < now) return 'ended';
  return 'active';
}

const PHASE_CHIP: Record<Phase, string> = { upcoming: 'chip-info', active: 'chip-success', ended: 'chip-neutral' };

export default function AdminFlashSalesPage() {
  const { user } = useAuth();
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<FlashSale | null>(null);
  const [toDelete, setToDelete] = useState<FlashSale | null>(null);
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<Phase | 'all'>('all');

  const [title, setTitle] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [selected, setSelected] = useState<SelectedItem[]>([]);

  async function load() {
    setLoading(true);
    const [sales, allProducts] = await Promise.all([getAllFlashSalesAdmin(), getProducts()]);
    setFlashSales(sales);
    setProducts(allProducts);
    setLoading(false);
  }

  useEffect(() => {
    if (user?.role === 'admin') void load();
  }, [user]);

  if (!user) return null;
  if (user.role !== 'admin') return <Navigate to="/account" replace />;

  function toggleProduct(productId: string) {
    setSelected((prev) => {
      const exists = prev.find((s) => s.productId === productId);
      if (exists) return prev.filter((s) => s.productId !== productId);
      const product = products.find((p) => p.id === productId);
      return [...prev, { productId, salePrice: product ? String(Math.round(product.price * 0.8)) : '' }];
    });
  }

  function updateSalePrice(productId: string, salePrice: string) {
    setSelected((prev) => prev.map((s) => (s.productId === productId ? { ...s, salePrice } : s)));
  }

  function resetForm() {
    setTitle(''); setStartAt(''); setEndAt(''); setSelected([]);
  }

  async function handleCreate() {
    if (!title.trim()) { showToast('Please enter a title for the flash sale.', 'error'); return; }
    if (!startAt || !endAt) { showToast('Please set both a start and end time.', 'error'); return; }
    if (selected.length === 0) { showToast('Please select at least one product.', 'error'); return; }
    if (selected.some((s) => !s.salePrice || Number(s.salePrice) <= 0)) {
      showToast('Please enter a valid sale price for every selected product.', 'error');
      return;
    }
    const result = await createFlashSale({
      title: title.trim(), startAt, endAt,
      items: selected.map((s) => ({ productId: s.productId, salePrice: Number(s.salePrice) })),
    });
    if (result) {
      resetForm();
      setCreateOpen(false);
      void load();
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    if (await deleteFlashSale(toDelete.id)) { setToDelete(null); setDetail(null); void load(); }
  }

  const filtered = useMemo(() => {
    return flashSales.filter((f) => {
      if (phaseFilter !== 'all' && phaseOf(f) !== phaseFilter) return false;
      if (search.trim() && !f.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [flashSales, phaseFilter, search]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Flash Sales</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Time-boxed sale campaigns — the discount reverts automatically when they end.</p>
        </div>
        <button className="btn-primary btn-inline" onClick={() => setCreateOpen(true)}>
          <i className="fa-solid fa-plus"></i> New Flash Sale
        </button>
      </div>

      {loading ? (
        <PageLoadingSpinner message="Loading flash sales…" />
      ) : (
        <>
          <div className="admin-filters-row">
            <input type="text" placeholder="Search by title…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 220 }} />
            <select value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value as Phase | 'all')}>
              <option value="all">All statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-cart">
              <i className="fa-solid fa-fire"></i>
              <p>No flash sales match this view.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Title</th><th>Products</th><th>Starts</th><th>Ends</th><th>Status</th><th>Created</th><th></th></tr>
                </thead>
                <tbody>
                  {filtered.map((f) => {
                    const phase = phaseOf(f);
                    return (
                      <tr key={f.id} onClick={() => setDetail(f)}>
                        <td style={{ fontWeight: 700 }}>{f.title}</td>
                        <td>{f.items.length}</td>
                        <td>{formatDate(f.startAt)}</td>
                        <td>{formatDate(f.endAt)}</td>
                        <td><span className={`chip ${PHASE_CHIP[phase]}`}>{phase}</span></td>
                        <td style={{ color: 'var(--muted)' }}>{timeAgo(f.createdAt)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <ActionMenu items={[
                            { label: 'View details', icon: 'fa-eye', onClick: () => setDetail(f) },
                            { label: 'Cancel campaign', icon: 'fa-trash', danger: true, onClick: () => setToDelete(f) },
                          ]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {detail && (
        <div className="admin-drawer-overlay" onClick={() => setDetail(null)}>
          <div className="admin-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-hdr">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800 }}>{detail.title}</h3>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>Created {timeAgo(detail.createdAt)}</p>
              </div>
              <button className="admin-drawer-close" onClick={() => setDetail(null)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="admin-drawer-section">
              <h4>Window</h4>
              <p style={{ fontSize: 12.5 }}>{formatDate(detail.startAt)} &rarr; {formatDate(detail.endAt)}</p>
              <span className={`chip ${PHASE_CHIP[phaseOf(detail)]}`}>{phaseOf(detail)}</span>
            </div>
            <div className="admin-drawer-section">
              <h4>Products ({detail.items.length})</h4>
              {detail.items.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 8 }}>
                  <span>{item.productName}</span>
                  <span>{formatPrice(item.salePrice)} <del style={{ color: 'var(--muted)' }}>{formatPrice(item.originalPrice)}</del></span>
                </div>
              ))}
            </div>
            <div className="admin-drawer-section">
              <button className="btn-danger btn-inline btn-sm" onClick={() => setToDelete(detail)}>
                <i className="fa-solid fa-trash"></i> Cancel campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="admin-drawer-overlay" onClick={() => setCreateOpen(false)}>
          <div className="admin-drawer" onClick={(e) => e.stopPropagation()} style={{ width: 'min(480px, 100vw)' }}>
            <div className="admin-drawer-hdr">
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>New Flash Sale</h3>
              <button className="admin-drawer-close" onClick={() => setCreateOpen(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>

            <div className="form-group">
              <label>Title</label>
              <input type="text" placeholder="e.g. Weekend Flash Sale" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-group">
                  <label>Starts</label>
                  <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label>Ends</label>
                  <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
                </div>
              </div>
            </div>

            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13 }}>Select products &amp; set sale price</label>
            <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
              {products.map((p) => {
                const sel = selected.find((s) => s.productId === p.id);
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                    <input type="checkbox" checked={!!sel} onChange={() => toggleProduct(p.id)} />
                    <span style={{ flex: 1, fontSize: 12 }}>{p.name} <span style={{ color: 'var(--muted)' }}>({formatPrice(p.price)})</span></span>
                    {sel && (
                      <input
                        type="number" min="0" placeholder="Sale price" value={sel.salePrice}
                        onChange={(e) => updateSalePrice(p.id, e.target.value)}
                        style={{ width: 110, border: '1.5px solid var(--border-mid)', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <button onClick={handleCreate} className="btn-primary btn-inline">
              <i className="fa-solid fa-fire"></i> Launch Flash Sale
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Cancel this flash sale?"
        message={`"${toDelete?.title}" will be removed immediately and its discount reverted.`}
        confirmLabel="Cancel campaign"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
