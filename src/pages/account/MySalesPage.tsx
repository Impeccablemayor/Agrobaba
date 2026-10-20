import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSalesOrders } from '../../hooks/queries/useOrders';
import { useUpdateOrderStatus } from '../../hooks/mutations/useOrderMutations';
import { formatDate, formatPrice } from '../../lib/format';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import {
  getMyDeliveryProfile,
  saveMyDeliveryProfile,
  getShipmentsForOrder,
  updateSellerShipmentStatus,
  confirmDelivery,
} from '../../lib/logistics';
import { showToast } from '../../lib/toastBus';
import type { Order, OrderStatus, SellerDeliveryProfile, Shipment, ShipmentStatus } from '../../types';

type Filter = 'all' | 'delivered';

export default function MySalesPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');

  const { data: sales = [], isLoading: loading } = useSalesOrders();
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
  const [submittingStatus, setSubmittingStatus] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'buyer') {
      getMyDeliveryProfile()
        .then((p) => {
          if (p) setProfileForm(p);
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

  function getMyEarnings(order: Order) {
    return order.items.filter((it) => it.sellerId === user!.id).reduce((s, it) => s + it.price * it.quantity, 0);
  }

  const totalEarnings = sales.reduce((s, o) => s + getMyEarnings(o), 0);
  const toFulfill = sales.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length;
  const delivered = sales.filter((o) => o.status === 'delivered').length;

  const stats = [
    { icon: 'fa-cart-shopping', label: 'Total Sales', value: sales.length, color: 'var(--primary)' },
    { icon: 'fa-naira-sign', label: 'Earnings', value: formatPrice(totalEarnings), color: 'var(--success)' },
    { icon: 'fa-truck', label: 'To Fulfill', value: toFulfill, color: 'var(--accent)' },
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

        {loading ? (
          <PageLoadingSpinner message="Loading your sales…" />
        ) : (
          <>
          <div className="stats-grid" style={{ marginBottom: 28 }}>
          {stats.map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-icon"><i className={`fa-solid ${s.icon}`} style={{ color: s.color }}></i></div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
          </div>

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
                    <th>#</th><th>Buyer</th><th>Invoice</th><th>Your Earnings</th><th>Date</th><th>Fulfillment</th><th>Shipment</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order, i) => (
                    <tr key={order.id}>
                      <td>#{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{order.buyerName}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{order.buyerAddress || 'Message buyer for delivery details'}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{order.invoiceNumber}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(getMyEarnings(order))}</td>
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
                      </td>
                      <td>
                        <button
                          onClick={() => handleOpenShipmentModal(order)}
                          className="btn-outline btn-sm btn-inline"
                          style={{ padding: '4px 8px', fontSize: 11 }}
                        >
                          <i className="fa-solid fa-truck-fast"></i> Logistics
                        </button>
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
                  Buyer: <strong>{activeOrderForShipment.buyerName}</strong> • {activeOrderForShipment.buyerAddress}
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
