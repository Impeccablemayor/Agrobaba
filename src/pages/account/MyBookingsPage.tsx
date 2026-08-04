import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getMyBookings, getMyProviderBookings } from '../../lib/bookings';
import { formatDate, formatPrice } from '../../lib/format';
import { Breadcrumb } from '../../components/Breadcrumb';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import type { ServiceBooking } from '../../types';

const STATUS_LABELS: Record<string, string> = {
  requested: 'Awaiting Response',
  accepted: 'Accepted — Awaiting Payment',
  declined: 'Declined',
  paid: 'Paid',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function BookingRow({ booking, otherPartyLabel, onOpen }: { booking: ServiceBooking; otherPartyLabel: string; onOpen: () => void }) {
  const statusColor = ['paid', 'in_progress', 'completed'].includes(booking.status) ? 'delivered' : 'pending';
  const label = booking.status === 'accepted' && booking.paymentSubmitted
    ? 'Payment Submitted — Verifying'
    : STATUS_LABELS[booking.status] || booking.status;
  return (
    <tr style={{ cursor: 'pointer' }} onClick={onOpen}>
      <td style={{ fontWeight: 600 }}>{booking.serviceName}</td>
      <td>{otherPartyLabel}</td>
      <td>{formatDate(booking.scheduledDate)}</td>
      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(booking.quotedAmount)}</td>
      <td><span className={`status-${statusColor}`}>{label}</span></td>
    </tr>
  );
}

export default function MyBookingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myBookings, setMyBookings] = useState<ServiceBooking[]>([]);
  const [providerBookings, setProviderBookings] = useState<ServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const isProvider = user?.role === 'service-provider' || user?.role === 'admin';

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) return;
      setLoading(true);
      const [mine, provider] = await Promise.all([
        getMyBookings(),
        isProvider ? getMyProviderBookings() : Promise.resolve([]),
      ]);
      if (active) {
        setMyBookings(mine);
        setProviderBookings(provider);
        setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [user, isProvider]);

  if (!user) return null;

  function openChat(booking: ServiceBooking, partnerId: string, partnerName: string) {
    navigate(`/messages/${partnerId}?partnerName=${encodeURIComponent(partnerName)}&bookingId=${booking.id}`);
  }

  return (
    <div className="section">
      <div className="container">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'My Account', href: '/account' }, { label: 'My Bookings' }]} />

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>My Bookings</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Services you've requested{isProvider ? ', and booking requests for your own services' : ''}.</p>
        </div>

        {loading ? (
          <PageLoadingSpinner message="Loading your bookings…" />
        ) : (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Bookings I've Requested</h3>
            {myBookings.length === 0 ? (
              <div className="empty-cart" style={{ marginBottom: 28 }}>
                <i className="fa-solid fa-calendar-check"></i>
                <p>You haven't requested any service bookings yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', marginBottom: 28 }}>
                <table className="orders-table">
                  <thead><tr><th>Service</th><th>Provider</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {myBookings.map((b) => (
                      <BookingRow key={b.id} booking={b} otherPartyLabel={b.providerName} onOpen={() => openChat(b, b.providerId, b.providerName)} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {isProvider && (
              <>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Booking Requests for My Services</h3>
                {providerBookings.length === 0 ? (
                  <div className="empty-cart">
                    <i className="fa-solid fa-inbox"></i>
                    <p>No one has requested a booking yet.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="orders-table">
                      <thead><tr><th>Service</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                      <tbody>
                        {providerBookings.map((b) => (
                          <BookingRow key={b.id} booking={b} otherPartyLabel={b.customerName} onOpen={() => openChat(b, b.customerId, b.customerName)} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
