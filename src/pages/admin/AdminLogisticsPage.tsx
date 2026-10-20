import { useEffect, useState } from 'react';
import {
  getAdminLogisticsOverview,
  getAdminShipments,
  getAdminTransporters,
  getActiveTransporters,
  createTransporter,
  updateTransporter,
  setTransporterActive,
  assignTransporter,
  confirmPickup,
  recordDeliveryQuote,
  updateAdminShipmentStatus,
  overrideDelivery,
} from '../../lib/logistics';
import { formatPrice, formatDate } from '../../lib/format';
import { showToast } from '../../lib/toastBus';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import type {
  Shipment,
  Transporter,
  LogisticsOverview,
  ShipmentStatus,
} from '../../types';

type Tab = 'shipments' | 'transporters' | 'overview';

const STATUS_LABELS: Record<ShipmentStatus, { label: string; bg: string; color: string; icon: string }> = {
  ARRANGEMENT_PENDING: { label: 'Arrangement Pending', bg: '#fef3c7', color: '#92400e', icon: 'fa-clock' },
  AWAITING_SELLER_PREPARATION: { label: 'Awaiting Seller Prep', bg: '#e0f2fe', color: '#0369a1', icon: 'fa-box' },
  READY_FOR_PICKUP: { label: 'Ready for Pickup', bg: '#fef9c3', color: '#854d0e', icon: 'fa-dolly' },
  AWAITING_TRANSPORTER_ASSIGNMENT: { label: 'Awaiting Transporter', bg: '#fee2e2', color: '#991b1b', icon: 'fa-user-clock' },
  TRANSPORTER_ASSIGNED: { label: 'Transporter Assigned', bg: '#e0e7ff', color: '#3730a3', icon: 'fa-truck-arrow-right' },
  PICKUP_CONFIRMED: { label: 'Pickup Confirmed', bg: '#ede9fe', color: '#5b21b6', icon: 'fa-clipboard-check' },
  IN_TRANSIT: { label: 'In Transit', bg: '#dbeafe', color: '#1e40af', icon: 'fa-truck-fast' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', bg: '#cffafe', color: '#155e75', icon: 'fa-person-walking-luggage' },
  DELIVERED: { label: 'Delivered', bg: '#dcfce7', color: '#166534', icon: 'fa-circle-check' },
  DELIVERY_FAILED: { label: 'Delivery Failed', bg: '#fee2e2', color: '#b91c1c', icon: 'fa-circle-xmark' },
  DELIVERY_EXCEPTION: { label: 'Delivery Exception', bg: '#ffedd5', color: '#9a3412', icon: 'fa-triangle-exclamation' },
  RETURN_IN_PROGRESS: { label: 'Return in Progress', bg: '#f1f5f9', color: '#475569', icon: 'fa-rotate-left' },
  RETURNED: { label: 'Returned', bg: '#f1f5f9', color: '#334155', icon: 'fa-arrow-rotate-left' },
  CANCELLED: { label: 'Cancelled', bg: '#f3f4f6', color: '#6b7280', icon: 'fa-ban' },
};

export default function AdminLogisticsPage() {
  const [tab, setTab] = useState<Tab>('shipments');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<LogisticsOverview | null>(null);

  // Shipments state
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [shipmentsTotal, setShipmentsTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [requiresActionFilter, setRequiresActionFilter] = useState<boolean | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);

  // Transporters state
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [activeTransporters, setActiveTransporters] = useState<Transporter[]>([]);
  const [transporterSearch, setTransporterSearch] = useState('');

  // Modals state
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [timelineShipment, setTimelineShipment] = useState<Shipment | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [transporterModalOpen, setTransporterModalOpen] = useState(false);
  const [editingTransporter, setEditingTransporter] = useState<Transporter | null>(null);

  // Form states
  const [assignTransporterId, setAssignTransporterId] = useState<number | ''>('');
  const [agreedCost, setAgreedCost] = useState<number | ''>('');
  const [estimatedPickupDate, setEstimatedPickupDate] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [reassignmentReason, setReassignmentReason] = useState('');

  const [quoteAmount, setQuoteAmount] = useState<number | ''>('');
  const [quoteSource, setQuoteSource] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteExpiresAt, setQuoteExpiresAt] = useState('');

  const [newStatus, setNewStatus] = useState<ShipmentStatus>('IN_TRANSIT');
  const [statusNote, setStatusNote] = useState('');
  const [statusLocation, setStatusLocation] = useState('');

  const [overrideReason, setOverrideReason] = useState('');

  const [transporterForm, setTransporterForm] = useState({
    name: '',
    phone: '',
    altPhone: '',
    email: '',
    operatingLocations: '',
    vehicleType: '',
    cargoTypes: '',
    verificationStatus: 'VERIFIED',
    operationalNotes: '',
    active: true,
  });

  async function loadData() {
    setLoading(true);
    try {
      const [overviewData, shipmentsData, transportersData, activeList] = await Promise.all([
        getAdminLogisticsOverview().catch(() => null),
        getAdminShipments({
          status: statusFilter || undefined,
          requiresAction: requiresActionFilter,
          search: searchQuery || undefined,
          page,
          size: 15,
        }).catch(() => ({ content: [], totalElements: 0, totalPages: 0, size: 15, number: 0 })),
        getAdminTransporters({ search: transporterSearch || undefined }).catch(() => ({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 })),
        getActiveTransporters().catch(() => []),
      ]);

      setOverview(overviewData);
      setShipments(shipmentsData.content || []);
      setShipmentsTotal(shipmentsData.totalElements || 0);
      setTransporters(transportersData.content || []);
      setActiveTransporters(activeList || []);
    } catch {
      showToast('Error loading logistics data', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [statusFilter, requiresActionFilter, searchQuery, page, transporterSearch]);

  async function handleAssignSubmit() {
    if (!selectedShipment || !assignTransporterId) {
      showToast('Please select a transporter', 'warning');
      return;
    }
    try {
      await assignTransporter(selectedShipment.id, {
        transporterId: Number(assignTransporterId),
        agreedCost: agreedCost !== '' ? Number(agreedCost) : undefined,
        estimatedPickupDate: estimatedPickupDate || undefined,
        estimatedDeliveryDate: estimatedDeliveryDate || undefined,
        reassignmentReason: reassignmentReason || undefined,
      });
      showToast('Transporter assigned successfully!', 'success');
      setAssignModalOpen(false);
      resetAssignForm();
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to assign transporter', 'error');
    }
  }

  async function handleQuoteSubmit() {
    if (!selectedShipment || !quoteAmount || !quoteSource.trim()) {
      showToast('Please fill in amount and source', 'warning');
      return;
    }
    try {
      await recordDeliveryQuote(selectedShipment.id, {
        quotedAmount: Number(quoteAmount),
        quoteSource: quoteSource.trim(),
        notes: quoteNotes.trim() || undefined,
        expiresAt: quoteExpiresAt || undefined,
      });
      showToast('Delivery quote recorded!', 'success');
      setQuoteModalOpen(false);
      resetQuoteForm();
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to record quote', 'error');
    }
  }

  async function handleStatusSubmit() {
    if (!selectedShipment) return;
    try {
      await updateAdminShipmentStatus(selectedShipment.id, {
        status: newStatus,
        note: statusNote.trim() || undefined,
        location: statusLocation.trim() || undefined,
      });
      showToast('Shipment status updated!', 'success');
      setStatusModalOpen(false);
      resetStatusForm();
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to update status', 'error');
    }
  }

  async function handlePickupConfirm(shipment: Shipment) {
    if (!window.confirm(`Confirm physical pickup of ${shipment.trackingNumber} from seller depot?`)) return;
    try {
      await confirmPickup(shipment.id, 'Transporter confirmed collection from seller address.');
      showToast('Pickup confirmed!', 'success');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to confirm pickup', 'error');
    }
  }

  async function handleOverrideSubmit() {
    if (!selectedShipment || !overrideReason.trim()) {
      showToast('Documented override justification reason is mandatory', 'error');
      return;
    }
    try {
      await overrideDelivery(selectedShipment.id, overrideReason.trim());
      showToast('Administrative delivery confirmation recorded!', 'success');
      setOverrideModalOpen(false);
      setOverrideReason('');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to override delivery', 'error');
    }
  }

  async function handleTransporterSubmit() {
    if (!transporterForm.name.trim() || !transporterForm.phone.trim()) {
      showToast('Transporter name and phone are required', 'error');
      return;
    }
    try {
      if (editingTransporter) {
        await updateTransporter(editingTransporter.id, transporterForm);
        showToast('Transporter updated successfully!', 'success');
      } else {
        await createTransporter(transporterForm);
        showToast('Transporter added to directory!', 'success');
      }
      setTransporterModalOpen(false);
      resetTransporterForm();
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to save transporter', 'error');
    }
  }

  async function handleToggleTransporterActive(transporter: Transporter) {
    try {
      await setTransporterActive(transporter.id, !transporter.active);
      showToast(`Transporter ${!transporter.active ? 'activated' : 'deactivated'}`, 'info');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to update status', 'error');
    }
  }

  function resetAssignForm() {
    setAssignTransporterId('');
    setAgreedCost('');
    setEstimatedPickupDate('');
    setEstimatedDeliveryDate('');
    setReassignmentReason('');
    setSelectedShipment(null);
  }

  function resetQuoteForm() {
    setQuoteAmount('');
    setQuoteSource('');
    setQuoteNotes('');
    setQuoteExpiresAt('');
    setSelectedShipment(null);
  }

  function resetStatusForm() {
    setNewStatus('IN_TRANSIT');
    setStatusNote('');
    setStatusLocation('');
    setSelectedShipment(null);
  }

  function resetTransporterForm() {
    setTransporterForm({
      name: '',
      phone: '',
      altPhone: '',
      email: '',
      operatingLocations: '',
      vehicleType: '',
      cargoTypes: '',
      verificationStatus: 'VERIFIED',
      operationalNotes: '',
      active: true,
    });
    setEditingTransporter(null);
  }

  function openEditTransporter(t: Transporter) {
    setEditingTransporter(t);
    setTransporterForm({
      name: t.name,
      phone: t.phone,
      altPhone: t.altPhone || '',
      email: t.email || '',
      operatingLocations: t.operatingLocations || '',
      vehicleType: t.vehicleType || '',
      cargoTypes: t.cargoTypes || '',
      verificationStatus: t.verificationStatus || 'VERIFIED',
      operationalNotes: t.operationalNotes || '',
      active: t.active,
    });
    setTransporterModalOpen(true);
  }

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: '0 0 6px 0', letterSpacing: '-0.03em' }}>
            <i className="fa-solid fa-truck-ramp-box" style={{ color: 'var(--primary)', marginRight: 10 }}></i>
            Logistics & Transport Oversight
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            Phase 1 internal transportation coordination, approved transporter directory, offline quotations & proof-of-delivery.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { resetTransporterForm(); setTransporterModalOpen(true); }}
            className="btn-primary btn-sm btn-inline"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="fa-solid fa-plus"></i> Add Transporter
          </button>
          <button onClick={loadData} className="btn-outline btn-sm btn-inline">
            <i className="fa-solid fa-arrows-rotate"></i> Refresh
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      {overview && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
          <div style={{ background: 'var(--surface)', padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Total Shipments</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{overview.totalShipments}</div>
          </div>
          <div style={{ background: overview.unassignedReadyForPickupCount > 0 ? '#fef2f2' : 'var(--surface)', padding: '14px 18px', borderRadius: 12, border: `1px solid ${overview.unassignedReadyForPickupCount > 0 ? '#fca5a5' : 'var(--border-light)'}` }}>
            <div style={{ fontSize: 12, color: overview.unassignedReadyForPickupCount > 0 ? '#991b1b' : 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fa-solid fa-triangle-exclamation"></i> Ready & Unassigned
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: overview.unassignedReadyForPickupCount > 0 ? '#b91c1c' : 'inherit' }}>
              {overview.unassignedReadyForPickupCount}
            </div>
          </div>
          <div style={{ background: 'var(--surface)', padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>In Transit</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8' }}>{overview.inTransitCount}</div>
          </div>
          <div style={{ background: overview.overdueDeliveriesCount > 0 ? '#fffbeb' : 'var(--surface)', padding: '14px 18px', borderRadius: 12, border: `1px solid ${overview.overdueDeliveriesCount > 0 ? '#fde68a' : 'var(--border-light)'}` }}>
            <div style={{ fontSize: 12, color: overview.overdueDeliveriesCount > 0 ? '#92400e' : 'var(--text-secondary)', marginBottom: 4 }}>
              Overdue Shipments
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: overview.overdueDeliveriesCount > 0 ? '#b45309' : 'inherit' }}>
              {overview.overdueDeliveriesCount}
            </div>
          </div>
          <div style={{ background: 'var(--surface)', padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Delivered</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{overview.deliveredCount}</div>
          </div>
          <div style={{ background: overview.requiresAdminActionCount > 0 ? '#fff7ed' : 'var(--surface)', padding: '14px 18px', borderRadius: 12, border: `1px solid ${overview.requiresAdminActionCount > 0 ? '#fdba74' : 'var(--border-light)'}` }}>
            <div style={{ fontSize: 12, color: overview.requiresAdminActionCount > 0 ? '#c2410c' : 'var(--text-secondary)', marginBottom: 4 }}>
              Action Needed
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: overview.requiresAdminActionCount > 0 ? '#ea580c' : 'inherit' }}>
              {overview.requiresAdminActionCount}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '2px solid var(--border-light)', marginBottom: 20 }}>
        <button
          onClick={() => setTab('shipments')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            borderBottom: tab === 'shipments' ? '2px solid var(--primary)' : '2px solid transparent',
            color: tab === 'shipments' ? 'var(--primary)' : 'var(--text-secondary)',
            marginBottom: -2,
          }}
        >
          <i className="fa-solid fa-boxes-stacked" style={{ marginRight: 6 }}></i>
          Shipments Queue ({shipmentsTotal})
        </button>
        <button
          onClick={() => setTab('transporters')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            borderBottom: tab === 'transporters' ? '2px solid var(--primary)' : '2px solid transparent',
            color: tab === 'transporters' ? 'var(--primary)' : 'var(--text-secondary)',
            marginBottom: -2,
          }}
        >
          <i className="fa-solid fa-address-book" style={{ marginRight: 6 }}></i>
          Transporter Directory ({transporters.length})
        </button>
      </div>

      {loading ? (
        <PageLoadingSpinner message="Loading logistics records…" />
      ) : tab === 'shipments' ? (
        <div>
          {/* Filters Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18, alignItems: 'center' }}>
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search tracking #, invoice, recipient, or seller..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
            >
              <option value="">All Statuses</option>
              <option value="AWAITING_SELLER_PREPARATION">Awaiting Seller Prep</option>
              <option value="READY_FOR_PICKUP">Ready for Pickup</option>
              <option value="TRANSPORTER_ASSIGNED">Transporter Assigned</option>
              <option value="PICKUP_CONFIRMED">Pickup Confirmed</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
              <option value="DELIVERY_FAILED">Delivery Failed</option>
              <option value="DELIVERY_EXCEPTION">Delivery Exception</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={requiresActionFilter === true}
                onChange={(e) => { setRequiresActionFilter(e.target.checked ? true : undefined); setPage(0); }}
              />
              Requires Admin Action Only
            </label>
          </div>

          {/* Table */}
          {shipments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', borderRadius: 12, border: '1px dashed var(--border-mid)' }}>
              <i className="fa-solid fa-truck" style={{ fontSize: 32, color: 'var(--muted)', marginBottom: 12 }}></i>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)' }}>No shipments found matching criteria.</p>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border-light)', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle, rgba(0,0,0,0.02))', borderBottom: '1px solid var(--border-light)' }}>
                    <th style={{ padding: '12px 16px' }}>Tracking #</th>
                    <th style={{ padding: '12px 16px' }}>Method</th>
                    <th style={{ padding: '12px 16px' }}>Vendor & Origin</th>
                    <th style={{ padding: '12px 16px' }}>Recipient & Destination</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px' }}>Transporter</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => {
                    const st = STATUS_LABELS[s.status] || { label: s.status, bg: '#f3f4f6', color: '#374151', icon: 'fa-box' };
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-light)', transition: 'background 0.15s ease' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{s.trackingNumber}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Order #{s.invoiceNumber || '—'}</div>
                          {s.requiresAdminAction && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fee2e2', color: '#991b1b', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, marginTop: 4 }}>
                              <i className="fa-solid fa-bell"></i> Action Needed
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: s.fulfillmentType === 'AGROBABA_MANAGED' ? '#dbeafe' : '#f3f4f6',
                            color: s.fulfillmentType === 'AGROBABA_MANAGED' ? '#1e40af' : '#4b5563'
                          }}>
                            {s.fulfillmentType === 'AGROBABA_MANAGED' ? 'AgroBaba Managed' : 'Seller Managed'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{s.sellerName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.pickupAddress || 'Address on file'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{s.recipientName || 'Buyer'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {s.deliveryAddress}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            background: st.bg,
                            color: st.color,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: 6,
                          }}>
                            <i className={`fa-solid ${st.icon}`}></i>
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {s.transporterName ? (
                            <div>
                              <div style={{ fontWeight: 600 }}>{s.transporterName}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.transporterPhone}</div>
                              {s.transporterCost != null && (
                                <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>
                                  NGN {formatPrice(s.transporterCost)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            {s.fulfillmentType === 'AGROBABA_MANAGED' && s.status !== 'DELIVERED' && (
                              <button
                                onClick={() => { setSelectedShipment(s); setAssignModalOpen(true); }}
                                className="btn-outline btn-sm"
                                title="Assign/Reassign Transporter"
                                style={{ padding: '4px 8px', fontSize: 11 }}
                              >
                                <i className="fa-solid fa-user-plus"></i> Assign
                              </button>
                            )}

                            {s.status === 'READY_FOR_PICKUP' && (
                              <button
                                onClick={() => handlePickupConfirm(s)}
                                className="btn-outline btn-sm"
                                title="Confirm Pickup from Seller"
                                style={{ padding: '4px 8px', fontSize: 11, color: '#16a34a', borderColor: '#86efac' }}
                              >
                                <i className="fa-solid fa-dolly"></i> Pickup
                              </button>
                            )}

                            <button
                              onClick={() => { setSelectedShipment(s); setQuoteModalOpen(true); }}
                              className="btn-outline btn-sm"
                              title="Record Offline Delivery Quote"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                            >
                              <i className="fa-solid fa-calculator"></i> Quote
                            </button>

                            <button
                              onClick={() => { setSelectedShipment(s); setStatusModalOpen(true); }}
                              className="btn-outline btn-sm"
                              title="Update Status / Exception"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                            >
                              <i className="fa-solid fa-pen-to-square"></i> Status
                            </button>

                            {s.status !== 'DELIVERED' && (
                              <button
                                onClick={() => { setSelectedShipment(s); setOverrideModalOpen(true); }}
                                className="btn-outline btn-sm"
                                title="Admin Override Delivery Confirmation"
                                style={{ padding: '4px 8px', fontSize: 11, color: '#b91c1c', borderColor: '#fca5a5' }}
                              >
                                <i className="fa-solid fa-signature"></i> Override
                              </button>
                            )}

                            <button
                              onClick={() => setTimelineShipment(s)}
                              className="btn-outline btn-sm"
                              title="View History Timeline"
                              style={{ padding: '4px 8px', fontSize: 11 }}
                            >
                              <i className="fa-solid fa-clock-rotate-left"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Transporters Tab */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ maxWidth: 320, width: '100%' }}>
              <input
                type="text"
                placeholder="Search transporter directory..."
                value={transporterSearch}
                onChange={(e) => setTransporterSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
              />
            </div>
            <button
              onClick={() => { resetTransporterForm(); setTransporterModalOpen(true); }}
              className="btn-primary btn-sm btn-inline"
            >
              <i className="fa-solid fa-plus"></i> New Transporter
            </button>
          </div>

          <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border-light)', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle, rgba(0,0,0,0.02))', borderBottom: '1px solid var(--border-light)' }}>
                  <th style={{ padding: '12px 16px' }}>Transporter Name</th>
                  <th style={{ padding: '12px 16px' }}>Contact Phone</th>
                  <th style={{ padding: '12px 16px' }}>Service Areas</th>
                  <th style={{ padding: '12px 16px' }}>Vehicle & Cargo</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Shipments</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transporters.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700 }}>{t.name}</div>
                      {t.email && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.email}</div>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div>{t.phone}</div>
                      {t.altPhone && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Alt: {t.altPhone}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: 200 }}>
                      <span style={{ fontSize: 12 }}>{t.operatingLocations || 'Nationwide'}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{t.vehicleType || 'Any'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.cargoTypes || 'General agricultural cargo'}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: t.active ? '#dcfce7' : '#fee2e2',
                        color: t.active ? '#166534' : '#991b1b'
                      }}>
                        {t.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 12 }}>
                        <strong>{t.completedShipmentsCount || 0}</strong> completed
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => openEditTransporter(t)}
                          className="btn-outline btn-sm"
                          style={{ padding: '4px 8px', fontSize: 11 }}
                        >
                          <i className="fa-solid fa-pen"></i> Edit
                        </button>
                        <button
                          onClick={() => handleToggleTransporterActive(t)}
                          className="btn-outline btn-sm"
                          style={{ padding: '4px 8px', fontSize: 11, color: t.active ? '#b91c1c' : '#166534' }}
                        >
                          {t.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Assign Transporter */}
      {assignModalOpen && selectedShipment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, maxWidth: 520, width: '100%', padding: 24, boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px 0' }}>
              Assign Transporter to {selectedShipment.trackingNumber}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Select a transporter from AgroBaba's vetted internal directory to coordinate this delivery offline.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Select Transporter *</label>
                <select
                  value={assignTransporterId}
                  onChange={(e) => setAssignTransporterId(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                >
                  <option value="">-- Choose Transporter --</option>
                  {activeTransporters.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.phone}) - {t.vehicleType || 'Vehicle'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Agreed Transport Cost (NGN)</label>
                <input
                  type="number"
                  placeholder="e.g. 25000"
                  value={agreedCost}
                  onChange={(e) => setAgreedCost(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Expected Pickup Date</label>
                  <input
                    type="datetime-local"
                    value={estimatedPickupDate}
                    onChange={(e) => setEstimatedPickupDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Estimated Delivery Date</label>
                  <input
                    type="datetime-local"
                    value={estimatedDeliveryDate}
                    onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                  />
                </div>
              </div>

              {selectedShipment.transporterName && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Reassignment Reason *</label>
                  <textarea
                    placeholder="Reason for changing previous transporter..."
                    value={reassignmentReason}
                    onChange={(e) => setReassignmentReason(e.target.value)}
                    rows={2}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setAssignModalOpen(false)} className="btn-outline btn-sm">Cancel</button>
              <button onClick={handleAssignSubmit} className="btn-primary btn-sm">Confirm Assignment</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Record Delivery Quote */}
      {quoteModalOpen && selectedShipment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, maxWidth: 480, width: '100%', padding: 24, boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px 0' }}>
              Record Offline Quote for {selectedShipment.trackingNumber}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Quoted Amount (NGN) *</label>
                <input
                  type="number"
                  placeholder="e.g. 18000"
                  value={quoteAmount}
                  onChange={(e) => setQuoteAmount(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Quote Source / Transporter Contact *</label>
                <input
                  type="text"
                  placeholder="e.g. Kano Haulage Depot via Phone / Driver Musa"
                  value={quoteSource}
                  onChange={(e) => setQuoteSource(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Quote Expiry Date</label>
                <input
                  type="datetime-local"
                  value={quoteExpiresAt}
                  onChange={(e) => setQuoteExpiresAt(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Operational Notes</label>
                <textarea
                  placeholder="Details of agreement, vehicle capacity, route details..."
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setQuoteModalOpen(false)} className="btn-outline btn-sm">Cancel</button>
              <button onClick={handleQuoteSubmit} className="btn-primary btn-sm">Save Quote</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Status / Exception Update */}
      {statusModalOpen && selectedShipment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, maxWidth: 480, width: '100%', padding: 24, boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px 0' }}>
              Update Status: {selectedShipment.trackingNumber}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>New Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ShipmentStatus)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                >
                  <option value="IN_TRANSIT">In Transit</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                  <option value="DELIVERY_EXCEPTION">Delivery Exception / Delay</option>
                  <option value="DELIVERY_FAILED">Delivery Failed</option>
                  <option value="RETURN_IN_PROGRESS">Return in Progress</option>
                  <option value="RETURNED">Returned</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Location</label>
                <input
                  type="text"
                  placeholder="e.g. Ibadan Toll Gate Checkpoint"
                  value={statusLocation}
                  onChange={(e) => setStatusLocation(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Operational Note / Exception Detail</label>
                <textarea
                  placeholder="Notes on current condition, delay reasons, or driver report..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setStatusModalOpen(false)} className="btn-outline btn-sm">Cancel</button>
              <button onClick={handleStatusSubmit} className="btn-primary btn-sm">Update Progress</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Admin Override Proof of Delivery */}
      {overrideModalOpen && selectedShipment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, maxWidth: 480, width: '100%', padding: 24, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#b91c1c', marginBottom: 12 }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 22 }}></i>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                Administrative Delivery Override
              </h3>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Manually confirming delivery for <strong>{selectedShipment.trackingNumber}</strong> requires a mandatory recorded explanation for audit compliance.
            </p>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Justification Reason *</label>
              <textarea
                placeholder="Document resolution details (e.g. buyer confirmed delivery via direct phone call; dispute investigated and resolved)..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setOverrideModalOpen(false)} className="btn-outline btn-sm">Cancel</button>
              <button onClick={handleOverrideSubmit} className="btn-primary btn-sm" style={{ background: '#b91c1c' }}>
                Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Transporter Form (Create/Edit) */}
      {transporterModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, maxWidth: 540, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 24, boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px 0' }}>
              {editingTransporter ? 'Edit Transporter' : 'Add New Transporter'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Transporter / Business Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Alhaji Ibrahim Haulage Ltd"
                  value={transporterForm.name}
                  onChange={(e) => setTransporterForm({ ...transporterForm, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Phone Number *</label>
                  <input
                    type="tel"
                    placeholder="e.g. 08012345678"
                    value={transporterForm.phone}
                    onChange={(e) => setTransporterForm({ ...transporterForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Alt Contact Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. 08187654321"
                    value={transporterForm.altPhone}
                    onChange={(e) => setTransporterForm({ ...transporterForm, altPhone: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Operating Service Areas</label>
                <input
                  type="text"
                  placeholder="e.g. Kano, Kaduna, Abuja, Niger, Lagos"
                  value={transporterForm.operatingLocations}
                  onChange={(e) => setTransporterForm({ ...transporterForm, operatingLocations: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Vehicle Type / Fleet</label>
                  <input
                    type="text"
                    placeholder="e.g. 15-Ton Truck / Flatbed"
                    value={transporterForm.vehicleType}
                    onChange={(e) => setTransporterForm({ ...transporterForm, vehicleType: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Supported Cargo Types</label>
                  <input
                    type="text"
                    placeholder="e.g. Grains, Perishables, Tubers"
                    value={transporterForm.cargoTypes}
                    onChange={(e) => setTransporterForm({ ...transporterForm, cargoTypes: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>Operational Notes</label>
                <textarea
                  placeholder="Any operational conditions, driver contact names, or dispatch guidelines..."
                  value={transporterForm.operationalNotes}
                  onChange={(e) => setTransporterForm({ ...transporterForm, operationalNotes: e.target.value })}
                  rows={2}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-mid)', fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setTransporterModalOpen(false)} className="btn-outline btn-sm">Cancel</button>
              <button onClick={handleTransporterSubmit} className="btn-primary btn-sm">Save Transporter</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Complete Timeline Audit */}
      {timelineShipment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, maxWidth: 600, width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: 24, boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px 0' }}>
                  Shipment Timeline: {timelineShipment.trackingNumber}
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Delivery OTP: <strong style={{ letterSpacing: '0.1em' }}>{timelineShipment.deliveryOtp || '—'}</strong>
                </span>
              </div>
              <button onClick={() => setTimelineShipment(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--muted)' }}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {timelineShipment.events && timelineShipment.events.length > 0 ? (
              <div style={{ position: 'relative', paddingLeft: 24, borderLeft: '2px solid var(--border-mid)' }}>
                {timelineShipment.events.map((evt, idx) => (
                  <div key={idx} style={{ position: 'relative', marginBottom: 20 }}>
                    <div style={{
                      position: 'absolute',
                      left: -31,
                      top: 0,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: 'var(--primary)',
                      border: '3px solid var(--surface)'
                    }}></div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{evt.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      {formatDate(evt.createdAt)} {evt.actorRole && `• by ${evt.actorRole}`} {evt.location && `• at ${evt.location}`}
                    </div>
                    {evt.description && (
                      <div style={{ fontSize: 12, background: 'var(--bg-subtle, rgba(0,0,0,0.02))', padding: '6px 10px', borderRadius: 6 }}>
                        {evt.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', margin: '30px 0' }}>No timeline events recorded yet.</p>
            )}

            {timelineShipment.quotes && timelineShipment.quotes.length > 0 && (
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Recorded Offline Quotes</h4>
                {timelineShipment.quotes.map((q) => (
                  <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-subtle, rgba(0,0,0,0.02))', borderRadius: 8, marginBottom: 6, fontSize: 12 }}>
                    <div>
                      <strong>{q.currency} {formatPrice(q.quotedAmount)}</strong> — {q.quoteSource}
                      {q.notes && <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{q.notes}</div>}
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: 11 }}>{formatDate(q.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
