import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getQuoteById, sendOffer, acceptOffer, rejectOffer, cancelQuote } from '../../lib/quotes';
import { formatPrice, timeAgo } from '../../lib/format';
import { formatUnitQuantity } from '../../lib/units';
import { useAuth } from '../../contexts/AuthContext';
import { Breadcrumb } from '../../components/Breadcrumb';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import type { QuoteOffer } from '../../types';

/** Seller-side form for sending (or revising, after a rejection) an offer. */
function SendOfferForm({ quoteId, productUnit, onSent }: { quoteId: string; productUnit: string | null; onSent: () => void }) {
  const [quantity, setQuantity] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [additionalFees, setAdditionalFees] = useState('');
  const [notes, setNotes] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!quantity || !pricePerUnit) return;
    setSubmitting(true);
    const result = await sendOffer(quoteId, {
      quantity, pricePerUnit, deliveryFee, additionalFees, notes,
      expiresAt: expiresAt ? `${expiresAt}T00:00:00` : null,
    });
    setSubmitting(false);
    if (result) onSent();
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 12, padding: 16, background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)' }}>
      <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10 }}>Send an Offer</h4>
      <div className="row g-3">
        <div className="col-md-6">
          <label style={{ fontSize: 11 }}>Quantity {productUnit ? `(${productUnit})` : ''} <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ marginBottom: 8 }} />
        </div>
        <div className="col-md-6">
          <label style={{ fontSize: 11 }}>Price per Unit (₦) <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input type="number" min="0" step="0.01" required value={pricePerUnit} onChange={(e) => setPricePerUnit(e.target.value)} style={{ marginBottom: 8 }} />
        </div>
        <div className="col-md-6">
          <label style={{ fontSize: 11 }}>Delivery Fee (₦, optional)</label>
          <input type="number" min="0" step="0.01" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} style={{ marginBottom: 8 }} />
        </div>
        <div className="col-md-6">
          <label style={{ fontSize: 11 }}>Other Fees (₦, optional)</label>
          <input type="number" min="0" step="0.01" value={additionalFees} onChange={(e) => setAdditionalFees(e.target.value)} style={{ marginBottom: 8 }} />
        </div>
      </div>
      <label style={{ fontSize: 11 }}>Offer Expires (optional)</label>
      <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} style={{ marginBottom: 8 }} />
      <label style={{ fontSize: 11 }}>Notes</label>
      <textarea rows={2} placeholder="Terms, delivery timing, specifications..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ marginBottom: 10 }} />
      <button type="submit" className="btn-primary btn-sm btn-inline" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send Offer'}
      </button>
    </form>
  );
}

