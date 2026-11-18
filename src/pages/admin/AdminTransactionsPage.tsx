import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdminBookings, useAdminQuotes } from '../../hooks/queries/useAdmin';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { formatDate, formatPrice } from '../../lib/format';
import type { AdminBooking, AdminBookingStatus, AdminQuote, AdminQuoteStatus } from '../../lib/adminCommerce';

/** Read-only oversight of service bookings and product quote requests. Restored from the
 *  partner's marketplace-listing-flows branch (lost from main); admins observe, they never act on
 *  behalf of customers/providers here. Route is already behind RoleProtectedRoute role="admin". */

type TransactionTab = 'bookings' | 'quotes';
const BOOKING_STATUSES: AdminBookingStatus[] = ['requested', 'quote_sent', 'quote_rejected', 'accepted', 'declined', 'paid', 'in_progress', 'completed', 'cancelled'];
const QUOTE_STATUSES: AdminQuoteStatus[] = ['pending', 'offer_sent', 'accepted', 'rejected', 'cancelled'];

function label(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status: string) {
  if (status === 'completed' || status === 'accepted' || status === 'paid') return 'chip-success';
  if (status === 'declined' || status === 'rejected' || status === 'cancelled') return 'chip-danger';
  if (status === 'requested' || status === 'pending' || status === 'quote_rejected') return 'chip-pending';
  return 'chip-info';
}

const money = (value: number | null) => (value == null ? 'On request' : formatPrice(value));

export default function AdminTransactionsPage() {
  const [params, setParams] = useSearchParams();
  const tab: TransactionTab = params.get('tab') === 'quotes' ? 'quotes' : 'bookings';
  const page = Math.max(0, Number(params.get('page')) || 0);
  const status = params.get('status') || 'all';
  const search = params.get('search') || '';
  const [searchInput, setSearchInput] = useState(search);
  const [bookingDetail, setBookingDetail] = useState<AdminBooking | null>(null);
  const [quoteDetail, setQuoteDetail] = useState<AdminQuote | null>(null);
  const bookingQuery = useAdminBookings({ page, size: 20, status: status as AdminBookingStatus | 'all', search }, tab === 'bookings');
  const quoteQuery = useAdminQuotes({ page, size: 20, status: status as AdminQuoteStatus | 'all', search }, tab === 'quotes');
  const query = tab === 'bookings' ? bookingQuery : quoteQuery;

  useEffect(() => setSearchInput(search), [search]);

  function updateParam(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (!value || value === 'all' || (key === 'page' && value === '0')) next.delete(key); else next.set(key, value);
      if (key !== 'page') next.delete('page');
      if (key === 'tab') next.delete('status');
      return next;
    });
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    updateParam('search', searchInput.trim());
  }

  const statuses = tab === 'bookings' ? BOOKING_STATUSES : QUOTE_STATUSES;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Bookings &amp; Quotes</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Read-only oversight of service bookings and negotiated product requests.</p>
      </div>

      <div className="status-tabs">
        <button className={`status-tab ${tab === 'bookings' ? 'active' : ''}`} onClick={() => updateParam('tab', 'bookings')}>Service bookings</button>
        <button className={`status-tab ${tab === 'quotes' ? 'active' : ''}`} onClick={() => updateParam('tab', 'quotes')}>Product quotes</button>
      </div>

      <div className="admin-filters-row">
        <form onSubmit={submitSearch} style={{ display: 'flex', gap: 8, flex: '1 1 300px' }}>
          <input
            aria-label="Search transactions" type="search" value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={tab === 'bookings' ? 'Search service, customer, provider or location…' : 'Search product, buyer, seller or location…'}
            style={{ minWidth: 0, flex: 1 }}
          />
          <button className="btn-outline btn-sm btn-inline" type="submit">Search</button>
        </form>
        <select aria-label="Transaction status" value={status} onChange={(event) => updateParam('status', event.target.value)}>
          <option value="all">All statuses</option>
          {statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}
        </select>
      </div>

      {query.isLoading ? (
        <PageLoadingSpinner message={`Loading ${tab}…`} />
      ) : query.isError ? (
        <div className="empty-cart"><i className="fa-solid fa-triangle-exclamation"></i><p>{query.error instanceof Error ? query.error.message : 'Unable to load transactions.'}</p></div>
      ) : tab === 'bookings' ? (
        <BookingTable bookings={bookingQuery.data?.content || []} onSelect={setBookingDetail} />
      ) : (
        <QuoteTable quotes={quoteQuery.data?.content || []} onSelect={setQuoteDetail} />
      )}

      {query.data && query.data.content.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
          <button className="btn-outline btn-sm btn-inline" disabled={query.data.first || query.isFetching} onClick={() => updateParam('page', String(page - 1))}>Previous</button>
          <span>Page {query.data.number + 1} of {Math.max(query.data.totalPages, 1)} · {query.data.totalElements} records</span>
          <button className="btn-outline btn-sm btn-inline" disabled={query.data.last || query.isFetching} onClick={() => updateParam('page', String(page + 1))}>Next</button>
        </div>
      )}

      {bookingDetail && <BookingDrawer booking={bookingDetail} onClose={() => setBookingDetail(null)} />}
      {quoteDetail && <QuoteDrawer quote={quoteDetail} onClose={() => setQuoteDetail(null)} />}
    </div>
  );
}

