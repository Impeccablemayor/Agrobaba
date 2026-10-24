import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <div className="section" style={{ paddingTop: 20 }}>
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item active">About Us</li>
          </ol>
        </nav>

        {/* Hero Banner */}
        <div className="about-hero">
          <span className="about-hero-badge">
            <i className="fa-solid fa-leaf"></i> Our Story & Vision
          </span>
          <h1>
            Built by farmers, <span className="highlight">for farmers.</span>
          </h1>
          <p>
            And for everyone who feeds Africa — from smallholder farmers in rural communities
            to large agro-dealers, commercial buyers, and service providers across Nigeria.
          </p>
        </div>

        {/* Mission & Impact Grid */}
        <div className="about-mission-grid">
          <div className="about-mission-card">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              <i className="fa-solid fa-bullseye"></i> The Agrobaba Mission
            </div>
            <h2>Revolutionizing African Agricultural Commerce</h2>
            <p>
              Agrobaba exists to eliminate the chronic friction, information asymmetry, and unfair markups in agricultural trade.
              We believe that farmers deserve direct market access, buyers deserve guaranteed quality, and agro-dealers deserve
              a dependable digital platform to grow.
            </p>
            <p style={{ marginTop: 14 }}>
              By replacing predatory middlemen with escrow-protected transactions, transparent price discovery,
              and real-time negotiation, we build trust, liquidity, and shared prosperity across the entire value chain.
            </p>
          </div>

          <div className="mission-pillar-list">
            <div className="mission-pillar-item">
              <div className="mission-pillar-icon">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <div>
                <h4>Escrow Protected Security</h4>
                <p>Every transaction is locked in mock escrow until both buyer and farmer confirm physical handover and satisfaction.</p>
              </div>
            </div>

            <div className="mission-pillar-item">
              <div className="mission-pillar-icon">
                <i className="fa-solid fa-handshake"></i>
              </div>
              <div>
                <h4>Direct Market Access</h4>
                <p>Negotiate directly with verified producers and merchants with zero opaque intermediaries or hidden transaction cuts.</p>
              </div>
            </div>

            <div className="mission-pillar-item">
              <div className="mission-pillar-icon">
                <i className="fa-solid fa-mobile-screen"></i>
              </div>
              <div>
                <h4>Built for African Connectivity</h4>
                <p>Ultra-lightweight, responsive interfaces optimized for seamless performance across all 36 Nigerian states and mobile devices.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Core Values Section */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 36px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              <i className="fa-solid fa-seedling"></i> Guiding Principles
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text)', marginBottom: 8 }}>Our Core Values</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>The foundational principles that guide every feature, policy, and interaction we build.</p>
          </div>

          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon"><i className="fa-solid fa-handshake"></i></div>
              <h3>Trust</h3>
              <p>Every transaction is protected and every user is verified to establish unshakeable confidence from day one.</p>
            </div>
            <div className="value-card">
              <div className="value-icon"><i className="fa-solid fa-scale-balanced"></i></div>
              <h3>Transparency</h3>
              <p>No hidden fees or secret margins. Farmers and buyers see true market demand, ratings, and agreed prices.</p>
            </div>
            <div className="value-card">
              <div className="value-icon"><i className="fa-solid fa-earth-africa"></i></div>
              <h3>Inclusion</h3>
              <p>From rural smallholders to city wholesalers — our tools are engineered to empower everyone who feeds Africa.</p>
            </div>
            <div className="value-card">
              <div className="value-icon"><i className="fa-solid fa-arrow-trend-up"></i></div>
              <h3>Real Impact</h3>
              <p>Committed to driving tangible income growth for farmers through direct trade and expanded customer reach.</p>
            </div>
          </div>
        </div>

        {/* Why Agrobaba Section */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 36px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--primary)', fontWeight: 800, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              <i className="fa-solid fa-check-double"></i> Built For Farmers & Buyers
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text)', marginBottom: 8 }}>Why Choose Agrobaba?</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>The digital ecosystem designed specifically for modern African agriculture.</p>
          </div>

          <div className="advantage-grid">
            {[
              ['fa-shield-halved', 'Escrow Protection', 'Funds are held safely in escrow until delivery is verified. Both buyers and sellers trade risk-free.'],
              ['fa-circle-check', 'Verified Community', 'All farmers, merchants, and service providers undergo verification. Know exactly who you are dealing with.'],
              ['fa-star', 'Transparent Ratings', 'Honest peer feedback from completed transactions helps credible operators build their reputation.'],
              ['fa-comments', 'Direct Messaging', 'Chat and negotiate terms directly with your counterparty. No intermediaries, no misinformation.'],
              ['fa-clipboard-list', 'Live Demand Board', 'Buyers post specific agricultural requirements; farmers and distributors fulfill them with tailored quotes.'],
              ['fa-mobile-screen', 'Mobile-First Speed', 'Lightweight, ultra-fast interfaces optimized for seamless performance across Nigeria on any network.'],
            ].map(([icon, title, text]) => (
              <div className="advantage-card" key={title}>
                <div className="icon"><i className={`fa-solid ${icon}`}></i></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Call-to-action Banners */}
        <div style={{ paddingBottom: 24 }}>
          <div className="banners">
            <div className="banner banner-green">
              <i className="fa-solid fa-tractor"></i>
              <h3>Ready to Start Selling?</h3>
              <p>Join thousands of farmers, aggregators, and dealers already earning more by trading directly with verified buyers.</p>
              <Link to="/register" className="banner-btn">
                <i className="fa-solid fa-plus"></i> Join Free Today
              </Link>
            </div>
            <div className="banner banner-amber">
              <i className="fa-solid fa-basket-shopping"></i>
              <h3>Looking to Source Produce?</h3>
              <p>Browse farm-fresh listings or post your exact requirements on our Live Demand Board to get competitive bids.</p>
              <Link to="/shop" className="banner-btn">
                <i className="fa-solid fa-store"></i> Browse Marketplace
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

