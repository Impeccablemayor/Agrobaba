import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <>
      <div style={{ background: 'linear-gradient(135deg, #1B6B3A, #0d4a24)', padding: '56px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(244,161,29,0.15)', border: '1px solid rgba(244,161,29,0.3)', color: '#F4A11D', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 999, marginBottom: 16 }}>
            <i className="fa-solid fa-leaf"></i> Our Story
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: '-0.05em', marginBottom: 12 }}>
            Built by farmers,<br /><span style={{ color: '#F4A11D' }}>for farmers.</span>
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>
            And for everyone who feeds Africa — from smallholder farmers in rural villages to large agro-dealers in the cities.
          </p>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 20 }}>Our Mission</h2>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.9 }}>
              Agrobaba exists to revolutionize agricultural commerce in Africa. We believe that farmers deserve direct market access,
              buyers deserve quality assurance, and agro-dealers deserve a transparent platform to thrive. By eliminating unnecessary
              middlemen and using escrow-protected transactions, we're building trust, transparency, and prosperity across the agricultural value chain.
            </p>
          </div>
        </div>
      </div>

      <div className="how-it-works">
        <div className="container">
          <h2 className="section-title">Our Values</h2>
          <p className="section-subtitle">The principles that guide every decision we make.</p>
          <div className="row g-4 mt-2">
            {[
              ['🤝', 'Trust', 'Every transaction is protected. Every user is verified. Building confidence from day one.'],
              ['👁️', 'Transparency', "No hidden fees, no secret deals. Farmers and buyers see exactly what they're getting."],
              ['🌍', 'Inclusion', 'From smallholder farmers in rural areas to large agro-dealers in cities — everyone belongs here.'],
              ['⬆️', 'Impact', 'Our goal is to increase farm income by 20% within 2 years through better market access.'],
            ].map(([emoji, title, text]) => (
              <div className="col-md-3 col-sm-6" key={title}>
                <div className="step-card">
                  <div style={{ fontSize: '2rem', color: 'var(--accent)', marginBottom: 12 }}>{emoji}</div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <h2 className="section-title">Why Agrobaba?</h2>
          <p className="section-subtitle">The platform built specifically for Nigerian and African agriculture.</p>
          <div className="advantage-grid">
            {[
              ['fa-lock', 'Escrow Protection', 'Funds are held safely until both parties confirm satisfaction. Every deal is secure from start to finish.'],
              ['fa-circle-check', 'Verified Users', "All farmers and dealers go through verification. You always know who you're trading with."],
              ['fa-star', 'Ratings System', 'Transparent feedback from real transactions. Build your reputation and earn trust on the platform.'],
              ['fa-comments', 'Direct Messaging', 'Negotiate directly with buyers and sellers. No middlemen. No information asymmetry.'],
              ['fa-clipboard-list', 'Demand Board', 'Buyers post what they need. Farmers respond with offers. A truly two-sided marketplace.'],
              ['fa-mobile-alt', 'Mobile First', 'Trade from anywhere. Agrobaba works on any device, even on slow networks across Nigeria.'],
            ].map(([icon, title, text]) => (
              <div className="advantage-card" key={title}>
                <div className="icon"><i className={`fa-solid ${icon}`}></i></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="banners">
        <div className="banner banner-green">
          <i className="fa-solid fa-tractor"></i>
          <h3>Ready to Start Selling?</h3>
          <p>Join thousands of farmers and dealers already earning more by selling directly to buyers on Agrobaba.</p>
          <Link to="/register" className="banner-btn"><i className="fa-solid fa-plus"></i> Join Free Today</Link>
        </div>
        <div className="banner banner-amber">
          <i className="fa-solid fa-basket-shopping"></i>
          <h3>Looking to Buy?</h3>
          <p>Browse verified listings or post exactly what you need and let farmers come to you with their best offers.</p>
          <Link to="/shop" className="banner-btn"><i className="fa-solid fa-store"></i> Browse the Market</Link>
        </div>
      </div>
    </>
  );
}
