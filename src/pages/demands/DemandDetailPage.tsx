import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getDemandById, respondToDemand, deleteDemand, acceptDemandResponse } from '../../lib/demands';
import { getMyProducts } from '../../lib/products';
import { formatPrice, timeAgo, roleLabel } from '../../lib/format';
import { useAuth } from '../../contexts/AuthContext';
import { Breadcrumb } from '../../components/Breadcrumb';
import type { DemandResponse, Product } from '../../types';

/** Inline quantity + delivery-details form for accepting one response - opens on demand, submits
 *  via acceptDemandResponse (which delegates to the same order-creation pipeline checkout uses). */
function AcceptResponseForm({ demandId, response, onAccepted }: { demandId: string; response: DemandResponse; onAccepted: () => void }) {
  const [quantity, setQuantity] = useState('1');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleAccept(e: FormEvent) {
    e.preventDefault();
    if (!address.trim() || !phone.trim()) return;
    setSubmitting(true);
    const order = await acceptDemandResponse(demandId, response.id, { quantity, address, phone });
    setSubmitting(false);
    if (order) onAccepted();
  }

  return (
    <form onSubmit={handleAccept} style={{ marginTop: 10, padding: 10, background: 'var(--bg-soft, #f5f6f3)', borderRadius: 'var(--radius-sm)' }}>
      <label style={{ fontSize: 11 }}>Quantity</label>
      <input type="number" min="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ marginBottom: 6 }} />
      <label style={{ fontSize: 11 }}>Delivery Address</label>
      <input type="text" required placeholder="Where should this be delivered?" value={address} onChange={(e) => setAddress(e.target.value)} style={{ marginBottom: 6 }} />
      <label style={{ fontSize: 11 }}>Phone</label>
      <input type="tel" required placeholder="Contact number" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ marginBottom: 8 }} />
      <button type="submit" className="btn-primary btn-sm btn-inline" disabled={submitting}>
        {submitting ? 'Placing order…' : 'Confirm & Place Order'}
      </button>
    </form>
  );
}

function ResponseCard({ demandId, response, canAccept, onAccepted }: { demandId: string; response: DemandResponse; canAccept: boolean; onAccepted: () => void }) {
  const [accepting, setAccepting] = useState(false);

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong style={{ fontSize: 13 }}>{response.responderName}</strong>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(response.createdAt)}</span>
      </div>
      {response.productName && (
        <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, margin: '4px 0' }}>
          <i className="fa-solid fa-tag"></i> {response.productName} — {formatPrice(response.productPrice || 0)}
        </div>
      )}
      <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '4px 0' }}>{response.message}</p>

      {response.accepted ? (
        <div style={{ fontSize: 11.5, color: 'var(--primary)', fontWeight: 600 }}>
          <i className="fa-solid fa-circle-check"></i> Accepted — order placed
        </div>
      ) : canAccept ? (
        accepting ? (
          <AcceptResponseForm demandId={demandId} response={response} onAccepted={onAccepted} />
        ) : (
          <button className="btn-outline btn-sm btn-inline" style={{ padding: '4px 10px', fontSize: 11.5 }} onClick={() => setAccepting(true)}>
            <i className="fa-solid fa-check"></i> Accept & Order
          </button>
        )
      ) : null}
    </div>
  );
}

