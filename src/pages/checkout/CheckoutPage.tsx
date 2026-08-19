import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { placeOrder } from '../../lib/orders';
import { previewCoupon } from '../../lib/coupons';
import { showToast } from '../../lib/toastBus';
import { formatPrice } from '../../lib/format';
import { groupCartBySeller } from '../../lib/cart';
import type { Coupon } from '../../types';

export default function CheckoutPage() {
  const { user } = useAuth();
  const { cart, total } = useCart();
  const navigate = useNavigate();
  const orderPlaced = useRef(false);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.contact || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [note, setNote] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  useEffect(() => {
    if (cart.length === 0 && !orderPlaced.current) navigate('/cart', { replace: true });
  }, [cart.length, navigate]);

  if (cart.length === 0 && !orderPlaced.current) return null;

  const discountAmount = appliedCoupon
    ? appliedCoupon.discountType === 'percent'
      ? total * (appliedCoupon.discountValue / 100)
      : Math.min(appliedCoupon.discountValue, total)
    : 0;
  const finalTotal = total - discountAmount;
  const sellerGroups = groupCartBySeller(cart);

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    const coupon = await previewCoupon(couponInput.trim());
    setCheckingCoupon(false);
    if (coupon) {
      setAppliedCoupon(coupon);
      showToast(`Coupon "${coupon.code}" applied!`, 'success');
    }
  }

  async function handlePlaceOrder() {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      showToast('Please fill in your name, phone number and delivery address.', 'error');
      return;
    }
    const addr = [address.trim(), city.trim(), state.trim()].filter(Boolean).join(', ');
    const order = await placeOrder({ address: addr, phone: phone.trim(), couponCode: appliedCoupon?.code });
    if (order) {
      orderPlaced.current = true;
      showToast('Order placed! Complete payment to confirm.', 'success');
      navigate(`/pay-offline?orderId=${encodeURIComponent(order.id)}`);
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
                {sellerGroups.map((group) => (
                  <div key={group.sellerId} style={{ marginBottom: sellerGroups.length > 1 ? 10 : 0 }}>
                    {sellerGroups.length > 1 && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <i className="fa-solid fa-store" style={{ color: 'var(--primary)' }}></i> {group.sellerName}
                      </div>
                    )}
                    {group.items.map((item) => (
                      <div className="summary-line" key={item.id}>
                        <span className="nm">{item.name} <span style={{ color: 'var(--muted)' }}>&times;{item.quantity}</span></span>
                        <span>{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
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

              {appliedCoupon ? (
                <div className="summary-row" style={{ color: 'var(--primary)' }}>
                  <span>
                    <i className="fa-solid fa-tag"></i> {appliedCoupon.code}{' '}
                    <button
                      onClick={() => { setAppliedCoupon(null); setCouponInput(''); }}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 11, cursor: 'pointer', marginLeft: 4 }}
                    >
                      Remove
                    </button>
                  </span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
                  <input
                    type="text" placeholder="Coupon code" value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    style={{ flex: 1, border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', fontSize: 12 }}
                  />
                  <button onClick={handleApplyCoupon} disabled={checkingCoupon} className="btn-outline btn-sm btn-inline">
                    {checkingCoupon ? 'Checking…' : 'Apply'}
                  </button>
                </div>
              )}

              <div className="summary-row total">
                <span>Total</span>
                <span>{formatPrice(finalTotal)}</span>
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
