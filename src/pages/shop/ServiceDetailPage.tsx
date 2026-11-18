import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProduct, useServiceListing } from '../../hooks/queries/useProducts';
import { OptimizedImage } from '../../components/common/OptimizedImage';
import { useCategories } from '../../hooks/queries/useCategories';
import { getSectionIdByCode } from '../../lib/categories';
import { createBooking } from '../../lib/bookings';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../lib/toastBus';
import { formatPrice, timeAgo } from '../../lib/format';
import { Breadcrumb } from '../../components/Breadcrumb';

export default function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, phase, renewSession } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const isLive = () => phaseRef.current === 'live';
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [bookLocation, setBookLocation] = useState('');
  const [bookMessage, setBookMessage] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  /** Answers to the provider's questions, keyed by requirement id (+ `${id}_other`). */
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data: product, isLoading: loading } = useProduct(id);
  const { data: serviceListing } = useServiceListing(id, product?.type === 'service');
  const { data: categories = [] } = useCategories();

  const servicesCatId = getSectionIdByCode(categories, 'services');
  const servicesHref = servicesCatId ? `/shop?categoryId=${encodeURIComponent(servicesCatId)}` : '/shop';

  if (loading && !product) {
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

  // A provider can't book or message their own service (backend rejects self-booking too).
  const isOwner = Boolean(user && String(user.id) === String(product.sellerId));
  const galleryImages = (serviceListing?.gallery ?? []).filter((m) => m.type === 'image').map((m) => m.url);
  const serviceImages = galleryImages.length ? galleryImages : product.image ? [product.image] : [];
  const activeImage = serviceImages[Math.min(activeImageIndex, Math.max(0, serviceImages.length - 1))];
  const requirements = (serviceListing?.requirements ?? []).filter((r) => r.id != null);
  const flexibleLabels = (values: { code: string | null; customValue: string | null }[] | undefined) =>
    (values ?? []).map((v) => v.customValue || (v.code ? v.code.replaceAll('_', ' ') : '')).filter(Boolean);
  const inclusions = flexibleLabels(serviceListing?.inclusions);
  const equipment = flexibleLabels(serviceListing?.equipment);
  const COVERAGE: Record<string, string> = {
    my_lga: 'Within my LGA', my_state: 'Within my state', selected_states: 'Selected states',
    nationwide: 'Nationwide', remote: 'Remote', custom: serviceListing?.customCoverage || 'Custom area',
  };
  const setAnswer = (key: string, value: string) => setAnswers((prev) => ({ ...prev, [key]: value }));

  async function handleBook(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    // The backend refuses a booking that skips a required question; say which one up front.
    const missing = requirements.find((r) => r.required && !(answers[String(r.id)] || '').trim());
    if (missing) {
      showToast(`Please answer: ${missing.question}`, 'error');
      return;
    }
    const otherMissing = requirements.find((r) => answers[String(r.id)] === '__other' && !(answers[`${r.id}_other`] || '').trim());
    if (otherMissing) {
      showToast(`Please specify your answer for: ${otherMissing.question}`, 'error');
      return;
    }
    // Auth gate (Phase 5): never create a booking without confirmed auth.
    if (!isLive()) {
      await renewSession();
      if (!isLive()) {
        showToast(
          phaseRef.current === 'signedOut'
            // A confirmed dead session was already ended gracefully by AuthContext; name the
            // interrupted action here so the customer knows why they are being sent to login.
            ? 'Please sign in again to book this service.'
            : 'We could not confirm your session yet. Please try again in a moment.',
          phaseRef.current === 'signedOut' ? 'warning' : 'error'
        );
        return;
      }
    }
    setSubmitting(true);
    const booking = await createBooking({
      serviceId: product!.id,
      scheduledDate: date,
      serviceLocation: bookLocation,
      customerNotes: bookMessage,
      requirementAnswers: Object.fromEntries(
        Object.entries(answers)
          .filter(([, v]) => v.trim() !== '')
          // ServiceBookingService.validateAnswers expects the "__other" sentinel for the choice
          // plus the free text under `${id}_other`.
          .map(([k, v]) => [k, v === '__other' ? v : v.trim()]),
      ),
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
    <div className="section">
      <div className="container">
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

        {activeImage && (
          <div style={{ marginBottom: 20 }}>
            <OptimizedImage
              key={activeImage}
              src={activeImage}
              alt={product.name}
              targetWidth={900}
              loading="eager"
              sizes="(max-width: 768px) 100vw, 700px"
              style={{ width: '100%', maxHeight: 380, objectFit: 'cover', borderRadius: 'var(--radius)' }}
            />
            {serviceImages.length > 1 && (
              <div className="product-gallery-thumbs" aria-label="Service photos">
                {serviceImages.map((src, i) => (
                  <button
                    key={src.slice(-48)}
                    type="button"
                    className={`product-gallery-thumb${src === activeImage ? ' active' : ''}`}
                    onClick={() => setActiveImageIndex(i)}
                    aria-label={`Show photo ${i + 1} of ${serviceImages.length}`}
                    aria-pressed={src === activeImage}
                  >
                    <OptimizedImage src={src} alt="" targetWidth={160} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

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
            <div className="value price">{product.price != null ? formatPrice(product.price) : 'On request'}</div>
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
          {serviceListing && (inclusions.length > 0 || equipment.length > 0 || serviceListing.coverageType || serviceListing.experienceYears != null) && (
            <ul className="service-facts">
              {serviceListing.coverageType && <li><i className="fa-solid fa-map-location-dot"></i> <strong>Coverage:</strong> {COVERAGE[serviceListing.coverageType] || serviceListing.coverageType}</li>}
              {serviceListing.experienceYears != null && <li><i className="fa-solid fa-award"></i> <strong>Experience:</strong> {serviceListing.experienceYears} year{serviceListing.experienceYears === 1 ? '' : 's'}</li>}
              {inclusions.length > 0 && <li><i className="fa-solid fa-circle-check"></i> <strong>Included:</strong> {inclusions.join(', ')}</li>}
              {equipment.length > 0 && <li><i className="fa-solid fa-tractor"></i> <strong>Equipment:</strong> {equipment.join(', ')}</li>}
            </ul>
          )}
        </div>
      </div>

      <div className="service-detail-sidebar">
        {isOwner ? (
          <>
            <h3 className="sidebar-title"><i className="fa-solid fa-briefcase" style={{ color: 'var(--primary)' }}></i> Your Service</h3>
            <div className="owner-listing-panel">
              <p>This is your service. Customers book or request a quote here; you manage it and respond to requests instead.</p>
              <div className="owner-listing-actions">
                <Link to={`/account/listings/${product.id}/edit`} className="btn-primary btn-inline btn-sm">
                  <i className="fa-solid fa-pen"></i> Edit Service
                </Link>
                <Link to="/account/my-bookings" className="btn-outline btn-inline btn-sm">
                  <i className="fa-solid fa-calendar-check"></i> Booking Requests
                </Link>
              </div>
            </div>
          </>
        ) : (
        <>
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
              {requirements.map((r) => {
                const key = String(r.id);
                const fieldId = `book-req-${key}`;
                const value = answers[key] || '';
                return (
                  <div className="form-group" key={key}>
                    <label htmlFor={fieldId}>
                      {r.question} {r.required && <span style={{ color: 'var(--danger)' }}>*</span>}
                    </label>
                    {r.answerType === 'multiple_choice' ? (
                      <>
                        <select id={fieldId} value={value} onChange={(e) => setAnswer(key, e.target.value)}>
                          <option value="">Choose…</option>
                          {r.options.map((o) => <option key={o} value={o}>{o}</option>)}
                          {r.allowOther && <option value="__other">Other…</option>}
                        </select>
                        {value === '__other' && (
                          <input
                            style={{ marginTop: 6 }} aria-label={`Other answer for ${r.question}`} maxLength={160}
                            value={answers[`${key}_other`] || ''} onChange={(e) => setAnswer(`${key}_other`, e.target.value)}
                          />
                        )}
                      </>
                    ) : r.answerType === 'long_text' ? (
                      <textarea id={fieldId} rows={3} maxLength={1000} value={value} onChange={(e) => setAnswer(key, e.target.value)} />
                    ) : (
                      <input
                        id={fieldId} maxLength={300} value={value} onChange={(e) => setAnswer(key, e.target.value)}
                        type={r.answerType === 'number' ? 'number' : r.answerType === 'date' ? 'date' : 'text'}
                        placeholder={r.answerType === 'location' ? 'Farm or site address' : undefined}
                      />
                    )}
                  </div>
                );
              })}
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
        </>
        )}
      </div>
    </div>
  </div>
</div>
  );
}
