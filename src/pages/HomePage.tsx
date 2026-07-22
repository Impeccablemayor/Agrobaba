import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts } from '../lib/products';
import { getDemands } from '../lib/demands';
import { ProductCard } from '../components/ProductCard';
import { DemandCard } from '../components/DemandCard';
import { KEYS } from '../lib/storage';
import type { Demand, Product } from '../types';

const SIX_HOURS = 6 * 60 * 60 * 1000;

function useCountdown() {
  const [remaining, setRemaining] = useState(0);
  const endRef = useRef<number>(0);

  useEffect(() => {
    let stored = Number(localStorage.getItem(KEYS.flashEnd));
    if (!stored) {
      stored = Date.now() + SIX_HOURS;
      localStorage.setItem(KEYS.flashEnd, String(stored));
    }
    endRef.current = stored;

    function tick() {
      let left = Math.max(0, endRef.current - Date.now());
      if (left === 0) {
        endRef.current = Date.now() + SIX_HOURS;
        localStorage.setItem(KEYS.flashEnd, String(endRef.current));
        left = SIX_HOURS;
      }
      setRemaining(left);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = String(Math.floor(remaining / (1000 * 60 * 60))).padStart(2, '0');
  const mins = String(Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
  const secs = String(Math.floor((remaining % (1000 * 60)) / 1000)).padStart(2, '0');
  return { hours, mins, secs };
}

export default function HomePage() {
  const navigate = useNavigate();
  const [heroQuery, setHeroQuery] = useState('');
  const { hours, mins, secs } = useCountdown();
  const [products, setProducts] = useState<Product[]>([]);
  const [demands, setDemands] = useState<Demand[]>([]);

  useEffect(() => {
    void (async () => {
      const [allProducts, allDemands] = await Promise.all([getProducts(), getDemands()]);
      setProducts(allProducts);
      setDemands(allDemands);
    })();
  }, []);

  const flashProducts = products.filter((p) => p.discount > 0).slice(0, 6);
  const inputsProducts = products.filter((p) => p.type === 'product').slice(0, 4);
  const serviceProducts = products.filter((p) => p.type === 'service').slice(0, 4);
  const featuredProducts = products.slice(0, 8);
  const previewDemands = demands.slice(0, 4);

  function doHeroSearch() {
    if (!heroQuery.trim()) return;
    navigate(`/shop?search=${encodeURIComponent(heroQuery.trim())}`);
  }

  return (
    <>
      {/* HERO */}
      <section id="hero">
        <div className="hero-inner">
          <div className="hero-label">
            <i className="fa-solid fa-leaf"></i> Nigeria's #1 Agro Marketplace
          </div>
          <h1>
            Sell what you grow.
            <br />
            <em>Find what you need.</em>
          </h1>
          <p className="hero-sub">
            Verified farmers, buyers, agro-dealers and service providers — all in one place. Every deal escrow protected.
          </p>
          <div className="hero-search">
            <input
              type="text"
              placeholder='Try "maize Kaduna", "farm consultant", "NPK fertilizer Lagos"'
              value={heroQuery}
              onChange={(e) => setHeroQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doHeroSearch()}
            />
            <button onClick={doHeroSearch}>
              <i className="fa-solid fa-magnifying-glass"></i> Search
            </button>
          </div>
          <div className="popular">
            <span>Popular:</span>
            <Link to="/shop?search=tomatoes">Tomatoes</Link>
            <Link to="/shop?search=fertilizer">Fertilizer</Link>
            <Link to="/shop?search=maize">Maize</Link>
            <Link to="/shop?tab=services">Vet Services</Link>
            <Link to="/shop?search=irrigation">Irrigation</Link>
            <Link to="/shop?search=cassava">Cassava</Link>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <div className="trust-strip">
        <div className="trust-item"><i className="fa-solid fa-shield-halved"></i> Escrow Protected</div>
        <div className="trust-item"><i className="fa-solid fa-circle-check"></i> Verified Users</div>
        <div className="trust-item"><i className="fa-solid fa-handshake"></i> Direct Trade</div>
        <div className="trust-item"><i className="fa-solid fa-lock"></i> Secure Payments</div>
        <div className="trust-item"><i className="fa-solid fa-headset"></i> 24/7 Support</div>
      </div>

      {/* FLASH DEALS */}
      <div className="section">
        <div className="section-hdr">
          <h2>
            <i className="fa-solid fa-fire" style={{ color: '#dc2626' }}></i>
            Flash Deals
            <span className="flash-badge">
              <i className="fa-regular fa-clock"></i>
              <span>{hours}</span>h : <span>{mins}</span>m : <span>{secs}</span>s
            </span>
          </h2>
          <Link to="/shop" className="see-all">See all <i className="fa-solid fa-chevron-right"></i></Link>
        </div>
        <div className="scroll-row">
          {flashProducts.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>

      <div className="divider"></div>

      {/* FRESH PRODUCE */}
      <div className="section">
        <div className="section-hdr">
          <h2><i className="fa-solid fa-wheat-awn" style={{ color: 'var(--primary)' }}></i> Fresh Produce</h2>
          <Link to="/shop?tab=produce" className="see-all">See all <i className="fa-solid fa-chevron-right"></i></Link>
        </div>
        {products.length === 0 ? (
          <p className="text-muted text-center">No products yet.</p>
        ) : (
          <div className="grid-4">
            {featuredProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>

      <div className="divider"></div>

      {/* TWO SIDED BANNERS */}
      <div className="banners">
        <div className="banner banner-green">
          <i className="fa-solid fa-tractor"></i>
          <h3>Farmer, Dealer or Service Provider?</h3>
          <p>List your produce, products or services and connect directly with serious buyers across Nigeria. Free to join.</p>
          <Link to="/register" className="banner-btn"><i className="fa-solid fa-plus"></i> Start Selling</Link>
        </div>
        <div className="banner banner-amber">
          <i className="fa-solid fa-basket-shopping"></i>
          <h3>Need something specific?</h3>
          <p>Post a demand and receive direct offers from verified farmers and dealers near you. No hassle, no middlemen.</p>
          <Link to="/demands/new" className="banner-btn"><i className="fa-solid fa-pen"></i> Post a Demand</Link>
        </div>
      </div>

      {/* AGRO INPUTS */}
      <div className="section">
        <div className="section-hdr">
          <h2><i className="fa-solid fa-flask" style={{ color: 'var(--primary)' }}></i> Agro Inputs &amp; Fertilizers</h2>
          <Link to="/shop?tab=inputs" className="see-all">See all <i className="fa-solid fa-chevron-right"></i></Link>
        </div>
        {inputsProducts.length === 0 ? (
          <p className="text-muted">No agro inputs listed yet.</p>
        ) : (
          <div className="grid-4">
            {inputsProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>

      <div className="divider"></div>

      {/* SERVICES */}
      <div className="section">
        <div className="section-hdr">
          <h2><i className="fa-solid fa-hand-holding-medical" style={{ color: 'var(--primary)' }}></i> Agro Services</h2>
          <Link to="/shop?tab=services" className="see-all">See all <i className="fa-solid fa-chevron-right"></i></Link>
        </div>
        {serviceProducts.length === 0 ? (
          <p className="text-muted">No services listed yet.</p>
        ) : (
          <div className="grid-4">
            {serviceProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>

      <div className="divider"></div>

      {/* HOW IT WORKS */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How Agrobaba Works</h2>
          <p className="section-subtitle">Simple, secure, and transparent agricultural trade in 3 steps.</p>
          <div className="row g-4 mt-2">
            <div className="col-md-4">
              <div className="step-card">
                <div className="step-number">01</div>
                <h3>Register Free</h3>
                <p>Sign up as a farmer, buyer, agro-dealer or service provider in under 2 minutes. No fees, no credit card.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="step-card">
                <div className="step-number">02</div>
                <h3>List or Post</h3>
                <p>Farmers list what they have. Buyers post what they need. Dealers list products. Everyone connects.</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="step-card">
                <div className="step-number">03</div>
                <h3>Trade Safely</h3>
                <p>Pay through escrow. Confirm delivery. Funds released. Rate your experience. Build your reputation.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEMAND BOARD PREVIEW */}
      <div className="section">
        <div className="section-hdr">
          <h2><i className="fa-solid fa-clipboard-list" style={{ color: 'var(--primary)' }}></i> Recent Demands</h2>
          <Link to="/demands" className="see-all">View demand board <i className="fa-solid fa-chevron-right"></i></Link>
        </div>
        <div className="demand-grid">
          {previewDemands.map((d) => <DemandCard key={d.id} demand={d} />)}
        </div>
      </div>
    </>
  );
}
