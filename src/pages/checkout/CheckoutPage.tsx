import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StateCitySelect } from '../../components/StateCitySelect';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { placeOrder } from '../../lib/orders';
import { estimateDeliveryFee } from '../../lib/logistics';
import { couponDiscount, previewCoupon } from '../../lib/coupons';
import { getProductById } from '../../lib/products';
import { resolveUnitPrice } from '../../lib/units';
import { showToast } from '../../lib/toastBus';
import { formatPrice } from '../../lib/format';
import { collectionFeeFor } from '../../lib/fees';
import { useFees } from '../../hooks/queries/useLedger';
import { groupCartBySeller } from '../../lib/cart';
import { prefillFromUser } from '../../lib/locationSelect';
import { locationLine, type LocationSelection } from '../../lib/locations';
import type { Coupon } from '../../types';

export default function CheckoutPage() {
  const { user, phase, renewSession } = useAuth();
  const { cart, total, loading, clearCart, refreshCart } = useCart();
  const { data: fees } = useFees();
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
  const [location, setLocation] = useState<LocationSelection>(() => {
    const prefill = prefillFromUser(user);
    return {
      stateId: prefill.stateId ?? null,
      stateName: prefill.stateName ?? null,
      cityId: prefill.cityId ?? null,
      cityName: prefill.cityName ?? null,
    };
  });
  const [note, setNote] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<'SELLER_MANAGED' | 'AGROBABA_MANAGED'>('SELLER_MANAGED');
  const [deliveryPayment, setDeliveryPayment] = useState<'ONLINE' | 'ON_DELIVERY'>('ON_DELIVERY');
  // Each seller's own delivery fee (their delivery profile), for display only - the server
  // recalculates it when the order is placed.
  const [deliveryQuotes, setDeliveryQuotes] = useState<Record<string, { fee: number; covered: boolean; reason: string | null; seller: string }>>({});
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [priceChanges, setPriceChanges] = useState<string[]>([]);
  const [stockShortages, setStockShortages] = useState<string[]>([]);

  useEffect(() => {
    // Wait for the server cart load before deciding the cart is empty - mid-load it is [] but
    // the user's real cart may still be arriving.
    if (!loading && cart.length === 0 && !orderPlaced.current) navigate('/cart', { replace: true });
  }, [loading, cart.length, navigate]);

  // Fresh server verdict per line on arrival (stock, archived listings, order rules). A line the
  // server would refuse sends the buyer back to the cart, where the reason is shown on that line.
  useEffect(() => {
    void refreshCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per visit
  }, []);
  const blockingIssues = cart.filter((item) => item.issue).length;
  useEffect(() => {
    if (blockingIssues > 0 && !orderPlaced.current) {
      showToast('Some items in your cart need attention before checkout.', 'warning');
      navigate('/cart', { replace: true });
    }
  }, [blockingIssues, navigate]);

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

  // Sellers' delivery fees for the "pay delivery now" option. Quote lines already include delivery.
  // ...and whether each seller delivers to the buyer's state (the server re-checks both at checkout).
  const quoteKey = cart.map((i) => `${i.sellerId}:${i.price * i.quantity}:${i.acceptedQuoteId ?? ''}`).join('|') + `@${location.stateId ?? ''}`;
  useEffect(() => {
    let active = true;
    const subtotals = new Map<string, number>();
    const names = new Map<string, string>();
    const quoted = new Set(cart.filter((i) => i.acceptedQuoteId).map((i) => String(i.sellerId)));
    cart.filter((i) => !i.acceptedQuoteId && i.sellerId).forEach((i) => {
      subtotals.set(String(i.sellerId), (subtotals.get(String(i.sellerId)) ?? 0) + i.price * i.quantity);
      names.set(String(i.sellerId), i.sellerName || 'This seller');
    });
    Promise.allSettled([...subtotals.entries()].filter(([id]) => !quoted.has(id)).map(([id, sub]) =>
      estimateDeliveryFee(Number(id), sub, location.stateId ?? undefined).then((r) => [id, r] as const)))
      .then((results) => {
        if (!active) return;
        const next: Record<string, { fee: number; covered: boolean; reason: string | null; seller: string }> = {};
        results.forEach((r) => {
          if (r.status === 'fulfilled') {
            const [id, q] = r.value;
            next[id] = { fee: q.fee, covered: q.covered !== false, reason: q.reason ?? null, seller: names.get(id) ?? 'This seller' };
          }
        });
        setDeliveryQuotes(next);
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the cart's seller subtotals and state
  }, [quoteKey]);

  if (loading) return null;
  if (cart.length === 0 && !orderPlaced.current) return null;

  // Same rule as the server: the sale only (never delivery); a seller's own code only their items.
  const discountAmount = appliedCoupon ? couponDiscount(appliedCoupon, cart) : 0;
  const coverageProblems = fulfillmentType === 'SELLER_MANAGED'
    ? Object.values(deliveryQuotes).filter((q) => !q.covered).map((q) => q.reason || `${q.seller} doesn't deliver to your state.`)
    : [];
  const sellerDeliveryTotal = Object.values(deliveryQuotes).filter((q) => q.covered).reduce((s, q) => s + q.fee, 0);
  const canPayDeliveryOnline = fulfillmentType === 'SELLER_MANAGED' && sellerDeliveryTotal > 0;
  const deliveryOnline = canPayDeliveryOnline && deliveryPayment === 'ONLINE' ? sellerDeliveryTotal : 0;
  // The coupon never applies to delivery (same rule as the server).
  const beforeFees = total - discountAmount + deliveryOnline;
  // Payment processing fee, only if AgroBaba configures one (shown as its own line; the server's figure is charged).
  const collectionFee = collectionFeeFor(beforeFees, fees);
  const finalTotal = beforeFees + collectionFee;
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
    if (!location.stateId) {
      showToast('Please choose your delivery state.', 'error');
      return;
    }
    if (coverageProblems.length > 0) {
      showToast(coverageProblems[0], 'error');
      return;
    }
    // Auth gate (Phase 5): never create an order without a confirmed 'live' session. If we're not
    // yet live, try a silent renewal once; otherwise block and let the state machine decide
    // (signed-out redirect, degraded banner, or restoring spinner) rather than firing a doomed POST.
    if (!isLive()) {
      await renewSession();
      if (!isLive()) {
        if (phaseRef.current === 'signedOut') {
          // A confirmed dead session has already been ended gracefully by AuthContext (toast +
          // one-time login-page notice); here we only name the interrupted action.
          showToast('Please sign in again to complete your order.', 'warning');
        } else {
          showToast('We could not confirm your session yet. Please try again in a moment.', 'error');
        }
        return;
      }
    }
    setPlacingOrder(true);
    // Last-moment re-check: stock may have sold out while the buyer filled in the form.
    const fresh = await refreshCart();
    if (fresh && fresh.some((item) => item.issue)) {
      setPlacingOrder(false);
      showToast('Some cart quantities are no longer available. Review your cart and try again.', 'error');
      navigate('/cart');
      return;
    }
    const addr = [address.trim(), locationLine(location.cityName, location.stateName)].filter(Boolean).join(', ');
    const order = await placeOrder(cart, {
      address: addr,
      phone: phone.trim(),
      couponCode: appliedCoupon?.code,
      fulfillmentType,
      deliveryPayment: canPayDeliveryOnline ? deliveryPayment : 'ON_DELIVERY',
      deliveryStateId: location.stateId,
    });
    if (order) {
      orderPlaced.current = true;
      // The order is on the server; clear the (server-side) cart so state and backend move
      // together. Best-effort: the order itself already succeeded.
      void clearCart();
      // Payment redirect: the backend starts a hosted checkout with the chosen gateway and
      // returns the authorization URL. The browser must navigate to it for the hosted payment
      // page — not an SPA push.
      if (order.paymentInitializationFailed) {
        showToast(
          'Order placed, but we could not start payment right now. You can retry from My Orders.',
          'warning',
        );
        navigate('/account/my-orders');
        return;
      }
      if (order.paymentAuthorizationUrl) {
        window.location.assign(order.paymentAuthorizationUrl);
        return;
      }
      // ALREADY_PAID (or any other status where no redirect is needed):
      showToast('Order placed! Track it from My Orders.', 'success');
      navigate('/account/my-orders');
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
                <StateCitySelect
                  idPrefix="checkout"
                  fieldClassName="field"
                  wrapperClassName="col-md-6"
                  initial={prefillFromUser(user)}
                  onChange={setLocation}
                />
              </div>

              <div className="field" style={{ marginBottom: 0 }}>
                <label>Delivery Note <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea placeholder="Any special instructions for the seller or dispatch rider..." value={note} onChange={(e) => setNote(e.target.value)} />
              </div>

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
                <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 10 }}>
                  <i className="fa-solid fa-truck-ramp-box" style={{ color: 'var(--primary)', marginRight: 6 }}></i>
                  Delivery Coordination Method
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  <div
                    onClick={() => setFulfillmentType('SELLER_MANAGED')}
                    style={{
                      border: `2px solid ${fulfillmentType === 'SELLER_MANAGED' ? 'var(--primary)' : 'var(--border-mid)'}`,
                      borderRadius: 10,
                      padding: 14,
                      cursor: 'pointer',
                      background: fulfillmentType === 'SELLER_MANAGED' ? 'rgba(46, 125, 50, 0.06)' : 'var(--surface)',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>
                        <i className="fa-solid fa-store" style={{ marginRight: 6, color: 'var(--primary)' }}></i>
                        Seller-Managed Delivery
                      </span>
                      <input
                        type="radio"
                        name="fulfillmentType"
                        checked={fulfillmentType === 'SELLER_MANAGED'}
                        onChange={() => setFulfillmentType('SELLER_MANAGED')}
                      />
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                      Seller coordinates delivery directly using their local transportation arrangement.
                    </p>
                  </div>

                  <div
                    onClick={() => setFulfillmentType('AGROBABA_MANAGED')}
                    style={{
                      border: `2px solid ${fulfillmentType === 'AGROBABA_MANAGED' ? 'var(--primary)' : 'var(--border-mid)'}`,
                      borderRadius: 10,
                      padding: 14,
                      cursor: 'pointer',
                      background: fulfillmentType === 'AGROBABA_MANAGED' ? 'rgba(46, 125, 50, 0.06)' : 'var(--surface)',
                      transition: 'all 0.18s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>
                        <i className="fa-solid fa-shield-halved" style={{ marginRight: 6, color: 'var(--primary)' }}></i>
                        AgroBaba-Managed Delivery
                      </span>
                      <input
                        type="radio"
                        name="fulfillmentType"
                        checked={fulfillmentType === 'AGROBABA_MANAGED'}
                        onChange={() => setFulfillmentType('AGROBABA_MANAGED')}
                      />
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                      Coordinated via AgroBaba's vetted transporter directory with admin oversight & tracking.
                    </p>
                  </div>
                </div>
                {coverageProblems.length > 0 && (
                  <div role="alert" style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, background: 'var(--warning-soft)', border: '1px solid #e0a800', fontSize: 12.5 }}>
                    {coverageProblems.map((p) => <div key={p}><i className="fa-solid fa-triangle-exclamation" style={{ color: '#a06000', marginRight: 6 }}></i>{p}</div>)}
                  </div>
                )}
                {canPayDeliveryOnline ? (
                  <div style={{ marginTop: 14 }}>
                    <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 8 }}>Delivery fee payment</label>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, marginBottom: 6 }}>
                      <input type="radio" name="deliveryPayment" checked={deliveryPayment === 'ONLINE'} onChange={() => setDeliveryPayment('ONLINE')} style={{ marginTop: 3 }} />
                      <span>Pay the seller&apos;s delivery fee now ({formatPrice(sellerDeliveryTotal)}) with your order</span>
                    </label>
                    <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
                      <input type="radio" name="deliveryPayment" checked={deliveryPayment === 'ON_DELIVERY'} onChange={() => setDeliveryPayment('ON_DELIVERY')} style={{ marginTop: 3 }} />
                      <span>Pay for delivery when my order arrives</span>
                    </label>
                  </div>
                ) : (
                  <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {fulfillmentType === 'AGROBABA_MANAGED'
                      ? 'Delivery is paid when your order arrives. AgroBaba will confirm the cost once a transporter is assigned.'
                      : 'Delivery is arranged with the seller and paid when your order arrives.'}
                  </p>
                )}
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
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
                  {deliveryOnline > 0 ? formatPrice(deliveryOnline) : 'Pay on delivery'}
                </span>
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

              {collectionFee > 0 && (
                <div className="summary-row">
                  <span>Payment processing fee</span>
                  <span>{formatPrice(collectionFee)}</span>
                </div>
              )}

              <div className="summary-row total">
                <span>Total</span>
                <span>{formatPrice(finalTotal)}</span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder || coverageProblems.length > 0}
                className="btn-primary btn-inline"
                style={{ width: '100%', marginTop: 16, justifyContent: 'center' }}
              >
                {placingOrder && <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>}
                {placingOrder ? 'Placing Order…' : (<><i className="fa-solid fa-lock"></i> Place Order</>)}
              </button>
              <p className="pay-note"><i className="fa-solid fa-shield-halved"></i> Your order is placed securely with Agrobaba.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
