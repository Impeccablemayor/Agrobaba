import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { placeOrder } from '../../lib/orders';
import { previewCoupon } from '../../lib/coupons';
import { getProductById } from '../../lib/products';
import { resolveUnitPrice } from '../../lib/units';
import { showToast } from '../../lib/toastBus';
import { formatPrice } from '../../lib/format';
import { groupCartBySeller } from '../../lib/cart';
import type { Coupon } from '../../types';

export default function CheckoutPage() {
  const { user, phase, renewSession } = useAuth();
  const { cart, total } = useCart();
  const navigate = useNavigate();
  const orderPlaced = useRef(false);
  // Latest phase for the async submit handler (the closure must not read a stale phase after an
  // awaited renewSession()).
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const isLive = () => phaseRef.current === 'live';

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.contact || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [note, setNote] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [priceChanges, setPriceChanges] = useState<string[]>([]);
  const [stockShortages, setStockShortages] = useState<string[]>([]);

  useEffect(() => {
    if (cart.length === 0 && !orderPlaced.current) navigate('/cart', { replace: true });
  }, [cart.length, navigate]);

  // Stale-pricing + inventory check (P1): the server is the final source of truth for unit price
  // and stock, but a cart snapshot goes stale the moment a seller edits a listing. On checkout we
  // re-fetch every non-quote line's live data and (a) warn about any price that changed so the
  // buyer isn't surprised by what the seller charges, and (b) flag requested quantities that now
  // exceed remaining stock so the buyer can adjust before the server rejects the order. The
  // server still re-validates on the POST - these banners are a UX head-start, not the check.
  // Accepted-quote lines are skipped - their price/quantity are locked by design.
  useEffect(() => {
    let active = true;
    async function checkCart() {
      const liveItems = cart.filter((i) => !i.acceptedQuoteId);
      const results = await Promise.allSettled(
        liveItems.map((item) => getProductById(item.productId))
      );
      if (!active) return;
      const changed: string[] = [];
      const shortages: string[] = [];
      liveItems.forEach((item, idx) => {
        const result = results[idx];
        if (result.status !== 'fulfilled' || !result.value) return;
        const live = resolveUnitPrice(
          { price: result.value.price, priceTiers: result.value.priceTiers },
          item.quantity
        );
        if (Math.abs(live - item.price) > 0.004) {
          changed.push(`${item.name} (₦${formatPrice(live)})`);
        }
        if (result.value.quantity != null && item.quantity > result.value.quantity) {
          shortages.push(`${item.name} (only ${result.value.quantity} left, you have ${item.quantity})`);
        }
      });
      setPriceChanges(changed);
      setStockShortages(shortages);
    }
    if (cart.some((i) => !i.acceptedQuoteId)) checkCart();
    return () => { active = false; };
  }, [cart]);

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
    if (placingOrder) return;
    if (!name.trim() || !phone.trim() || !address.trim()) {
      showToast('Please fill in your name, phone number and delivery address.', 'error');
      return;
    }
    // Auth gate (Phase 5): never create an order without a confirmed 'live' session. If we're not
    // yet live, try a silent renewal once; otherwise block and let the state machine decide
    // (reauth overlay, degraded banner, or restoring spinner) rather than firing a doomed POST.
    if (!isLive()) {
      await renewSession();
      if (!isLive()) {
        if (phaseRef.current === 'reauth') {
          showToast('Please confirm your session to continue with your order.', 'error');
        } else {
          showToast('We could not confirm your session yet. Please try again in a moment.', 'error');
        }
        return;
      }
    }
    setPlacingOrder(true);
    const addr = [address.trim(), city.trim(), state.trim()].filter(Boolean).join(', ');
    const order = await placeOrder({ address: addr, phone: phone.trim(), couponCode: appliedCoupon?.code });
    if (order) {
      orderPlaced.current = true;
      showToast('Order placed! Complete payment to confirm.', 'success');
      navigate(`/pay-offline?orderId=${encodeURIComponent(order.id)}`);
      return;
    }
    setPlacingOrder(false);
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
          {priceChanges.length > 0 && (
            <div className="col-12">
              <div className="escrow-hint" style={{ borderColor: '#e0a800', background: 'var(--warning-soft)', color: 'var(--text)' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#a06000' }}></i>
                <span>
                  Some prices changed since you added them to your cart and the seller will charge
                  the new amount: <strong>{priceChanges.join(', ')}</strong>.
                </span>
              </div>
            </div>
          )}
          {stockShortages.length > 0 && (
            <div className="col-12">
              <div className="escrow-hint" style={{ borderColor: '#d9534f', background: 'var(--danger-soft)', color: 'var(--text)' }}>
                <i className="fa-solid fa-box-open" style={{ color: '#d9534f' }}></i>
                <span>
                  These items no longer have enough stock for your order - please adjust quantities
                  before placing it: <strong>{stockShortages.join('; ')}</strong>.
                </span>
              </div>
            </div>
          )}
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

              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder}
                className="btn-primary btn-inline"
                style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
              >
                {placingOrder && <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>}
                {placingOrder ? 'Placing Order…' : (<><i className="fa-solid fa-lock"></i> Place Order</>)}
              </button>
              <p className="pay-note"><i className="fa-solid fa-shield-halved"></i> Payment via secure bank transfer (mock escrow)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
