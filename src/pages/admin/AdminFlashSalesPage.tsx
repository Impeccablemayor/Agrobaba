import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getProducts } from '../../lib/products';
import { createFlashSale, deleteFlashSale, getAllFlashSalesAdmin } from '../../lib/flashSales';
import { showToast } from '../../lib/toastBus';
import { formatPrice, timeAgo } from '../../lib/format';
import { Breadcrumb } from '../../components/Breadcrumb';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import type { FlashSale, Product } from '../../types';

interface SelectedItem { productId: string; salePrice: string; }

export default function AdminFlashSalesPage() {
  const { user } = useAuth();
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
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

  async function handleCreate() {
    if (!title.trim()) {
      showToast('Please enter a title for the flash sale.', 'error');
      return;
    }
    if (!startAt || !endAt) {
      showToast('Please set both a start and end time.', 'error');
      return;
    }
    if (selected.length === 0) {
      showToast('Please select at least one product.', 'error');
      return;
    }
    if (selected.some((s) => !s.salePrice || Number(s.salePrice) <= 0)) {
      showToast('Please enter a valid sale price for every selected product.', 'error');
      return;
    }
    const result = await createFlashSale({
      title: title.trim(),
      startAt,
      endAt,
      items: selected.map((s) => ({ productId: s.productId, salePrice: Number(s.salePrice) })),
    });
    if (result) {
      setTitle(''); setStartAt(''); setEndAt(''); setSelected([]);
      void load();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Cancel this flash sale?')) return;
    if (await deleteFlashSale(id)) void load();
  }

  return (
    <div className="section">
      <div className="container">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'My Account', href: '/account' }, { label: 'Flash Sales' }]} />

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Flash Sales</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Create a time-boxed sale campaign — the discount reverts automatically when it ends.</p>
        </div>

        {loading ? (
          <PageLoadingSpinner message="Loading flash sales…" />
        ) : (
          <>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24, marginBottom: 28 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Create a Flash Sale</h3>

              <div className="row g-3">
                <div className="col-md-12">
                  <div className="form-group">
                    <label>Title</label>
                    <input type="text" placeholder="e.g. Weekend Flash Sale" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>
                </div>
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
              <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
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

              <button onClick={handleCreate} className="btn-primary btn-inline" style={{ marginTop: 16 }}>
                <i className="fa-solid fa-fire"></i> Launch Flash Sale
              </button>
            </div>

            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>All Campaigns</h3>
            {flashSales.length === 0 ? (
              <div className="empty-cart">
                <i className="fa-solid fa-fire"></i>
                <p>No flash sales created yet.</p>
              </div>
            ) : (
              flashSales.map((f) => (
                <div key={f.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong style={{ fontSize: 14 }}>{f.title}</strong>
                    <button onClick={() => handleDelete(f.id)} className="btn-danger btn-sm btn-inline">
                      <i className="fa-solid fa-trash"></i> Cancel
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                    {timeAgo(f.startAt)} — {timeAgo(f.endAt)} &middot; {f.items.length} product{f.items.length !== 1 ? 's' : ''}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {f.items.map((item) => (
                      <span key={item.id} style={{ fontSize: 11, background: 'var(--bg-soft)', padding: '4px 8px', borderRadius: 6 }}>
                        {item.productName}: {formatPrice(item.salePrice)} <del style={{ color: 'var(--muted)' }}>{formatPrice(item.originalPrice)}</del>
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
