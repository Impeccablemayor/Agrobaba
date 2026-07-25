import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { deleteProduct, getMyProducts } from '../../lib/products';
import { formatPrice } from '../../lib/format';
import type { Role } from '../../types';

const LABELS: Record<Role, { title: string; sub: string; add: string; crumb: string }> = {
  farmer: { title: 'My Produce Listings', sub: 'Manage all the produce you have listed.', add: 'Post New Produce', crumb: 'My Listings' },
  'agro-dealer': { title: 'My Product Listings', sub: 'Manage all your agro inputs and products.', add: 'Post New Product', crumb: 'My Listings' },
  'service-provider': { title: 'My Services', sub: 'Manage all the services you offer.', add: 'Post New Service', crumb: 'My Services' },
  buyer: { title: 'My Listings', sub: 'You are registered as a buyer.', add: 'Switch to Selling', crumb: 'My Listings' },
  admin: { title: 'My Listings', sub: 'Admin accounts do not have listings.', add: 'Post New Listing', crumb: 'My Listings' },
};

const CATEGORY_ICONS: Record<string, string> = {
  Vegetables: 'fa-apple-whole', Grains: 'fa-wheat-awn', Tubers: 'fa-leaf',
  Fish: 'fa-fish', Poultry: 'fa-egg', Fertilizers: 'fa-flask',
  Pesticides: 'fa-spray-can-sparkles', Irrigation: 'fa-droplet',
  'Animal Feed': 'fa-bone', 'Equipment Hire': 'fa-tractor',
  Veterinary: 'fa-stethoscope', Consultancy: 'fa-user-tie', default: 'fa-box',
};

export default function MyListingsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'all' | 'active' | 'discount'>('all');
  const [, setTick] = useState(0);
  const [products, setProducts] = useState<Awaited<ReturnType<typeof getMyProducts>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      if (!user) return;
      setLoading(true);
      const data = await getMyProducts();
      if (active) {
        setProducts(data);
        setLoading(false);
      }
    }

    void loadProducts();
    return () => { active = false; };
  }, [user]);

  if (!user) return null;
  const l = LABELS[user.role];

  if (user.role === 'buyer') {
    return (
      <div className="section">
        <div className="container">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><Link to="/">Home</Link></li>
              <li className="breadcrumb-item"><Link to="/account">My Account</Link></li>
              <li className="breadcrumb-item active">{l.crumb}</li>
            </ol>
          </nav>
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

  function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this listing? This cannot be undone.')) {
      deleteProduct(id);
      setTick((t) => t + 1);
    }
  }

  return (
    <div className="section">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/account">My Account</Link></li>
            <li className="breadcrumb-item active">{l.crumb}</li>
          </ol>
        </nav>

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
          <div className="empty-cart" style={{ marginBottom: 28 }}>
            <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }}></i>
            <p>Loading your listings…</p>
          </div>
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
                        <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div className="card-img-inner">
                          <i className={`fa-solid ${icon}`}></i>
                          <span className="cat-label">{p.category}</span>
                        </div>
                      )}
                    </div>
                    <div className="card-body">
                      <div className="card-name">{p.name}</div>
                      <div className="card-price">{formatPrice(p.price)}</div>
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
                        <button onClick={() => handleDelete(p.id)} className="btn-danger btn-sm btn-inline" style={{ flex: 1, padding: 6, width: 'auto' }}>
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
    </div>
  );
}
