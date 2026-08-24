import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useProduct, useProducts } from '../../hooks/queries/useProducts';
import { getProductReviews } from '../../lib/reviews';
import { useCart } from '../../contexts/CartContext';
import { isLoggedIn } from '../../lib/auth';
import { showToast } from '../../lib/toastBus';
import { formatDate, formatPrice, starString } from '../../lib/format';
import { formatUnitQuantity, resolveUnitPrice } from '../../lib/units';
import { requestQuote } from '../../lib/quotes';
import { ProductCard } from '../../components/ProductCard';
import type { Review } from '../../types';
import { Breadcrumb } from '../../components/Breadcrumb';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';

const TYPE_LABELS: Record<string, string> = { produce: 'Fresh Produce', product: 'Agro Input', service: 'Service' };

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState('Standard');
  const [buyerNotes, setBuyerNotes] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [tab, setTab] = useState<'description' | 'specs' | 'reviews'>('description');
  const [reviews, setReviews] = useState<Review[]>([]);

  const { data: product, isLoading: loading } = useProduct(id);
  const { data: categoryProducts = [] } = useProducts({ category: product?.category });

  const related = categoryProducts.filter((item) => item.id !== product?.id).slice(0, 6);

  useEffect(() => {
    if (product?.minOrderQuantity) setQuantity(product.minOrderQuantity);
  }, [product?.minOrderQuantity]);

  useEffect(() => {
    let active = true;
    if (!id) { setReviews([]); return; }
    void (async () => {
      const data = await getProductReviews(id);
      if (active) setReviews(data);
    })();
    return () => { active = false; };
  }, [id]);

  if (loading && !product) {
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

  if (product.type === 'service') {
    return <Navigate to={`/shop/service/${product.id}`} replace />;
  }

  const oldPrice = product.price != null && product.discount > 0 ? Math.round(product.price / (1 - product.discount / 100)) : null;

  function handleAddToCart(e: FormEvent) {
    e.preventDefault();
    const p = product!;
    if (quantity < 1) {
      showToast('Quantity must be at least 1.', 'error');
      return;
    }
    if (p.minOrderQuantity && quantity < p.minOrderQuantity) {
      showToast(`Minimum order for "${p.name}" is ${formatUnitQuantity(p.minOrderQuantity, p.unitType)}.`, 'error');
      return;
    }
    if (p.maxOrderQuantity && quantity > p.maxOrderQuantity) {
      showToast(`Maximum order for "${p.name}" is ${formatUnitQuantity(p.maxOrderQuantity, p.unitType)}.`, 'error');
      return;
    }
    if (quantity > p.quantity) {
      showToast(`Only ${formatUnitQuantity(p.quantity, p.unitType)} of "${p.name}" available.`, 'error');
      return;
    }
    if (p.incrementQuantity) {
      const effectiveMin = p.minOrderQuantity || 0;
      if ((quantity - effectiveMin) % p.incrementQuantity !== 0) {
        showToast(`Orders for "${p.name}" must be in steps of ${p.incrementQuantity} from the minimum.`, 'error');
        return;
      }
    }
    addToCart(p, quantity, size);
  }

  function handleRequestQuote(e: FormEvent) {
    e.preventDefault();
    if (!isLoggedIn()) {
      showToast('Please login to request a quote.', 'warning');
      navigate('/login');
      return;
    }
    const p = product!;
    void (async () => {
      const result = await requestQuote({
        productId: p.id,
        requestedQuantity: quantity || null,
        buyerNotes,
        deliveryLocation,
      });
      if (result) navigate(`/account/quotes/${result.id}`);
    })();
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
                <img src={product.image} alt={product.name} loading="eager" decoding="async" style={{ width: '100%', borderRadius: 'var(--radius)', objectFit: 'cover', maxHeight: 400 }} />
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

            {product.negotiated ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <div className="price" style={{ fontSize: 18 }}>
                  {product.price != null ? `From ${formatPrice(product.price)} (negotiable)` : 'Price: To be negotiated'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <div className="price">{formatPrice(product.price ?? 0)}</div>
                {oldPrice && (
                  <>
                    <div style={{ fontSize: 14, color: 'var(--muted)', textDecoration: 'line-through' }}>{formatPrice(oldPrice)}</div>
                    <div style={{ background: 'var(--danger)', color: 'white', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>
                      {product.discount}% OFF
                    </div>
                  </>
                )}
              </div>
            )}

            {product.priceTiers && product.priceTiers.length > 0 && (
              <div style={{ padding: 12, background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  <i className="fa-solid fa-layer-group"></i> Bulk Pricing
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                    <span>1 – {product.priceTiers[0].minQuantity - 1} {product.unit || 'units'}</span>
                    <span>{formatPrice(product.price ?? 0)} / unit</span>
                  </div>
                  {product.priceTiers.map((tier, i) => {
                    const next = product.priceTiers![i + 1];
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{formatUnitQuantity(tier.minQuantity, product.unitType)}{next ? ` – ${next.minQuantity - 1}` : '+'}</span>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(tier.pricePerUnit)} / unit</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="stock-info">
              <i className="fa-solid fa-circle-check"></i>
              <span>{product.quantity > 0 ? `In Stock (${product.quantity} ${product.unit || 'units'} available)` : 'Out of Stock'}</span>
            </div>

            <div className="description">{product.description}</div>

            {product.negotiated ? (
              <form onSubmit={handleRequestQuote}>
                <div className="form-group">
                  <label>Desired Quantity <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input
                    type="number" min="1" placeholder="e.g. 20000"
                    value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}
                    style={{ padding: '10px 12px' }}
                  />
                </div>
                <div className="form-group">
                  <label>Delivery Location <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input
                    type="text" placeholder="Where should this be delivered?"
                    value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)}
                    style={{ padding: '10px 12px' }}
                  />
                </div>
                <div className="form-group">
                  <label>Notes for the Seller</label>
                  <textarea
                    rows={3} placeholder="Tell the seller what you need — quantity, timing, specifications..."
                    value={buyerNotes} onChange={(e) => setBuyerNotes(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                    <i className="fa-solid fa-comments-dollar"></i> Request Quote
                  </button>
                  <Link to="/account/quotes" className="btn-outline btn-inline" style={{ padding: '11px 16px' }}>
                    <i className="fa-solid fa-file-invoice-dollar"></i>
                  </Link>
                </div>
              </form>
            ) : (
            <form onSubmit={handleAddToCart} noValidate>
              <div className="qty-size-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    min={product.minOrderQuantity || 1}
                    max={product.maxOrderQuantity || product.quantity || undefined}
                    step={product.incrementQuantity || 1}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    style={{ padding: '10px 12px' }}
                  />
                  {(product.minOrderQuantity || product.incrementQuantity) && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      {product.minOrderQuantity ? `Minimum order: ${formatUnitQuantity(product.minOrderQuantity, product.unitType)}` : ''}
                      {product.minOrderQuantity && product.incrementQuantity ? ' · ' : ''}
                      {product.incrementQuantity ? `In steps of ${product.incrementQuantity}` : ''}
                    </div>
                  )}
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Size / Package</label>
                  <select value={size} onChange={(e) => setSize(e.target.value)} style={{ padding: '10px 12px' }}>
                    {['Standard', 'Small', 'Medium', 'Large', 'Extra Large'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {product.priceTiers && product.priceTiers.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 12, padding: '8px 0' }}>
                  <span style={{ color: 'var(--muted)' }}>{formatPrice(resolveUnitPrice(product, quantity))} / unit at this quantity</span>
                  <span style={{ fontWeight: 800 }}>{formatPrice(resolveUnitPrice(product, quantity) * quantity)}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  <i className="fa-solid fa-cart-plus"></i> Add to Cart
                </button>
                <Link to="/cart" className="btn-outline btn-inline" style={{ padding: '11px 16px' }}>
                  <i className="fa-solid fa-cart-shopping"></i>
                </Link>
              </div>
            </form>
            )}

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
              reviews.length === 0 ? (
                <p style={{ color: 'var(--muted)', textAlign: 'center', padding: 24 }}>
                  No reviews yet. Be the first to purchase and review this product!
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {reviews.map((r) => (
                    <div key={r.id} style={{ paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{r.reviewerHandle}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDate(r.createdAt)}</span>
                      </div>
                      <div style={{ color: 'var(--accent)', fontSize: 13, marginBottom: r.comment ? 6 : 0 }}>{starString(r.rating)}</div>
                      {r.comment && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )
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
