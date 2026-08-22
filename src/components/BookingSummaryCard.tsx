import { useState } from 'react';
import {
  acceptBooking, cancelBooking, confirmBookingPayment, declineBooking, updateBookingStatus, verifyBookingPayment,
} from '../lib/bookings';
import { formatPrice, formatDate } from '../lib/format';
import { ConfirmDialog } from './ConfirmDialog';
import type { ServiceBooking } from '../types';

const STATUS_LABELS: Record<string, string> = {
  requested: 'Awaiting Response',
  accepted: 'Accepted — Awaiting Payment',
  declined: 'Declined',
  paid: 'Paid',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function statusLabel(booking: ServiceBooking): string {
  if (booking.status === 'accepted' && booking.paymentSubmitted) return 'Payment Submitted — Verifying';
  return STATUS_LABELS[booking.status] || booking.status;
}

const STATUS_COLORS: Record<string, string> = {
  requested: 'pending',
  accepted: 'pending',
  declined: 'pending',
  paid: 'delivered',
  in_progress: 'delivered',
  completed: 'delivered',
  cancelled: 'pending',
};

interface Props {
  booking: ServiceBooking;
  currentUserId: string;
  onUpdated: (booking: ServiceBooking) => void;
}

export function BookingSummaryCard({ booking, currentUserId, onUpdated }: Props) {
  const isProvider = booking.providerId === currentUserId;
  const isCustomer = booking.customerId === currentUserId;
  const [showPayForm, setShowPayForm] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [paymentDate, setPaymentDate] = useState('');
  const [transactionNumber, setTransactionNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  async function handleAccept() {
    setBusy(true);
    const result = await acceptBooking(booking.id);
    setBusy(false);
    if (result) onUpdated(result);
  }

  async function handleDecline() {
    setBusy(true);
    const result = await declineBooking(booking.id, declineReason);
    setBusy(false);
    if (result) { onUpdated(result); setShowDeclineForm(false); }
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await confirmBookingPayment(booking.id, {
      paymentMode, paymentDate, transactionNumber, amount: booking.quotedAmount,
    });
    setBusy(false);
    if (result) { onUpdated(result); setShowPayForm(false); }
  }

  async function handleStatus(status: 'in_progress' | 'completed') {
    setBusy(true);
    const result = await updateBookingStatus(booking.id, status);
    setBusy(false);
    if (result) onUpdated(result);
  }

  async function handleVerifyPayment() {
    setBusy(true);
    const result = await verifyBookingPayment(booking.id);
    setBusy(false);
    if (result) onUpdated(result);
  }

  async function handleCancel() {
    setBusy(true);
    const result = await cancelBooking(booking.id);
    setBusy(false);
    if (result) {
      setCancelOpen(false);
      onUpdated(result);
    }
  }

  return (
    <div className="chat-context" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>
            <i className="fa-solid fa-calendar-check"></i> Booking: {booking.serviceName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            <i className="fa-regular fa-clock"></i> {formatDate(booking.scheduledDate)}
            {booking.serviceLocation && <> &middot; <i className="fa-solid fa-location-dot"></i> {booking.serviceLocation}</>}
          </div>
          {booking.customerNotes && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>"{booking.customerNotes}"</div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatPrice(booking.quotedAmount)}</div>
          <span className={`status-${STATUS_COLORS[booking.status]}`} style={{ fontSize: 11 }}>
            {statusLabel(booking)}
          </span>
        </div>
      </div>

      {booking.status === 'declined' && booking.declineReason && (
        <p style={{ fontSize: 12, color: 'var(--danger)', margin: 0 }}>Reason: {booking.declineReason}</p>
      )}

      {isCustomer && (booking.providerContact || booking.providerEmail) && (
        <div style={{ background: 'var(--primary-light)', border: '1px solid #c8e6d4', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
          <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>
            <i className="fa-solid fa-circle-check"></i> Booking accepted — provider contact details
          </div>
          {booking.providerContact && <div><i className="fa-solid fa-phone" style={{ width: 14 }}></i> {booking.providerContact}</div>}
          {booking.providerEmail && <div><i className="fa-solid fa-envelope" style={{ width: 14 }}></i> {booking.providerEmail}</div>}
        </div>
      )}

      {isProvider && (booking.customerContact || booking.customerEmail) && (
        <div style={{ background: 'var(--primary-light)', border: '1px solid #c8e6d4', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
          <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>
            <i className="fa-solid fa-circle-check"></i> Customer contact details
          </div>
          {booking.customerContact && <div><i className="fa-solid fa-phone" style={{ width: 14 }}></i> {booking.customerContact}</div>}
          {booking.customerEmail && <div><i className="fa-solid fa-envelope" style={{ width: 14 }}></i> {booking.customerEmail}</div>}
        </div>
      )}

      {isProvider && booking.status === 'requested' && !showDeclineForm && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleAccept} disabled={busy} className="btn-primary btn-sm btn-inline">
            <i className="fa-solid fa-check"></i> Accept
          </button>
          <button onClick={() => setShowDeclineForm(true)} disabled={busy} className="btn-danger btn-sm btn-inline">
            <i className="fa-solid fa-xmark"></i> Decline
          </button>
        </div>
      )}

      {isProvider && showDeclineForm && (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text" placeholder="Reason (optional)" value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            style={{ flex: 1, border: '1.5px solid var(--border-mid)', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}
          />
          <button onClick={handleDecline} disabled={busy} className="btn-danger btn-sm btn-inline">Confirm Decline</button>
          <button onClick={() => setShowDeclineForm(false)} className="btn-outline btn-sm btn-inline">Cancel</button>
        </div>
      )}

      {isCustomer && booking.status === 'accepted' && booking.paymentSubmitted && (
        <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
          <i className="fa-regular fa-clock"></i> Payment details submitted — waiting for the provider to verify and start work.
        </p>
      )}

      {isCustomer && booking.status === 'accepted' && !booking.paymentSubmitted && !showPayForm && (
        <button onClick={() => setShowPayForm(true)} className="btn-primary btn-sm btn-inline">
          <i className="fa-solid fa-lock"></i> Pay for Booking
        </button>
      )}

      {isProvider && booking.status === 'accepted' && booking.paymentSubmitted && (
        <button onClick={handleVerifyPayment} disabled={busy} className="btn-primary btn-sm btn-inline">
          <i className="fa-solid fa-check"></i> Confirm Payment Received
        </button>
      )}

      {isCustomer && !booking.paymentSubmitted && showPayForm && (
        <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
          <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} style={{ border: '1.5px solid var(--border-mid)', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
            <option>Bank Transfer</option>
            <option>USSD Transfer</option>
            <option>Cash Deposit</option>
            <option>Mobile Money</option>
          </select>
          <input type="date" required value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} style={{ border: '1.5px solid var(--border-mid)', borderRadius: 6, padding: '6px 10px', fontSize: 12 }} />
          <input type="text" required placeholder="Transaction reference" value={transactionNumber} onChange={(e) => setTransactionNumber(e.target.value)} style={{ border: '1.5px solid var(--border-mid)', borderRadius: 6, padding: '6px 10px', fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={busy} className="btn-primary btn-sm btn-inline">Confirm Payment ({formatPrice(booking.quotedAmount)})</button>
            <button type="button" onClick={() => setShowPayForm(false)} className="btn-outline btn-sm btn-inline">Cancel</button>
          </div>
        </form>
      )}

      {isProvider && booking.status === 'paid' && (
        <button onClick={() => handleStatus('in_progress')} disabled={busy} className="btn-primary btn-sm btn-inline">
          <i className="fa-solid fa-play"></i> Mark In Progress
        </button>
      )}

      {isProvider && booking.status === 'in_progress' && (
        <button onClick={() => handleStatus('completed')} disabled={busy} className="btn-primary btn-sm btn-inline">
          <i className="fa-solid fa-flag-checkered"></i> Mark Completed
        </button>
      )}

      {(isProvider || isCustomer) && ['requested', 'accepted'].includes(booking.status) && (
        <button onClick={() => setCancelOpen(true)} disabled={busy} className="btn-outline btn-sm btn-inline" style={{ alignSelf: 'flex-start' }}>
          Cancel Booking
        </button>
      )}

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel this booking?"
        message={`The booking for "${booking.serviceName}" on ${formatDate(booking.scheduledDate)} will be cancelled for both parties.`}
        confirmLabel="Cancel Booking"
        destructive
        busy={busy}
        onConfirm={handleCancel}
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  );
}
