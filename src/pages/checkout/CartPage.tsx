import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { formatPrice } from '../../lib/format';

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, total, removeFromCart, updateQuantity } = useCart();

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
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflowX: 'auto' }}>
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
                    {cart.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 48, height: 48, background: 'var(--bg-soft)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {item.image ? (
                                <img src={item.image} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} alt="" />
                              ) : (
                                <i className="fa-solid fa-box" style={{ color: 'var(--muted)' }}></i>
                              )}
                            </div>
                            <span style={{ fontWeight: 500 }}>{item.name}</span>
                          </div>
                        </td>
                        <td>
                          <input
                            type="number" min={1} max={99} value={item.quantity}
                            style={{ width: 60, padding: '4px 8px', border: '1.5px solid var(--border-mid)', borderRadius: 6, fontSize: 13 }}
                            onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                          />
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
