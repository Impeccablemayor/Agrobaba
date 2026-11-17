import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { formatPrice } from '../../lib/format';
import { groupCartBySeller } from '../../lib/cart';
import { formatUnitQuantity } from '../../lib/units';
import { OptimizedImage } from '../../components/common/OptimizedImage';

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, total, loading, removeFromCart, updateQuantity, refreshCart } = useCart();
  const sellerGroups = groupCartBySeller(cart);
  const [checkingStock, setCheckingStock] = useState(true);

  // Stock and listing status can change after an item was added (sold out, archived, order rules
  // tightened). Re-read the cart on arrival so each line carries the server's current verdict.
  useEffect(() => {
    let active = true;
    void refreshCart().finally(() => { if (active) setCheckingStock(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per visit
  }, []);

  const issueCount = cart.filter((item) => item.issue).length;

  return (
    <div className="section">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item active">Cart</li>
          </ol>
        </nav>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Shopping Cart</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Review your items before checking out.</p>
        </div>

        {cart.length === 0 ? (
          loading ? null : (
          <div className="empty-cart">
            <i className="fa-solid fa-cart-shopping"></i>
            <p>Your cart is empty. Browse the shop and add some produce, inputs or equipment.</p>
            <Link to="/shop" className="btn-primary btn-inline btn-sm">
              <i className="fa-solid fa-store"></i> Browse Shop
            </Link>
          </div>
          )
        ) : (
          <div className="row g-4">
            <div className="col-lg-8">
              {sellerGroups.map((group) => {
                const groupTotal = group.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                return (
                  <div key={group.sellerId} style={{ marginBottom: 16, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                    {sellerGroups.length > 1 && (
                      <div style={{ padding: '10px 16px', background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                        <span><i className="fa-solid fa-store" style={{ color: 'var(--primary)' }}></i> Sold by {group.sellerName}</span>
                        <span>{formatPrice(groupTotal)}</span>
                      </div>
                    )}
                    <div style={{ overflowX: 'auto' }}>
                      <table className="cart-table" style={{ minWidth: 560 }}>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th className="num">Quantity</th>
                            <th className="num">Price</th>
                            <th className="num">Size</th>
                            <th></th>
                            <th className="num">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.items.map((item) => (
                            <tr key={item.id}>
                              <td>
                                <Link
                                  to={`/shop/product/${item.productId}`}
                                  style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'inherit', textDecoration: 'none' }}
                                >
                                  <div style={{ width: 48, height: 48, background: 'var(--bg-soft)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {item.image ? (
                                      <OptimizedImage
                                        src={item.image}
                                        targetWidth={96}
                                        targetHeight={96}
                                        crop="fill"
                                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }}
                                        alt={item.name}
                                      />
                                    ) : (
                                      <i className="fa-solid fa-box" style={{ color: 'var(--muted)' }}></i>
                                    )}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>1 item</div>
                                    {item.acceptedQuoteId && (
                                      <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700, marginTop: 2 }}>
                                        <i className="fa-solid fa-handshake"></i> Negotiated Price
                                      </div>
                                    )}
                                  </div>
                                </Link>
                                {item.issue && (
                                  <div role="alert" style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 700, marginTop: 6, maxWidth: 320 }}>
                                    <i className="fa-solid fa-triangle-exclamation"></i> {item.issue}
                                  </div>
                                )}
                              </td>
                              <td>
                                {item.acceptedQuoteId ? (
                                  // Negotiated Commerce roadmap - a locked quote's quantity is
                                  // part of the agreed deal; changing it here would invalidate the
                                  // negotiation, so it's shown read-only, not an editable spinner.
                                  <div style={{ fontWeight: 600, fontSize: 13 }}>{formatUnitQuantity(item.quantity, item.unit)}</div>
                                ) : (
                                  <>
                                    <input
                                      type="number"
                                      aria-label={`Quantity of ${item.name}`}
                                      // Bounded by live stock and the listing's order rules (was a hard
                                      // max of 99, which blocked bulk orders like 120 bags).
                                      min={item.minOrderQuantity || 1}
                                      max={Math.min(item.available ?? Number.MAX_SAFE_INTEGER, item.maxOrderQuantity ?? Number.MAX_SAFE_INTEGER)}
                                      step={item.incrementQuantity || 1}
                                      value={item.quantity}
                                      style={{ width: 76, padding: '4px 8px', border: `1.5px solid ${item.issue ? 'var(--danger)' : 'var(--border-mid)'}`, borderRadius: 6, fontSize: 13 }}
                                      onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                                    />
                                    {/* "1 item" (above) is the cart line/order-container - this caption is
                                        the physical quantity *inside* that one item, formatted with its
                                        unit (e.g. "20,000 pieces"), never a separate row per unit. */}
                                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{formatUnitQuantity(item.quantity, item.unit)}</div>
                                  </>
                                )}
                              </td>
                              <td>{formatPrice(item.price)}</td>
                              <td>{item.size || '—'}</td>
                              <td>
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16 }}
                                >
                                  <i className="fa-solid fa-trash"></i>
                                </button>
                              </td>
                              <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(item.price * item.quantity)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
              <Link to="/shop" className="cart-continue"><i className="fa-solid fa-arrow-left"></i> Continue shopping</Link>
            </div>

            <div className="col-lg-4">
              <div className="summary-card">
                <h3>Order Summary</h3>
                <div className="summary-row">
                  <span>Items ({cart.length})</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="summary-row">
                  <span>Delivery</span>
                  <span style={{ fontSize: 13 }}>Arranged at checkout</span>
                </div>
                <div className="summary-row total">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>

                {issueCount > 0 && (
                  <p role="status" style={{ fontSize: 12, color: 'var(--danger)', margin: '12px 0 0', fontWeight: 600 }}>
                    {issueCount === 1 ? '1 item needs' : `${issueCount} items need`} attention before checkout.
                  </p>
                )}
                <button
                  onClick={() => navigate('/checkout')}
                  disabled={checkingStock || issueCount > 0}
                  className="btn-primary btn-inline"
                  style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
                >
                  <i className={`fa-solid ${checkingStock ? 'fa-spinner fa-spin' : 'fa-lock'}`}></i>{' '}
                  {checkingStock ? 'Checking stock…' : issueCount > 0 ? 'Fix cart to continue' : 'Proceed to Checkout'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
