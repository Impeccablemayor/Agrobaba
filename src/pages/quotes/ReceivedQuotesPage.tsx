import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReceivedQuotes } from '../../lib/quotes';
import { formatPrice, timeAgo } from '../../lib/format';
import { formatUnitQuantity } from '../../lib/units';
import { Breadcrumb } from '../../components/Breadcrumb';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import type { QuoteRequest } from '../../types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Needs an offer', offer_sent: 'Offer sent', accepted: 'Accepted', rejected: 'Rejected', cancelled: 'Cancelled',
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--danger)', offer_sent: 'var(--accent)', accepted: 'var(--primary)', rejected: 'var(--muted)', cancelled: 'var(--muted)',
};

export default function ReceivedQuotesPage() {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      const data = await getReceivedQuotes();
      if (active) { setQuotes(data); setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const needsOfferCount = quotes.filter((q) => q.status === 'pending' || q.status === 'rejected').length;
  const acceptedCount = quotes.filter((q) => q.status === 'accepted').length;

  const stats = [
    { icon: 'fa-file-invoice-dollar', label: 'Total Requests', value: quotes.length, color: 'var(--primary)' },
    { icon: 'fa-hourglass-half', label: 'Needs an Offer', value: needsOfferCount, color: 'var(--danger)' },
    { icon: 'fa-circle-check', label: 'Accepted', value: acceptedCount, color: 'var(--success)' },
  ];

  return (
    <div className="section">
      <div className="container">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'My Account', href: '/account' }, { label: 'Quote Requests Received' }]} />

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Quote Requests</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Buyers requesting quotes on your negotiated listings.</p>
        </div>

        {loading ? (
          <PageLoadingSpinner message="Loading quote requests…" />
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

          {quotes.length === 0 ? (
            <div className="empty-cart">
              <i className="fa-solid fa-file-invoice-dollar"></i>
              <p>No quote requests yet. Mark a listing as "requires negotiation" to start receiving them.</p>
              <Link to="/account/post-listing" className="btn-primary btn-inline btn-sm"><i className="fa-solid fa-plus"></i> Post a Listing</Link>
            </div>
          ) : (
            <div className="demand-grid">
              {quotes.map((q) => {
                const latest = q.offers.length > 0 ? q.offers[q.offers.length - 1] : null;
                return (
                  <Link to={`/account/quotes/${q.id}`} key={q.id} className="demand-card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                    <div className="demand-tag" style={{ color: STATUS_COLORS[q.status] }}>
                      <i className="fa-solid fa-file-invoice-dollar"></i> {STATUS_LABELS[q.status] || q.status}
                    </div>
                    <h4>{q.productName}</h4>
                    <p>From {q.buyerName}</p>
                    <div className="demand-footer">
                      <div>
                        <div className="demand-budget">{latest ? formatPrice(latest.total) : 'No offer sent'}</div>
                        <div className="demand-meta">
                          {q.requestedQuantity ? formatUnitQuantity(q.requestedQuantity, q.productUnit) : 'Quantity not specified'} &middot; {timeAgo(q.createdAt)}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
