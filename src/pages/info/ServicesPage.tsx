import { Link } from 'react-router-dom';

const CARDS = [
  ['fa-shield-halved', 'Secure Escrow', 'Payments are held safely in mock escrow until you confirm delivery — protecting both buyer and seller on every order.'],
  ['fa-user-check', 'Verified Badges', 'Trusted farmers, dealers and service providers earn verified badges, so you always know who you’re trading with.'],
  ['fa-bullhorn', 'Post a Demand', 'Can’t find what you need? Post exactly what you’re looking for and let sellers come to you with offers.'],
  ['fa-comments', 'Direct Messaging', 'Chat one-on-one with buyers and sellers to negotiate price, quantity and delivery before you commit.'],
  ['fa-star', 'Ratings & Reviews', 'Rate every transaction and read honest reviews, building a reputation system the whole community can trust.'],
  ['fa-clipboard-list', 'Demand Board', 'Browse a public board of open demands from buyers across Nigeria and respond to the ones you can fulfil.'],
];

export default function ServicesPage() {
  return (
    <div className="section">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item active">Services</li>
          </ol>
        </nav>

        <div
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, #14562f 100%)',
            color: '#fff',
            borderRadius: 'var(--radius)',
            padding: '48px 32px',
            textAlign: 'center',
            marginBottom: 40,
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.15)', color: '#fff', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
            <i className="fa-solid fa-seedling"></i> Built for African agriculture
          </span>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 10 }}>
            Everything you need to trade with confidence
          </h1>
          <p style={{ fontSize: 15, opacity: 0.92, maxWidth: 620, margin: '0 auto' }}>
            Agrobaba connects farmers, buyers, agro-dealers and service providers on one trusted marketplace — with the tools to buy, sell and get paid safely.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="svc-grid-responsive">
          {CARDS.map(([icon, title, text]) => (
            <div
              key={title}
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '26px 22px' }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>
                <i className={`fa-solid ${icon}`}></i>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)', marginBottom: 8 }}>{title}</h3>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, margin: 0 }}>{text}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 44, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '36px 28px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8 }}>Ready to grow with Agrobaba?</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
            Join thousands of farmers and buyers trading fresh produce, inputs, equipment and services.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn-primary btn-inline"><i className="fa-solid fa-user-plus"></i> Create Free Account</Link>
            <Link to="/shop" className="btn-outline btn-inline"><i className="fa-solid fa-store"></i> Browse the Shop</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