function OfferRow({ offer, isLatest }: { offer: QuoteOffer; isLatest: boolean }) {
  const expired = offer.expiresAt ? new Date(offer.expiresAt).getTime() < Date.now() : false;
  return (
    <div style={{ padding: 12, background: isLatest ? 'var(--primary-light)' : 'var(--bg-soft)', borderRadius: 'var(--radius-sm)', marginBottom: 10, border: isLatest ? '1px solid var(--primary)' : '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <strong style={{ fontSize: 14 }}>{formatUnitQuantity(offer.quantity, null)} @ {formatPrice(offer.pricePerUnit)}</strong>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(offer.createdAt)}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        Subtotal: {formatPrice(offer.quantity * offer.pricePerUnit)}
        {offer.deliveryFee > 0 && <> · Delivery: {formatPrice(offer.deliveryFee)}</>}
        {offer.additionalFees > 0 && <> · Other fees: {formatPrice(offer.additionalFees)}</>}
      </div>
      <div style={{ fontWeight: 800, fontSize: 15, marginTop: 4 }}>Total: {formatPrice(offer.total)}</div>
      {offer.notes && <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '8px 0 0' }}>{offer.notes}</p>}
      {offer.expiresAt && (
        <div style={{ fontSize: 11, color: expired ? 'var(--danger)' : 'var(--muted)', marginTop: 6 }}>
          <i className="fa-regular fa-clock"></i> {expired ? 'Expired' : 'Expires'} {new Date(offer.expiresAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

export default function QuoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof getQuoteById>>>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  async function reload() {
    if (!id) return;
    const data = await getQuoteById(id);
    setQuote(data);
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!id) { setLoading(false); return; }
      setLoading(true);
      const data = await getQuoteById(id);
      if (active) { setQuote(data); setLoading(false); }
    })();
    return () => { active = false; };
  }, [id]);

  if (loading) return <PageLoadingSpinner message="Loading quote request…" />;

  if (!quote) {
    return (
      <div className="section"><div className="container">
        <div className="empty-cart">
          <i className="fa-solid fa-file-invoice-dollar"></i>
          <p>Quote request not found.</p>
          <Link to="/account/quotes" className="btn-secondary btn-inline btn-sm">Back to My Quotes</Link>
        </div>
      </div></div>
    );
  }

  const isBuyer = !!user && String(user.id) === String(quote.buyerId);
  const isSeller = !!user && String(user.id) === String(quote.sellerId);
  const latestOffer = quote.offers.length > 0 ? quote.offers[quote.offers.length - 1] : null;
  const canSendOffer = isSeller && ['pending', 'offer_sent', 'rejected'].includes(quote.status);
  const canDecide = isBuyer && quote.status === 'offer_sent';
  const canCancel = (isBuyer || isSeller) && quote.status !== 'accepted' && quote.status !== 'cancelled' && quote.status !== 'rejected';

  const STATUS_LABELS: Record<string, string> = {
    pending: 'Awaiting offer', offer_sent: 'Offer sent', accepted: 'Accepted', rejected: 'Rejected', cancelled: 'Cancelled',
  };

  async function handleAccept() {
    setBusy(true);
    const accepted = await acceptOffer(quote!.id);
    setBusy(false);
    if (accepted) navigate('/cart');
  }

  async function handleReject() {
    setBusy(true);
    const result = await rejectOffer(quote!.id);
    setBusy(false);
    if (result) void reload();
  }

  async function handleCancel() {
    if (!quote) return;
    setBusy(true);
    const result = await cancelQuote(quote.id);
    setBusy(false);
    if (result) {
      setCancelOpen(false);
      void reload();
    }
  }

  return (
    <div className="section">
      <div className="container">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'My Account', href: '/account' },
          { label: 'Quote Request' },
        ]} />

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="detail-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="demand-chip"><i className="fa-solid fa-file-invoice-dollar"></i> {STATUS_LABELS[quote.status] || quote.status}</span>
                {canCancel && (
                  <button onClick={() => setCancelOpen(true)} disabled={busy} className="btn-danger btn-sm btn-inline">
                    <i className="fa-solid fa-xmark"></i> Cancel Request
                  </button>
                )}
              </div>
              <h1>
                <Link to={`/shop/product/${quote.productId}`} style={{ color: 'inherit' }}>{quote.productName}</Link>
              </h1>

              <div className="detail-meta">
                <span><i className="fa-solid fa-user"></i> Buyer: {quote.buyerName}</span>
                <span><i className="fa-solid fa-store"></i> Seller: {quote.sellerName}</span>
                <span><i className="fa-regular fa-clock"></i> Requested {timeAgo(quote.createdAt)}</span>
              </div>

              <div className="budget-box">
                <div>
                  <div className="lbl">Requested Quantity</div>
                  <div className="val">{quote.requestedQuantity ? formatUnitQuantity(quote.requestedQuantity, quote.productUnit) : 'Not specified'}</div>
                </div>
                {quote.deliveryLocation && (
                  <div className="qty">
                    <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>Delivery Location</div>
                    <strong>{quote.deliveryLocation}</strong>
                  </div>
                )}
              </div>

              {quote.buyerNotes && (
                <>
                  <div className="detail-section-title">Buyer's Notes</div>
                  <p className="demand-full-description">{quote.buyerNotes}</p>
                </>
              )}

              <div className="detail-section-title">Offer History ({quote.offers.length})</div>
              {quote.offers.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>No offers sent yet.</p>
              ) : (
                [...quote.offers].reverse().map((o) => <OfferRow key={o.id} offer={o} isLatest={o.id === latestOffer?.id} />)
              )}
            </div>
          </div>

          <div className="col-lg-4">
            <div className="respond-card">
              {!user ? (
                <>
                  <h3>Sign in to continue</h3>
                  <Link to="/login" className="btn-primary btn-inline btn-sm"><i className="fa-solid fa-right-to-bracket"></i> Log In</Link>
                </>
              ) : isSeller ? (
                <>
                  <h3>Manage this Request</h3>
                  {quote.status === 'accepted' ? (
                    <p className="sub">The buyer accepted your offer. They'll check out from their cart when ready.</p>
                  ) : quote.status === 'cancelled' ? (
                    <p className="sub">This quote request was cancelled.</p>
                  ) : canSendOffer ? (
                    <>
                      {quote.status === 'rejected' && <p className="sub">The buyer rejected your last offer. You can send a revised one below.</p>}
                      <SendOfferForm quoteId={quote.id} productUnit={quote.productUnit} onSent={() => void reload()} />
                    </>
                  ) : (
                    <p className="sub">Waiting on the buyer's decision.</p>
                  )}
                </>
              ) : isBuyer ? (
                <>
                  <h3>Your Request</h3>
                  {quote.status === 'accepted' ? (
                    <>
                      <p className="sub">You accepted this offer — it's in your cart, locked at the agreed price.</p>
                      <Link to="/cart" className="btn-primary btn-inline btn-sm"><i className="fa-solid fa-cart-shopping"></i> Go to Cart</Link>
                    </>
                  ) : quote.status === 'cancelled' ? (
                    <p className="sub">You cancelled this quote request.</p>
                  ) : quote.status === 'rejected' ? (
                    <p className="sub">You rejected the offer. The seller may send a revised one.</p>
                  ) : canDecide && latestOffer ? (
                    <>
                      <p className="sub">Review the latest offer and accept or reject it.</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleAccept} disabled={busy} className="btn-primary btn-sm btn-inline" style={{ flex: 1 }}>
                          <i className="fa-solid fa-check"></i> Accept
                        </button>
                        <button onClick={handleReject} disabled={busy} className="btn-outline btn-sm btn-inline" style={{ flex: 1 }}>
                          <i className="fa-solid fa-xmark"></i> Reject
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="sub">Waiting on the seller to send an offer.</p>
                  )}
                </>
              ) : (
                <p className="sub">You don't have access to this quote request.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel this quote request?"
        message="The seller will be notified that you're no longer interested. This cannot be undone."
        confirmLabel="Cancel Request"
        destructive
        busy={busy}
        onConfirm={handleCancel}
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  );
}
