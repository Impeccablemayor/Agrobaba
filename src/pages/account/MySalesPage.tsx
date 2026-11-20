import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSalesOrders, useSellerEarnings } from '../../hooks/queries/useOrders';
import { useMyPayoutAccount } from '../../hooks/queries/useBankAccounts';
import { sellerPayoutHint } from '../../lib/bankAccounts';
import { financialStatusLabel } from '../../lib/orders';
import { useUpdateOrderStatus } from '../../hooks/mutations/useOrderMutations';
import { formatDate, formatPrice } from '../../lib/format';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { CancelOrderButton } from '../../components/CancelOrderButton';
import { SellerPartActions } from '../../components/SellerPartActions';
import {
  getMyDeliveryProfile,
  saveMyDeliveryProfile,
  getShipmentsForOrder,
  updateSellerShipmentStatus,
  confirmDelivery,
} from '../../lib/logistics';
import { showToast } from '../../lib/toastBus';
import { describeStage } from '../../lib/fulfilmentRules';
import type { Order, OrderStatus, SellerDeliveryProfile, Shipment, ShipmentStatus } from '../../types';

type Filter = 'all' | 'delivered';

export default function MySalesPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');

  const { data: sales = [], isLoading: loading } = useSalesOrders();
  // Money figures come from the backend, which counts only verified payments. An order exists
  // as soon as a buyer clicks "Place Order" - before paying - so it must never be summed here.
  const { data: earnings } = useSellerEarnings();
  const { data: payoutAccount } = useMyPayoutAccount();
  const updateStatusMutation = useUpdateOrderStatus();

  // Delivery Profile State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<SellerDeliveryProfile>>({
    providesDelivery: true,
    deliveryCoverage: 'LOCAL_ONLY',
    coveredStates: '',
    baseFee: 2000,
    freeDeliveryThreshold: 50000,
    estimatedDaysMin: 1,
    estimatedDaysMax: 3,
    pickupAddress: '',
    notes: '',
  });

  // Shipment Management State
  const [activeOrderForShipment, setActiveOrderForShipment] = useState<Order | null>(null);
  const [orderShipments, setOrderShipments] = useState<Shipment[]>([]);
  const [loadingShipments, setLoadingShipments] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);

  const [nextStatus, setNextStatus] = useState<ShipmentStatus>('READY_FOR_PICKUP');
  const [statusNote, setStatusNote] = useState('');
  const [statusLocation, setStatusLocation] = useState('');
  const [deliveryOtpInput, setDeliveryOtpInput] = useState('');
  const [receiptUrlInput, setReceiptUrlInput] = useState('');
  // Batch 5: who is carrying the goods when the seller sends them.
  const [carrierName, setCarrierName] = useState('');
  const [carrierPhone, setCarrierPhone] = useState('');
  const [trackingRef, setTrackingRef] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // No saved profile yet (the server returns a default with no id): buyers outside the seller's
  // own state must use AgroBaba delivery until they set one up.
  const [deliveryNotSetUp, setDeliveryNotSetUp] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'buyer') {
      getMyDeliveryProfile()
        .then((p) => {
          if (p) setProfileForm(p);
          setDeliveryNotSetUp(!p || p.id == null);
        })
        .catch(() => {});
    }
  }, [user]);

  if (!user) return null;

  if (user.role === 'buyer') {
    return (
      <div className="section">
        <div className="container">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><Link to="/">Home</Link></li>
              <li className="breadcrumb-item"><Link to="/account">My Account</Link></li>
              <li className="breadcrumb-item active">My Sales</li>
            </ol>
          </nav>
          <div className="empty-cart">
            <i className="fa-solid fa-coins"></i>
            <p>As a buyer, you don't have sales. Check your orders instead.</p>
            <Link to="/account/my-orders" className="btn-primary btn-inline btn-sm">
              <i className="fa-solid fa-box"></i> View My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isServiceProvider = user.role === 'service-provider';
  const title = isServiceProvider ? 'My Earnings' : 'My Sales';
  const subtitle = isServiceProvider ? 'Track bookings and earnings from your services.' : 'Manage orders customers have placed for your listings.';

  const earningByOrder = new Map((earnings?.orders ?? []).map((e) => [String(e.orderId), e]));
  /** This seller's items on the order - an order value, not earnings. */
  /** Delivery fee the buyer already paid online for this seller's lines. */
  function myDeliveryPaid(order: Order) {
    return order.items.filter((it) => String(it.sellerId) === String(user!.id)).reduce((s, it) => s + (it.deliveryFee ?? 0), 0);
  }
  function myOrderValue(order: Order) {
    return order.items.filter((it) => String(it.sellerId) === String(user!.id)).reduce((s, it) => s + it.price * it.quantity, 0);
  }
  const money = (v: number | null | undefined) => (earnings ? formatPrice(v ?? 0) : '—');
  const toFulfill = sales.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length;
  const delivered = sales.filter((o) => o.status === 'delivered').length;

  // Batch 8: each kind of money on its own, never one generic "earnings" number.
  const stats = [
    { icon: 'fa-chart-line', label: 'Total sales (paid orders)', value: money(earnings?.totalSales), color: 'var(--primary)' },
    { icon: 'fa-hourglass-half', label: 'Pending payment (not earnings yet)', value: money(earnings?.awaitingPayment), color: 'var(--muted)' },
    { icon: 'fa-lock', label: 'Held (until received and inspected)', value: money(earnings?.held), color: 'var(--accent)' },
    { icon: 'fa-naira-sign', label: 'Available for payout', value: money(earnings?.availableForPayout), color: 'var(--success)' },
    { icon: 'fa-paper-plane', label: 'Payout on its way', value: money(earnings?.payoutProcessing), color: 'var(--primary)' },
    { icon: 'fa-money-bill-transfer', label: 'Paid out', value: money(earnings?.paidOut), color: 'var(--primary)' },
    { icon: 'fa-triangle-exclamation', label: `Failed payouts${earnings?.failedPayoutCount ? ` (${earnings.failedPayoutCount}, we'll retry)` : ''}`,
      value: money(earnings?.failedPayouts), color: (earnings?.failedPayouts ?? 0) > 0 ? 'var(--danger)' : 'var(--muted)' },
    { icon: 'fa-rotate-left', label: 'Refund deductions', value: money(earnings?.refundDeductions), color: 'var(--muted)' },
    ...((earnings?.recoveryObligations ?? 0) > 0
      ? [{ icon: 'fa-scale-unbalanced', label: 'Owed back to AgroBaba', value: money(earnings?.recoveryObligations), color: 'var(--danger)' }] : []),
    { icon: 'fa-cart-shopping', label: 'Paid orders', value: earnings ? earnings.paidOrderCount : '—', color: 'var(--primary)' },
    { icon: 'fa-truck', label: 'To fulfil', value: toFulfill, color: 'var(--accent)' },
    { icon: 'fa-circle-check', label: 'Delivered', value: delivered, color: 'var(--success)' },
  ];

  let filtered = sales;
  if (filter === 'delivered') filtered = sales.filter((o) => o.status === 'delivered');

  function handleStatusChange(orderId: string, status: OrderStatus) {
    updateStatusMutation.mutate({ orderId, status });
  }

  async function handleOpenShipmentModal(order: Order) {
    setActiveOrderForShipment(order);
    setLoadingShipments(true);
    try {
      const list = await getShipmentsForOrder(Number(order.id));
      // Filter shipments that belong to this seller
      const mine = (list || []).filter((s) => String(s.sellerId) === String(user!.id));
      setOrderShipments(mine.length > 0 ? mine : list || []);
    } catch {
      setOrderShipments([]);
    } finally {
      setLoadingShipments(false);
    }
  }

  async function handleSaveProfile() {
    setProfileLoading(true);
    try {
      await saveMyDeliveryProfile(profileForm);
      setDeliveryNotSetUp(false);
      showToast('Delivery configuration saved successfully!', 'success');
      setProfileModalOpen(false);
    } catch (e: any) {
      showToast(e.message || 'Failed to save delivery profile', 'error');
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleAdvanceShipmentStatus() {
    if (!selectedShipment) return;
    setSubmittingStatus(true);
    try {
      if (nextStatus === 'DELIVERED') {
        if (!deliveryOtpInput.trim() && !receiptUrlInput.trim()) {
          showToast('Provide either the buyer delivery OTP or signed receipt image URL', 'warning');
          setSubmittingStatus(false);
          return;
        }

        if (deliveryOtpInput.trim()) {
          await confirmDelivery(selectedShipment.id, {
            proofType: 'DELIVERY_OTP',
            deliveryOtp: deliveryOtpInput.trim(),
            note: statusNote.trim() || undefined,
          });
        } else {
          await confirmDelivery(selectedShipment.id, {
            proofType: 'SIGNED_RECEIPT',
            receiptImageUrl: receiptUrlInput.trim(),
            note: statusNote.trim() || undefined,
          });
        }
      } else {
        await updateSellerShipmentStatus(selectedShipment.id, {
          status: nextStatus,
          note: statusNote.trim() || undefined,
          location: statusLocation.trim() || undefined,
          carrierName: carrierName.trim() || undefined,
          carrierPhone: carrierPhone.trim() || undefined,
          trackingRef: trackingRef.trim() || undefined,
        });
      }

      showToast('Shipment status updated!', 'success');
      setAdvanceModalOpen(false);
      resetAdvanceForm();
      if (activeOrderForShipment) {
        handleOpenShipmentModal(activeOrderForShipment);
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to update shipment status', 'error');
    } finally {
      setSubmittingStatus(false);
    }
  }

  function resetAdvanceForm() {
    setNextStatus('READY_FOR_PICKUP');
    setStatusNote('');
    setStatusLocation('');
    setDeliveryOtpInput('');
    setReceiptUrlInput('');
    setCarrierName('');
    setCarrierPhone('');
    setTrackingRef('');
    setSelectedShipment(null);
  }

  return (
    <div className="section">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/account">My Account</Link></li>
            <li className="breadcrumb-item active">{title}</li>
          </ol>
        </nav>

        {payoutAccount && !payoutAccount.readiness.ready && (
          <div role="note" style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 16, fontSize: 13 }}>
            <i className="fa-solid fa-building-columns" style={{ marginRight: 6 }}></i>
            <strong>AgroBaba can&apos;t pay you yet.</strong> {sellerPayoutHint(payoutAccount.readiness)}{' '}
            <Link to="/account/payout-account">Set up your payout account</Link>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>{title}</h1>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>{subtitle}</p>
          </div>
          {!isServiceProvider && (
            <button
              onClick={() => setProfileModalOpen(true)}
              className="btn-outline btn-inline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <i className="fa-solid fa-truck-ramp-box" style={{ color: 'var(--primary)' }}></i>
              Delivery Settings
            </button>
          )}
        </div>

        {deliveryNotSetUp && !isServiceProvider && (
          <div role="note" style={{ margin: '0 0 14px', padding: '10px 12px', borderRadius: 8, background: 'var(--warning-soft)', border: '1px solid #e0a800', fontSize: 12.5 }}>
            <i className="fa-solid fa-truck-ramp-box" style={{ color: '#a06000', marginRight: 6 }}></i>
            You haven&apos;t set up delivery yet. Until you do, you deliver only within your own state and buyers
            elsewhere must choose AgroBaba delivery.{' '}
            <button type="button" className="btn-link" onClick={() => setProfileModalOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
              Set up delivery
            </button>
          </div>
        )}

        {loading ? (
          <PageLoadingSpinner message="Loading your sales…" />
        ) : (
          <>
          <div className="stats-grid" style={{ marginBottom: 12 }}>
          {stats.map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-icon"><i className={`fa-solid ${s.icon}`} style={{ color: s.color }}></i></div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
          </div>
          <p className="earnings-note">
            <i className="fa-solid fa-shield-halved"></i>{' '}
            Money counts only after the buyer&apos;s payment is verified. AgroBaba holds it until the buyer
            confirms delivery and the payment has settled into AgroBaba&apos;s account, then it becomes
            available for payout and is sent to your bank account.
            {earnings && <> Amounts shown are after AgroBaba&apos;s {earnings.platformFeePercent}% platform fee.</>} Unpaid orders are not earnings.
            {earnings && earnings.refunded > 0 && <> Refunded so far: <strong>{formatPrice(earnings.refunded)}</strong>.</>}
            {earnings && earnings.underReview > 0 && <> Under review by AgroBaba: <strong>{formatPrice(earnings.underReview)}</strong>.</>}
            {!earnings && ' (Earnings are temporarily unavailable.)'}
          </p>

          <div className="shop-tabs">
            {(['all', 'delivered'] as const).map((f) => (
              <button key={f} className={`shop-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All Sales' : 'Delivered'}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-cart">
              <i className="fa-solid fa-coins"></i>
              <p>{filter === 'all' ? "No sales yet. Once buyers order your listings, they'll appear here." : `No ${filter} sales found.`}</p>
              {filter === 'all' && (
                <Link to="/account/post-listing" className="btn-primary btn-inline btn-sm">
                  <i className="fa-solid fa-plus"></i> Post a Listing
                </Link>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>#</th><th>Buyer</th><th>Invoice</th><th>Your Amount</th><th>Date</th><th>Fulfillment</th><th>Shipment</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order, i) => (
                    <tr key={order.id}>
                      <td>#{i + 1}</td>
                      <td>
                        {/* The server only sends buyer details once the payment is verified. */}
                        <div style={{ fontWeight: 600 }}>{order.buyerName || 'Buyer'}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{order.buyerAddress || 'Buyer and delivery details appear once payment is confirmed'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {myDeliveryPaid(order) > 0
                            ? <>Delivery fee paid online: {formatPrice(myDeliveryPaid(order))}</>
                            : 'Delivery fee: paid on delivery'}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{order.vendorOrders?.[0]?.vendorOrderNumber ?? order.invoiceNumber}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(myOrderValue(order))}</div>
                        {earningByOrder.get(order.id) && (
                          <span className={`financial-chip fs-${earningByOrder.get(order.id)!.financialStatus.toLowerCase()}`}>
                            {financialStatusLabel(earningByOrder.get(order.id)!)}
                          </span>
                        )}
                        {order.vendorOrders?.[0]?.fulfilmentStage && (() => {
                          const d = describeStage(order.vendorOrders[0], 'seller');
                          return d.label ? (
                            <div style={{ fontSize: 11, marginTop: 4, maxWidth: 260 }}>
                              <strong>{d.label}</strong>{d.detail ? <span style={{ color: 'var(--text-secondary)' }}> — {d.detail}</span> : null}
                            </div>
                          ) : null;
                        })()}
                      </td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>
                        {order.status === 'cancelled' ? (
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Cancelled</span>
                        ) : order.status === 'delivered' ? (
                          <span className="status-delivered">Delivered</span>
                        ) : (
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                            style={{ border: '1.5px solid var(--border-mid)', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
                          >
                            <option value="pending" disabled>Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                          </select>
                        )}
                        {/* A seller may cancel only an unpaid order that contains nothing but their
                            own items (e.g. out of stock); mixed orders go to the buyer/support. */}
                        {order.status === 'pending' && order.paymentStatus !== 'SUCCESS'
                          && order.items.every((it) => String(it.sellerId) === String(user!.id)) && (
                          <div style={{ marginTop: 6 }}>
                            <CancelOrderButton orderId={order.id} invoiceNumber={order.invoiceNumber} compact />
                          </div>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleOpenShipmentModal(order)}
                          className="btn-outline btn-sm btn-inline"
                          style={{ padding: '4px 8px', fontSize: 11 }}
                        >
                          <i className="fa-solid fa-truck-fast"></i> Logistics
                        </button>
                        <SellerPartActions order={order} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </>
        )}
      </div>

      {/* MODAL: Seller Delivery Settings Profile */}
      {profileModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, maxWidth: 540, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                <i className="fa-solid fa-truck-ramp-box" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
                Seller Delivery Settings
              </h3>
              <button onClick={() => setProfileModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--muted)' }}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Configure your delivery rates, coverage areas, warehouse pickup location, and expected delivery timeframes.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={profileForm.providesDelivery ?? true}
                  onChange={(e) => setProfileForm({ ...profileForm, providesDelivery: e.target.checked })}
                />
                I offer direct seller-managed delivery for my listings
              </label>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Coverage Scope</label>
                <select
                  value={profileForm.deliveryCoverage || 'LOCAL_ONLY'}
                  onChange={(e) => setProfileForm({ ...profileForm, deliveryCoverage: e.target.value as any })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                >
                  <option value="LOCAL_ONLY">Local City / State Only</option>
                  <option value="SELECT_STATES">Select Covered States</option>
                  <option value="NATIONWIDE">Nationwide Delivery</option>
                </select>
              </div>

              {profileForm.deliveryCoverage === 'SELECT_STATES' && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Covered States (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Lagos, Ogun, Oyo, Osun"
                    value={profileForm.coveredStates || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, coveredStates: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Base Delivery Fee (NGN)</label>
                  <input
                    type="number"
                    placeholder="e.g. 2500"
                    value={profileForm.baseFee ?? ''}
                    onChange={(e) => setProfileForm({ ...profileForm, baseFee: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Free Delivery Threshold (NGN)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={profileForm.freeDeliveryThreshold ?? ''}
                    onChange={(e) => setProfileForm({ ...profileForm, freeDeliveryThreshold: e.target.value ? Number(e.target.value) : undefined })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Est. Days (Min)</label>
                  <input
                    type="number"
                    min="1"
                    value={profileForm.estimatedDaysMin ?? 1}
                    onChange={(e) => setProfileForm({ ...profileForm, estimatedDaysMin: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Est. Days (Max)</label>
                  <input
                    type="number"
                    min="1"
                    value={profileForm.estimatedDaysMax ?? 3}
                    onChange={(e) => setProfileForm({ ...profileForm, estimatedDaysMax: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Farm / Warehouse Pickup Address</label>
                <textarea
                  placeholder="Full physical address where transporters can collect packed goods..."
                  value={profileForm.pickupAddress || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, pickupAddress: e.target.value })}
                  rows={2}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Operational Delivery Notes</label>
                <textarea
                  placeholder="e.g. Orders placed after 2pm dispatch next morning; cold-chain insulated packaging used..."
                  value={profileForm.notes || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, notes: e.target.value })}
                  rows={2}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setProfileModalOpen(false)} className="btn-outline btn-sm">Cancel</button>
              <button onClick={handleSaveProfile} disabled={profileLoading} className="btn-primary btn-sm">
                {profileLoading ? 'Saving…' : 'Save Delivery Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Order Shipments View & Fulfillment */}
      {activeOrderForShipment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, maxWidth: 640, width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: 24, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px 0' }}>
                  Logistics & Fulfillment: #{activeOrderForShipment.invoiceNumber}
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Buyer: <strong>{activeOrderForShipment.buyerName || 'Buyer'}</strong> • {activeOrderForShipment.buyerAddress || 'Details appear once payment is confirmed'}
                </span>
              </div>
              <button onClick={() => setActiveOrderForShipment(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--muted)' }}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {loadingShipments ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)' }}>Loading shipment details…</div>
            ) : orderShipments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)' }}>No shipment record generated for this order yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {orderShipments.map((shp) => (
                  <div key={shp.id} style={{ border: '1px solid var(--border-light)', borderRadius: 10, padding: 16, background: 'var(--bg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: 'var(--primary)' }}>
                          {shp.trackingNumber}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          Mode: <strong>{shp.fulfillmentType === 'AGROBABA_MANAGED' ? 'AgroBaba Coordinated' : 'Seller Managed'}</strong>
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 6,
                        background: shp.status === 'DELIVERED' ? '#dcfce7' : '#dbeafe',
                        color: shp.status === 'DELIVERED' ? '#166534' : '#1e40af'
                      }}>
                        {shp.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {shp.transporterName && (
                      <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: 6, fontSize: 12, marginBottom: 10 }}>
                        <i className="fa-solid fa-truck" style={{ color: 'var(--primary)', marginRight: 6 }}></i>
                        Assigned Transporter: <strong>{shp.transporterName}</strong> ({shp.transporterPhone})
                      </div>
                    )}

                    {shp.status !== 'DELIVERED' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                        {shp.status === 'AWAITING_SELLER_PREPARATION' && (
                          <button
                            onClick={() => { setSelectedShipment(shp); setNextStatus('READY_FOR_PICKUP'); setAdvanceModalOpen(true); }}
                            className="btn-primary btn-sm btn-inline"
                            style={{ fontSize: 11 }}
                          >
                            <i className="fa-solid fa-box-check"></i> Mark Ready for Pickup
                          </button>
                        )}

                        {shp.fulfillmentType === 'SELLER_MANAGED' && shp.status === 'READY_FOR_PICKUP' && (
                          <button
                            onClick={() => { setSelectedShipment(shp); setNextStatus('IN_TRANSIT'); setAdvanceModalOpen(true); }}
                            className="btn-outline btn-sm btn-inline"
                            style={{ fontSize: 11 }}
                          >
                            <i className="fa-solid fa-truck-fast"></i> Mark Dispatched / In Transit
                          </button>
                        )}

                        <button
                          onClick={() => { setSelectedShipment(shp); setNextStatus('DELIVERED'); setAdvanceModalOpen(true); }}
                          className="btn-outline btn-sm btn-inline"
                          style={{ fontSize: 11, color: '#16a34a', borderColor: '#86efac' }}
                        >
                          <i className="fa-solid fa-signature"></i> Confirm Delivery with OTP/Receipt
                        </button>

                        <button
                          onClick={() => { setSelectedShipment(shp); setNextStatus('DELIVERY_EXCEPTION'); setAdvanceModalOpen(true); }}
                          className="btn-outline btn-sm btn-inline"
                          style={{ fontSize: 11, color: '#b91c1c', borderColor: '#fca5a5' }}
                        >
                          <i className="fa-solid fa-triangle-exclamation"></i> Log Exception
                        </button>
                      </div>
                    )}

                    {/* Timeline Events */}
                    {shp.events && shp.events.length > 0 && (
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          Timeline Events:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {shp.events.slice(-4).reverse().map((e, idx) => (
                            <div key={idx} style={{ fontSize: 11, color: 'var(--text)' }}>
                              <span style={{ color: 'var(--muted)', marginRight: 6 }}>{formatDate(e.createdAt)}:</span>
                              <strong>{e.title}</strong> {e.description ? `— ${e.description}` : ''}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Advance Status & POD Input */}
      {advanceModalOpen && selectedShipment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, maxWidth: 480, width: '100%', padding: 24, boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px 0' }}>
              Update Shipment: {selectedShipment.trackingNumber}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Target Status</label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as ShipmentStatus)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                >
                  <option value="READY_FOR_PICKUP">Ready for Pickup</option>
                  <option value="IN_TRANSIT">In Transit / Dispatched</option>
                  <option value="DELIVERED">Delivered (Requires Proof)</option>
                  <option value="DELIVERY_EXCEPTION">Delivery Exception / Delay</option>
                </select>
              </div>

              {nextStatus === 'IN_TRANSIT' && selectedShipment.fulfillmentType !== 'AGROBABA_MANAGED' && (
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid var(--border-light)', display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>Who is delivering it?</div>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                    Required. Add the rider, driver or courier (or &quot;Myself&quot;), and a phone number or tracking reference.
                  </p>
                  <input aria-label="Carrier name" type="text" maxLength={120} placeholder="e.g. Musa (rider) / GIG Logistics / Myself"
                    value={carrierName} onChange={(e) => setCarrierName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }} />
                  <input aria-label="Carrier phone" type="tel" maxLength={30} placeholder="Phone number"
                    value={carrierPhone} onChange={(e) => setCarrierPhone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }} />
                  <input aria-label="Tracking reference" type="text" maxLength={120} placeholder="Tracking / waybill number (optional if phone given)"
                    value={trackingRef} onChange={(e) => setTrackingRef(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }} />
                </div>
              )}

              {nextStatus === 'DELIVERED' && (
                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>
                    Proof of Delivery Verification
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>
                    Enter either the 6-digit Delivery OTP given by the buyer upon receipt, OR provide a signed delivery receipt image URL.
                  </p>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 3 }}>
                      Buyer 6-Digit Delivery OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 583921"
                      value={deliveryOtpInput}
                      onChange={(e) => setDeliveryOtpInput(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 14, letterSpacing: '0.1em', fontWeight: 700 }}
                    />
                  </div>

                  <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', margin: '6px 0' }}>— OR —</div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 3 }}>
                      Signed Waybill / Receipt Image URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://.../signed-receipt.jpg"
                      value={receiptUrlInput}
                      onChange={(e) => setReceiptUrlInput(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 12 }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Location (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Ibadan Depot / Mile 12 Market"
                  value={statusLocation}
                  onChange={(e) => setStatusLocation(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Notes / Description</label>
                <textarea
                  placeholder="Operational details, packaging confirmation, driver contact..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setAdvanceModalOpen(false)} className="btn-outline btn-sm">Cancel</button>
              <button onClick={handleAdvanceShipmentStatus} disabled={submittingStatus} className="btn-primary btn-sm">
                {submittingStatus ? 'Saving…' : 'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
