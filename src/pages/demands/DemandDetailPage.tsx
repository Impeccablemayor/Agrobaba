import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getDemandById, respondToDemand } from '../../lib/demands';
import { formatPrice, timeAgo, roleLabel } from '../../lib/format';
import { useAuth } from '../../contexts/AuthContext';

export default function DemandDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [demand, setDemand] = useState<Awaited<ReturnType<typeof getDemandById>>>(null);
  const [loading, setLoading] = useState(true);

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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message) return;

    respondToDemand(demand!.id, { message, price });
    setPrice('');
    setMessage('');
    navigate('/messages');
  }

  return (
    <div className="section">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/demands">Demand Board</Link></li>
            <li className="breadcrumb-item active">Demand Details</li>
          </ol>
        </nav>

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="detail-card">
              <span className="demand-chip"><i className="fa-solid fa-clipboard-list"></i> {demand.category}</span>
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
              ) : user.role === 'buyer' ? (
                <>
                  <h3>Respond to this demand</h3>
                  <p className="sub">Buyers can't respond to demands — only farmers, dealers, and service-providers can. You can post your own demand instead.</p>
                  <Link to="/demands/new" className="btn-primary btn-inline btn-sm"><i className="fa-solid fa-pen"></i> Post a Demand</Link>
                </>
              ) : user.id === demand.buyerId ? (
                <>
                  <h3>Respond to this demand</h3>
                  <p className="sub">This is your own demand — you can't respond to it. You'll see offers from sellers here as they come in.</p>
                </>
              ) : (
                <>
                  <h3>Respond to this demand</h3>
                  <p className="sub">Send the buyer your offer. This opens a direct conversation with them.</p>

                  <form onSubmit={handleSubmit}>
                    <label htmlFor="respond-price">Your Offer Price (₦)</label>
                    <input
                      type="number" id="respond-price" min="0" placeholder="e.g. 850000"
                      value={price} onChange={(e) => setPrice(e.target.value)}
                    />

                    <label htmlFor="respond-message">Message <span style={{ color: '#e74c3c' }}>*</span></label>
                    <textarea
                      id="respond-message" required
                      placeholder="Introduce yourself, your price, quality, and delivery terms..."
                      value={message} onChange={(e) => setMessage(e.target.value)}
                    />

                    <button type="submit" className="btn-primary btn-inline">
                      <i className="fa-solid fa-paper-plane"></i> Send Response
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