export default function DemandDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [productId, setProductId] = useState('');
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [demand, setDemand] = useState<Awaited<ReturnType<typeof getDemandById>>>(null);
  const [loading, setLoading] = useState(true);

  async function reloadDemand() {
    if (!id) return;
    const data = await getDemandById(id);
    setDemand(data);
  }

  useEffect(() => {
    let active = true;

    async function loadDemand() {
      if (!id) {
        if (active) setDemand(null);
        if (active) setLoading(false);
        return;
      }

      setLoading(true);
      const data = await getDemandById(id);
      if (active) {
        setDemand(data);
        setLoading(false);
      }
    }

    void loadDemand();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    if (!user || user.role === 'buyer') { setMyProducts([]); return; }
    void (async () => {
      const products = await getMyProducts();
      if (active) setMyProducts(products.filter((p) => p.status === 'active'));
    })();
    return () => { active = false; };
  }, [user]);

  if (loading) {
    return (
      <div className="section"><div className="container">
        <div className="empty-cart">
          <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }}></i>
          <p>Loading demand details…</p>
        </div>
      </div></div>
    );
  }

  if (!demand) {
    return (
      <div className="section"><div className="container">
        <div className="empty-cart">
          <i className="fa-solid fa-clipboard-list"></i>
          <p>Demand not found.</p>
          <Link to="/demands" className="btn-secondary btn-inline btn-sm">Back to Demand Board</Link>
        </div>
      </div></div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message || !productId) return;
    const ok = await respondToDemand(demand!.id, { message, price, productId });
    if (ok) {
      setPrice('');
      setMessage('');
      setProductId('');
      navigate('/messages');
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this demand? This cannot be undone.')) return;
    const ok = await deleteDemand(demand!.id);
    if (ok) navigate('/demands');
  }

  return (
    <div className="section">
      <div className="container">
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Demand Board', href: '/demands' },
          { label: 'Demand Details' },
        ]} />

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="detail-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="demand-chip"><i className="fa-solid fa-clipboard-list"></i> {demand.category}</span>
                {user?.role === 'admin' && (
                  <button onClick={handleDelete} className="btn-danger btn-sm btn-inline">
                    <i className="fa-solid fa-trash"></i> Delete (Admin)
                  </button>
                )}
              </div>
              <h1>{demand.title}</h1>

              <div className="detail-meta">
                {demand.buyerRole && <span><i className="fa-solid fa-user"></i> Demand by {roleLabel(demand.buyerRole)}</span>}
                <span><i className="fa-solid fa-location-dot"></i> {demand.location}</span>
                <span><i className="fa-regular fa-clock"></i> Posted {timeAgo(demand.createdAt)}</span>
                <span><i className="fa-solid fa-reply"></i> {demand.responses ? demand.responses.length : 0} responses</span>
              </div>

              <div className="budget-box">
                <div>
                  <div className="lbl">Buyer's Budget</div>
                  <div className="val">{formatPrice(demand.budget)}</div>
                </div>
                <div className="qty">
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>
                    Quantity Needed
                  </div>
                  <strong>{demand.quantity}</strong>
                </div>
              </div>

              <div className="detail-section-title">Full Details</div>
              <p className="demand-full-description">{demand.description}</p>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="respond-card">
              {!user ? (
                <>
                  <h3>Respond to this demand</h3>
                  <p className="sub">Log in to send the buyer your offer.</p>
                  <Link to="/login" className="btn-primary btn-inline btn-sm"><i className="fa-solid fa-right-to-bracket"></i> Log In</Link>
                </>
              ) : String(user.id) === String(demand.buyerId) ? (
                // demand.buyerId arrives as a raw JSON number (Jackson-serialized Long) while
                // user.id is a string - a bare === here silently never matches the demand's own
                // owner, so String() both sides.
                <>
                  <h3>Responses ({demand.responses ? demand.responses.length : 0})</h3>
                  {!demand.responses || demand.responses.length === 0 ? (
                    <p className="sub">This is your own demand — you can't respond to it. You'll see offers from sellers here as they come in.</p>
                  ) : (
                    <div>
                      {demand.responses.map((r) => (
                        <ResponseCard
                          key={r.id}
                          demandId={demand.id}
                          response={r}
                          canAccept={demand.status === 'open'}
                          onAccepted={() => { void reloadDemand(); }}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : user.role === 'buyer' ? (
                <>
                  <h3>Respond to this demand</h3>
                  <p className="sub">Buyers can't respond to demands — only farmers, dealers, and service-providers can. You can post your own demand instead.</p>
                  <Link to="/demands/new" className="btn-primary btn-inline btn-sm"><i className="fa-solid fa-pen"></i> Post a Demand</Link>
                </>
              ) : (
                <>
                  <h3>Respond to this demand</h3>
                  {myProducts.length === 0 ? (
                    <>
                      <p className="sub">You need an active listing to respond to a demand — post one first, then come back to offer it here.</p>
                      <Link to="/account/post-listing" className="btn-primary btn-inline btn-sm"><i className="fa-solid fa-plus"></i> Post a Listing</Link>
                    </>
                  ) : (
                    <>
                      <p className="sub">Offer one of your listings to fulfil this demand. This opens a direct conversation with the buyer.</p>

                      <form onSubmit={handleSubmit}>
                        <label htmlFor="respond-product">Your Listing <span style={{ color: '#e74c3c' }}>*</span></label>
                        <select id="respond-product" required value={productId} onChange={(e) => setProductId(e.target.value)}>
                          <option value="">Select a listing…</option>
                          {myProducts.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} — {p.negotiated ? 'negotiable' : formatPrice(p.price ?? 0)}</option>
                          ))}
                        </select>

                        <label htmlFor="respond-price">Note on Price (optional, ₦)</label>
                        <input
                          type="number" id="respond-price" min="0" placeholder="e.g. 850000"
                          value={price} onChange={(e) => setPrice(e.target.value)}
                        />

                        <label htmlFor="respond-message">Message <span style={{ color: '#e74c3c' }}>*</span></label>
                        <textarea
                          id="respond-message" required
                          placeholder="Introduce yourself, your quality, and delivery terms..."
                          value={message} onChange={(e) => setMessage(e.target.value)}
                        />

                        <button type="submit" className="btn-primary btn-inline">
                          <i className="fa-solid fa-paper-plane"></i> Send Response
                        </button>
                      </form>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
