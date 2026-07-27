import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getProductById, getProducts } from '../../lib/products';
import { useCart } from '../../contexts/CartContext';
import { isLoggedIn } from '../../lib/auth';
import { showToast } from '../../lib/toastBus';
import { formatPrice, starString } from '../../lib/format';
import { ProductCard } from '../../components/ProductCard';
import type { Product } from '../../types';
import { Breadcrumb } from '../../components/Breadcrumb';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';

const TYPE_LABELS: Record<string, string> = { produce: 'Fresh Produce', product: 'Agro Input', service: 'Service' };

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState('Standard');
  const [tab, setTab] = useState<'description' | 'specs' | 'reviews'>('description');
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      if (!id) {
        if (active) setProduct(null);
        if (active) setRelated([]);
        if (active) setLoading(false);
        return;
      }

      setLoading(true);
      const data = await getProductById(id);
      if (!active) return;
      setProduct(data);

      if (data) {
        const items = (await getProducts({ category: data.category })).filter((item) => item.id !== data.id).slice(0, 6);
        setRelated(items);
      } else {
        setRelated([]);
      }
      setLoading(false);
    }

    void loadProduct();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <PageLoadingSpinner message="Loading product details…" />;
  }

  if (!product) {
    return (
      <div className="section"><div className="container">
        <div className="empty-cart" style={{ gridColumn: '1/-1' }}>
          <i className="fa-solid fa-box-open"></i>
          <p>Product not found.</p>
          <Link to="/shop" className="btn-secondary btn-inline btn-sm">Back to Shop</Link>
        </div>
      </div></div>
    );
  }

  const oldPrice = product.discount > 0 ? Math.round(product.price / (1 - product.discount / 100)) : null;

  function handleAddToCart(e: FormEvent) {
    e.preventDefault();
    addToCart(product!, quantity, size);
  }

  function handleMessageSeller() {
    if (!isLoggedIn()) {
      showToast('Please login to message the seller.', 'warning');
      navigate('/login');
      return;
    }
    navigate(`/messages/${product!.sellerId}?partnerName=${encodeURIComponent(product!.sellerName)}&productId=${product!.id}&productName=${encodeURIComponent(product!.name)}`);
  }

  return (
    <div className="section">
      <div className="container">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }, { label: product.name.length > 40 ? product.name.substring(0, 40) + '...' : product.name }]} />

        <div className="product-detail-layout">
          <div className="product-detail-images">
            <div style={{ background: 'var(--bg-soft)', borderRadius: 'var(--radius)', minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow)' }}>
              {product.image ? (
                <img src={product.image} alt={product.name} style={{ width: '100%', borderRadius: 'var(--radius)', objectFit: 'cover', maxHeight: 400 }} />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <i className="fa-solid fa-box" style={{ fontSize: 64, color: '#d1d5db' }}></i>
                  <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 12 }}>No image available</p>
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginTop: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
                About the Seller
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="fa-solid fa-user" style={{ color: 'var(--primary)', fontSize: 20 }}></i>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{product.sellerName}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>{product.sellerRole}</div>
                </div>
                {product.verified && (
                  <span style={{ marginLeft: 'auto' }} className="verified-chip">
                    <i className="fa-solid fa-circle-check"></i> Verified
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleMessageSeller} className="btn-secondary btn-sm btn-inline" style={{ flex: 1 }}>
                  <i className="fa-regular fa-comments"></i> Message Seller
                </button>
                <Link to="/shop" className="btn-outline btn-sm btn-inline" style={{ flex: 1, textAlign: 'center' }}>
                  <i className="fa-solid fa-store"></i> View Shop
                </Link>
              </div>
            </div>
          </div>

          <div className="product-detail-info">
            <div>
              <span className="product-category">{product.category}</span>
              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'var(--accent-light)', color: 'var(--accent-dark)' }}>
                {TYPE_LABELS[product.type] || 'Listing'}
              </span>
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.25, color: 'var(--text)' }}>{product.name}</h1>

            <div className="product-meta">
              <span style={{ color: 'var(--accent)' }}>{starString(product.rating)}</span>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>({product.reviews || 0} reviews)</span>
              <span style={{ color: 'var(--muted)' }}>&middot;</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{product.sold || 0} sold</span>
              <span style={{ color: 'var(--muted)' }}>&middot;</span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                <i className="fa-solid fa-location-dot" style={{ color: 'var(--primary)' }}></i> {product.location || 'Nigeria'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div className="price">{formatPrice(product.price)}</div>
              {oldPrice && (
                <>
                  <div style={{ fontSize: 14, color: 'var(--muted)', textDecoration: 'line-through' }}>{formatPrice(oldPrice)}</div>
                  <div style={{ background: 'var(--danger)', color: 'white', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>
                    {product.discount}% OFF
                  </div>
                </>
              )}
            </div>

            <div className="stock-info">
              <i className="fa-solid fa-circle-check"></i>
              <span>{product.quantity > 0 ? `In Stock (${product.quantity} ${product.unit || 'units'} available)` : 'Out of Stock'}</span>
            </div>

            <div className="description">{product.description}</div>

            <form onSubmit={handleAddToCart}>
              <div className="qty-size-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Quantity</label>
                  <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} style={{ padding: '10px 12px' }}>
                    {[1, 2, 3, 4, 5, 10, 20, 50].map((q) => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Size / Package</label>
                  <select value={size} onChange={(e) => setSize(e.target.value)} style={{ padding: '10px 12px' }}>
                    {['Standard', 'Small', 'Medium', 'Large', 'Extra Large'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  <i className="fa-solid fa-cart-plus"></i> Add to Cart
                </button>
                <Link to="/cart" className="btn-outline btn-inline" style={{ padding: '11px 16px' }}>
                  <i className="fa-solid fa-cart-shopping"></i>
                </Link>
              </div>
            </form>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: 14, background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                <i className="fa-solid fa-shield-halved" style={{ color: 'var(--primary)' }}></i> Escrow Protected
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                <i className="fa-solid fa-rotate-left" style={{ color: 'var(--primary)' }}></i> Returns Policy
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                <i className="fa-solid fa-truck" style={{ color: 'var(--primary)' }}></i> Delivery Available
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 32, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
            {(['description', 'specs', 'reviews'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '14px 24px', fontSize: 13, fontWeight: tab === t ? 700 : 600,
                  color: tab === t ? 'var(--primary)' : 'var(--muted)', background: 'none', border: 'none',
                  borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {t === 'description' ? 'Description' : t === 'specs' ? 'Specifications' : 'Reviews'}
              </button>
            ))}
          </div>
          <div style={{ padding: 24 }}>
            {tab === 'description' && (
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 14 }}>{product.description}</p>
            )}
            {tab === 'specs' && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  {[
                    ['Category', product.category],
                    ['Type', TYPE_LABELS[product.type] || 'Agro Input'],
                    ['Size / Package', product.size || 'Standard'],
                    ['Unit', product.unit || '—'],
                    ['Location', product.location || '—'],
                    ['Seller', product.sellerName],
                    ['Verified Seller', product.verified ? 'Yes ✓' : 'Not yet'],
                    ['Rating', `${product.rating || 0}/5 (${product.reviews || 0} reviews)`],
                  ].map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 0', fontWeight: 600, color: 'var(--muted)', width: '40%', fontSize: 12 }}>{k}</td>
                      <td style={{ padding: '10px 0', color: 'var(--text)', fontSize: 13 }}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === 'reviews' && (
              <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>
                No reviews yet. Be the first to purchase and review this product!
              </p>
            )}
          </div>
        </div>

        <div style={{ marginTop: 40 }}>
          <div className="section-hdr">
            <h2><i className="fa-solid fa-grid-2" style={{ color: 'var(--primary)' }}></i> You May Also Like</h2>
            <Link to="/shop" className="see-all">See all <i className="fa-solid fa-chevron-right"></i></Link>
          </div>
          <div className="scroll-row">
            {related.length === 0 ? (
              <p style={{ color: 'var(--muted)', padding: 16 }}>No related products found.</p>
            ) : (
              related.map((p) => <ProductCard key={p.id} product={p} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
