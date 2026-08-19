import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { formatPrice } from '../../lib/format';
import { groupCartBySeller } from '../../lib/cart';
import { formatUnitQuantity } from '../../lib/units';

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, total, removeFromCart, updateQuantity } = useCart();
  const sellerGroups = groupCartBySeller(cart);

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
          <div className="empty-cart">
            <i className="fa-solid fa-cart-shopping"></i>
            <p>Your cart is empty. Browse the shop and add some produce, inputs or equipment.</p>
            <Link to="/shop" className="btn-primary btn-inline btn-sm">
              <i className="fa-solid fa-store"></i> Browse Shop
            </Link>
          </div>
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
                                      <img src={item.image} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} alt="" />
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
                                      type="number" min={1} max={99} value={item.quantity}
                                      style={{ width: 60, padding: '4px 8px', border: '1.5px solid var(--border-mid)', borderRadius: 6, fontSize: 13 }}
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

                <button onClick={() => navigate('/checkout')} className="btn-primary btn-inline" style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}>
                  <i className="fa-solid fa-lock"></i> Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
