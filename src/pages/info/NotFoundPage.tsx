import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="section">
      <div className="container">
        <div className="empty-cart" style={{ margin: '48px 0' }}>
          <i className="fa-solid fa-compass" style={{ fontSize: 40, color: 'var(--muted)' }}></i>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', margin: '12px 0 4px' }}>Page not found</h1>
          <p>The page you're looking for doesn't exist or may have moved.</p>
          <Link to="/" className="btn-primary btn-inline btn-sm">
            <i className="fa-solid fa-house"></i> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
