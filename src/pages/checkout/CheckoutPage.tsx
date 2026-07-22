import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { placeOrder } from '../../lib/orders';
import { showToast } from '../../lib/toastBus';
import { formatPrice } from '../../lib/format';

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart, total, refresh } = useCart();
  const navigate = useNavigate();
  const orderPlaced = useRef(false);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.contact || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (cart.length === 0 && !orderPlaced.current) navigate('/cart', { replace: true });
  }, [cart.length, navigate]);

  if (cart.length === 0 && !orderPlaced.current) return null;

  async function handlePlaceOrder() {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      showToast('Please fill in your name, phone number and delivery address.', 'error');
      return;
    }
    void city;
    void state;
    void note;

    const order = await placeOrder({ address: address.trim(), phone: phone.trim() });
    if (order) {
      orderPlaced.current = true;
      showToast('Order placed! Complete payment to confirm.', 'success');
      navigate(`/pay-offline?orderId=${encodeURIComponent(order.id)}`);
      refresh();
    }
  }

  return (
    <div className="section">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/cart">Cart</Link></li>
            <li className="breadcrumb-item active">Checkout</li>
          </ol>
        </nav>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Checkout</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Enter your delivery details to place the order.</p>
        </div>

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="checkout-card">
              <h3><i className="fa-solid fa-truck-fast"></i> Delivery Details</h3>

              <div className="row">
                <div className="col-md-6">
                  <div className="field">
                    <label>Full Name <span className="req">*</span></label>
                    <input type="text" placeholder="e.g. Adewale Johnson" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="field">
                    <label>Phone Number <span className="req">*</span></label>
                    <input type="tel" placeholder="e.g. 08012345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="field">
                <label>Delivery Address <span className="req">*</span></label>
                <textarea placeholder="House number, street, landmark..." value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>

              <div className="row">
                <div className="col-md-6">
                  <div className="field">
                    <label>City / Town</label>
                    <input type="text" placeholder="e.g. Ibadan" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="field">
                    <label>State</label>
                    <input type="text" placeholder="e.g. Oyo State" value={state} onChange={(e) => setState(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label>Delivery Note <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea placeholder="Any special instructions for the seller or dispatch rider..." value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="summary-card">
              <h3>Order Summary</h3>
              <div className="summary-items">
                {cart.map((item) => (
                  <div className="summary-line" key={item.id}>
                    <span className="nm">{item.name} <span style={{ color: 'var(--muted)' }}>&times;{item.quantity}</span></span>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="summary-row">
                <span>Delivery</span>
                <span style={{ fontSize: 13 }}>Arranged with seller</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>

              <button onClick={handlePlaceOrder} className="btn-primary btn-inline" style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}>
                <i className="fa-solid fa-lock"></i> Place Order
              </button>
              <p className="pay-note"><i className="fa-solid fa-shield-halved"></i> Payment via secure bank transfer (mock escrow)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
