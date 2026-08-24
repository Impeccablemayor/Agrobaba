import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useMyProducts } from '../../hooks/queries/useProducts';
import { useDeleteProduct } from '../../hooks/mutations/useProductMutations';
import { formatPrice } from '../../lib/format';
import { CATEGORY_ICONS } from '../../lib/constants';
import { Breadcrumb } from '../../components/Breadcrumb';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import type { Role } from '../../types';

const LABELS: Record<Role, { title: string; sub: string; add: string; crumb: string }> = {
  farmer: { title: 'My Produce Listings', sub: 'Manage all the produce you have listed.', add: 'Post New Produce', crumb: 'My Listings' },
  'agro-dealer': { title: 'My Product Listings', sub: 'Manage all your agro inputs and products.', add: 'Post New Product', crumb: 'My Listings' },
  'service-provider': { title: 'My Services', sub: 'Manage all the services you offer.', add: 'Post New Service', crumb: 'My Services' },
  buyer: { title: 'My Listings', sub: 'You are registered as a buyer.', add: 'Switch to Selling', crumb: 'My Listings' },
  admin: { title: 'My Listings', sub: 'Admin accounts do not have listings.', add: 'Post New Listing', crumb: 'My Listings' },
};

export default function MyListingsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'all' | 'active' | 'discount'>('all');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: products = [], isLoading: loading } = useMyProducts();
  const deleteProductMutation = useDeleteProduct();

  if (!user) return null;
  const l = LABELS[user.role];

  if (user.role === 'buyer') {
    return (
      <div className="section">
        <div className="container">
          <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'My Account', href: '/account' }, { label: l.crumb }]} />
          <div className="empty-cart">
            <i className="fa-solid fa-box-open"></i>
            <p>As a buyer, you post demands instead of listings.</p>
            <Link to="/demands/new" className="btn-primary btn-inline btn-sm">
              <i className="fa-solid fa-pen"></i> Post a Demand Instead
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const allProducts = products;
  const active = allProducts.filter((p) => p.status === 'active').length;
  const discounted = allProducts.filter((p) => p.discount > 0).length;
  const totalSold = allProducts.reduce((s, p) => s + (p.sold || 0), 0);

  const stats = [
    { icon: 'fa-list', label: 'Total Listings', value: allProducts.length, color: 'var(--primary)' },
    { icon: 'fa-circle-check', label: 'Active', value: active, color: 'var(--success)' },
    { icon: 'fa-tag', label: 'On Discount', value: discounted, color: 'var(--accent)' },
    { icon: 'fa-fire', label: 'Total Sold', value: totalSold, color: 'var(--danger)' },
  ];

  let filteredProducts = allProducts;
  if (status === 'active') filteredProducts = filteredProducts.filter((p) => p.status === 'active');
  else if (status === 'discount') filteredProducts = filteredProducts.filter((p) => p.discount > 0);

  function handleDelete() {
    if (!pendingDelete) return;
    deleteProductMutation.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
    });
  }

  return (
    <div className="section">
      <div className="container">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'My Account', href: '/account' }, { label: l.crumb }]} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>{l.title}</h1>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>{l.sub}</p>
          </div>
          <Link to="/account/post-listing" className="btn-primary btn-inline">
            <i className="fa-solid fa-plus"></i> {l.add}
          </Link>
        </div>

        {loading ? (
          <PageLoadingSpinner message="Loading your listings…" />
        ) : (
          <>
          <div className="stats-grid" style={{ marginBottom: 28 }}>
          {stats.map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-icon"><i className={`fa-solid ${s.icon}`} style={{ color: s.color }}></i></div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
          </div>

          <div className="shop-tabs">
            {(['all', 'active', 'discount'] as const).map((s) => (
              <button key={s} className={`shop-tab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>
                {s === 'all' ? 'All Listings' : s === 'active' ? 'Active' : 'On Discount'}
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-cart">
              <i className="fa-solid fa-box-open"></i>
              <p>{status === 'all' ? "You haven't posted any listings yet." : `No ${status === 'discount' ? 'discounted' : status} listings found.`}</p>
              {status === 'all' && (
                <Link to="/account/post-listing" className="btn-primary btn-inline btn-sm">
                  <i className="fa-solid fa-plus"></i> Post Your First Listing
                </Link>
              )}
            </div>
          ) : (
            <div className="grid-4">
              {filteredProducts.map((p) => {
                const icon = CATEGORY_ICONS[p.category] || CATEGORY_ICONS.default;
                return (
                  <div className="card" key={p.id}>
                    <div className="card-img">
                      {p.discount > 0 && <div className="disc-tag">{p.discount}% OFF</div>}
                      {p.image ? (
                        <img src={p.image} alt={p.name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div className="card-img-inner">
                          <i className={`fa-solid ${icon}`}></i>
                          <span className="cat-label">{p.category}</span>
                        </div>
                      )}
                    </div>
                    <div className="card-body">
                      <div className="card-name">{p.name}</div>
                      <div className="card-price">{p.negotiated ? 'Negotiable' : formatPrice(p.price ?? 0)}</div>
                      <div className="card-seller" style={{ marginTop: 8 }}>
                        <i className="fa-solid fa-box"></i> {p.quantity} {p.unit} &middot; {p.sold || 0} sold
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                        <Link
                          to={p.type === 'service' ? `/shop/service/${p.id}` : `/shop/product/${p.id}`}
                          className="btn-outline btn-sm btn-inline" style={{ flex: 1, padding: 6, textAlign: 'center' }}
                        >
                          <i className="fa-solid fa-eye"></i> View
                        </Link>
                        <button onClick={() => setPendingDelete({ id: p.id, name: p.name })} className="btn-danger btn-sm btn-inline" style={{ flex: 1, padding: 6, width: 'auto' }}>
                          <i className="fa-solid fa-trash"></i> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete this listing?"
        message={`"${pendingDelete?.name}" will be permanently removed from the marketplace. This cannot be undone.`}
        confirmLabel="Delete Listing"
        destructive
        busy={deleteProductMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