function BookingTable({ bookings, onSelect }: { bookings: AdminBooking[]; onSelect: (booking: AdminBooking) => void }) {
  if (bookings.length === 0) return <div className="empty-cart"><i className="fa-solid fa-calendar-check"></i><p>No service bookings match this view.</p></div>;
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>Service</th><th>Customer</th><th>Provider</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} onClick={() => onSelect(booking)} style={{ cursor: 'pointer' }}>
              <td style={{ fontWeight: 700 }}>{booking.serviceName || '—'}</td>
              <td>{booking.customerName || '—'}</td>
              <td>{booking.providerName || '—'}</td>
              <td>{booking.scheduledDate || 'Not set'}</td>
              <td>{money(booking.quotedAmount)}</td>
              <td><span className={`chip ${statusClass(booking.status)}`}>{label(booking.status)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QuoteTable({ quotes, onSelect }: { quotes: AdminQuote[]; onSelect: (quote: AdminQuote) => void }) {
  if (quotes.length === 0) return <div className="empty-cart"><i className="fa-solid fa-file-invoice-dollar"></i><p>No product quotes match this view.</p></div>;
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>Product</th><th>Buyer</th><th>Seller</th><th>Quantity</th><th>Location</th><th>Status</th><th>Created</th></tr></thead>
        <tbody>
          {quotes.map((quote) => (
            <tr key={quote.id} onClick={() => onSelect(quote)} style={{ cursor: 'pointer' }}>
              <td style={{ fontWeight: 700 }}>{quote.productName || '—'}</td>
              <td>{quote.buyerName || '—'}</td>
              <td>{quote.sellerName || '—'}</td>
              <td>{quote.requestedQuantity ?? 'Not specified'}</td>
              <td>{quote.deliveryLocation || 'Not specified'}</td>
              <td><span className={`chip ${statusClass(quote.status)}`}>{label(quote.status)}</span></td>
              <td>{formatDate(quote.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Drawer({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="admin-drawer-overlay" onClick={onClose}>
      <div className="admin-drawer" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="admin-drawer-hdr">
          <div><h3>{title}</h3><p>{subtitle}</p></div>
          <button className="admin-drawer-close" aria-label="Close details" onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function BookingDrawer({ booking, onClose }: { booking: AdminBooking; onClose: () => void }) {
  return (
    <Drawer title={`Booking #${booking.id}`} subtitle={booking.serviceName || ''} onClose={onClose}>
      <div className="admin-drawer-section">
        <h4>Parties</h4>
        <p><strong>Customer:</strong> {booking.customerName || '—'}</p>
        <p><strong>Provider:</strong> {booking.providerName || '—'}</p>
      </div>
      <div className="admin-drawer-section">
        <h4>Terms</h4>
        <p><strong>Scheduled date:</strong> {booking.scheduledDate || 'Not set'}</p>
        <p><strong>Location:</strong> {booking.serviceLocation || 'Not specified'}</p>
        <p><strong>Amount:</strong> {money(booking.quotedAmount)}</p>
        <p><strong>Engagement:</strong> {booking.engagementMethod ? label(booking.engagementMethod) : 'Legacy/unspecified'}</p>
        {booking.serviceId && <Link className="btn-outline btn-sm btn-inline" to={`/shop/service/${booking.serviceId}`} target="_blank" rel="noreferrer">View service</Link>}
      </div>
      <div className="admin-drawer-section">
        <h4>State</h4>
        <p><span className={`chip ${statusClass(booking.status)}`}>{label(booking.status)}</span></p>
        <p><strong>Requested:</strong> {formatDate(booking.createdAt)}</p>
        {booking.updatedAt && <p><strong>Last updated:</strong> {formatDate(booking.updatedAt)}</p>}
      </div>
      <div className="onboard-note"><i className="fa-solid fa-shield-halved"></i><span>Admin oversight is read-only. Customer and provider actions remain authoritative.</span></div>
    </Drawer>
  );
}

function QuoteDrawer({ quote, onClose }: { quote: AdminQuote; onClose: () => void }) {
  return (
    <Drawer title={`Quote request #${quote.id}`} subtitle={quote.productName || ''} onClose={onClose}>
      <div className="admin-drawer-section">
        <h4>Parties</h4>
        <p><strong>Buyer:</strong> {quote.buyerName || '—'}</p>
        <p><strong>Seller:</strong> {quote.sellerName || '—'}</p>
      </div>
      <div className="admin-drawer-section">
        <h4>Request</h4>
        <p><strong>Quantity:</strong> {quote.requestedQuantity ?? 'Not specified'}</p>
        <p><strong>Delivery:</strong> {quote.deliveryLocation || 'Not specified'}</p>
        {quote.productId && <Link className="btn-outline btn-sm btn-inline" to={`/shop/product/${quote.productId}`} target="_blank" rel="noreferrer">View product</Link>}
      </div>
      <div className="admin-drawer-section">
        <h4>State</h4>
        <p><span className={`chip ${statusClass(quote.status)}`}>{label(quote.status)}</span></p>
        <p><strong>Created:</strong> {formatDate(quote.createdAt)}</p>
        {quote.updatedAt && <p><strong>Last updated:</strong> {formatDate(quote.updatedAt)}</p>}
      </div>
      <div className="onboard-note"><i className="fa-solid fa-shield-halved"></i><span>Accepted pricing remains authoritative in the accepted-quote snapshot and resulting order.</span></div>
    </Drawer>
  );
}
