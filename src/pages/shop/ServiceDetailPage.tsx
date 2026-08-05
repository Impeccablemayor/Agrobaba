import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getProductById } from '../../lib/products';
import { getCategories, getSectionIdByCode } from '../../lib/categories';
import { createBooking } from '../../lib/bookings';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../lib/toastBus';
import { formatPrice, timeAgo } from '../../lib/format';
import { Breadcrumb } from '../../components/Breadcrumb';

export default function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [bookLocation, setBookLocation] = useState('');
  const [bookMessage, setBookMessage] = useState('');
  const [product, setProduct] = useState<Awaited<ReturnType<typeof getProductById>>>(null);
  const [loading, setLoading] = useState(true);
  const [servicesHref, setServicesHref] = useState('/shop');

  useEffect(() => {
    void getCategories().then((categories) => {
      const id = getSectionIdByCode(categories, 'services');
      if (id) setServicesHref(`/shop?categoryId=${encodeURIComponent(id)}`);
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProduct() {
      if (!id) {
        if (active) setProduct(null);
        if (active) setLoading(false);
        return;
      }

      setLoading(true);
      const data = await getProductById(id);
      if (active) {
        setProduct(data);
        setLoading(false);
      }
    }

    void loadProduct();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="service-detail-layout">
        <div className="empty-cart" style={{ gridColumn: '1/-1' }}>
          <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }}></i>
          <p>Loading service details…</p>
        </div>
      </div>
    );
  }

  if (!product || product.type !== 'service') {
    return (
      <div className="service-detail-layout">
        <div className="empty-cart" style={{ gridColumn: '1/-1' }}>
          <i className="fa-solid fa-toolbox"></i>
          <p>Service not found.</p>
          <Link to={servicesHref} className="btn-secondary btn-inline btn-sm">Browse Services</Link>
        </div>
      </div>
    );
  }

  async function handleBook(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const booking = await createBooking({
      serviceId: product!.id,
      scheduledDate: date,
      serviceLocation: bookLocation,
      customerNotes: bookMessage,
    });
    setSubmitting(false);
    if (booking) {
      navigate(`/messages/${product!.sellerId}?partnerName=${encodeURIComponent(product!.sellerName)}&bookingId=${booking.id}`);
    }
  }

  function handleMessageProvider() {
    if (!user) {
      showToast('Please login to message the provider.', 'warning');
      navigate('/login');
      return;
    }
    navigate(`/messages/${product!.sellerId}?partnerName=${encodeURIComponent(product!.sellerName)}&productId=${product!.id}&productName=${encodeURIComponent(product!.name)}`);
  }

  return (
    <>
      <Breadcrumb items={[
        { label: 'Home', href: '/' },
        { label: 'Shop', href: '/shop' },
        { label: 'Service Details' },
      ]} />
      <div className="service-detail-layout">
      <div className="service-detail-main">
        <div className="sd-header">
          <div className="sd-category">
            <i className="fa-solid fa-hand-holding-medical"></i>
            <span>{product.category}</span>
          </div>
          <h1>{product.name}</h1>
          <div className="sd-meta">
            <span><i className="fa-solid fa-user"></i> {product.sellerName}</span>
            <span><i className="fa-solid fa-location-dot"></i> {product.location || '—'}</span>
            <span><i className="fa-regular fa-clock"></i> {timeAgo(product.createdAt)}</span>
            <span><i className="fa-solid fa-star" style={{ color: 'var(--accent)' }}></i> {product.rating || 0}/5 ({product.reviews || 0} reviews)</span>
          </div>
        </div>

        <div className="provider-card">
          <div className="provider-avatar">
            <i className="fa-solid fa-user-tie"></i>
          </div>
          <div className="provider-info">
            <div className="name">{product.sellerName}</div>
            <div className="role">{product.sellerRole || 'Service Provider'}</div>
          </div>
          {product.verified && (
            <span style={{ marginLeft: 'auto' }} className="verified-chip">
              <i className="fa-solid fa-circle-check"></i> Verified
            </span>
          )}
        </div>

        <div className="service-highlights">
          <span className="service-highlight"><i className="fa-solid fa-clock"></i> {product.size || 'Per session'}</span>
          <span className="service-highlight"><i className="fa-solid fa-location-dot"></i> {product.location || 'Nationwide'}</span>
          <span className="service-highlight"><i className="fa-solid fa-calendar-check"></i> {product.quantity > 0 ? 'Available Now' : 'Contact for schedule'}</span>
        </div>

        <div className="sd-info-grid">
          <div className="sd-info-item">
            <div className="label">Price</div>
            <div className="value price">{formatPrice(product.price)}</div>
          </div>
          <div className="sd-info-item">
            <div className="label">Session / Package</div>
            <div className="value">{product.size || 'Standard'}</div>
          </div>
          <div className="sd-info-item">
            <div className="label">Category</div>
            <div className="value">{product.category}</div>
          </div>
          <div className="sd-info-item">
            <div className="label">Bookings</div>
            <div className="value">{product.sold || 0} bookings</div>
          </div>
        </div>

        <div className="sd-body">
          <h3>About This Service</h3>
          <p>{product.description}</p>
        </div>
      </div>

      <div className="service-detail-sidebar">
        <h3 className="sidebar-title"><i className="fa-solid fa-calendar-check" style={{ color: 'var(--primary)' }}></i> Book This Service</h3>

        {!user ? (
          <div className="login-prompt">
            <p>Please login to book this service.</p>
            <Link to="/login" className="btn-primary btn-sm btn-inline">Login</Link>
            <Link to="/register" className="btn-outline btn-sm btn-inline" style={{ marginTop: 8 }}>Create Account</Link>
          </div>
        ) : (
          <>
            <form className="book-form" onSubmit={handleBook}>
              <div className="form-group">
                <label htmlFor="book-date">Preferred Date</label>
                <input type="date" id="book-date" required value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="book-location">Service Location</label>
                <input
                  type="text" id="book-location" placeholder="Enter your farm/office address"
                  value={bookLocation} onChange={(e) => setBookLocation(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="book-message">Additional Notes</label>
                <textarea
                  id="book-message" placeholder="Describe your needs, preferred time, etc..."
                  value={bookMessage} onChange={(e) => setBookMessage(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-secondary btn-inline w-100" disabled={submitting}>
                <i className="fa-solid fa-paper-plane"></i> {submitting ? 'Sending Request…' : 'Request Booking'}
              </button>
            </form>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12, textAlign: 'center' }}>
              <i className="fa-solid fa-shield-halved" style={{ color: 'var(--primary)' }}></i>
              Agrobaba escrow protects your booking payment.
            </p>
          </>
        )}

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button onClick={handleMessageProvider} className="btn-outline btn-sm btn-inline w-100">
            <i className="fa-regular fa-comments"></i> Message Provider
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
