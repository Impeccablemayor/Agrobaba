import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../hooks/queries/useProducts';
import { useCategories } from '../hooks/queries/useCategories';
import { useDemands } from '../hooks/queries/useDemands';
import { useMatchingDemands, useRecommendedProducts } from '../hooks/queries/useHome';
import { getActiveFlashSale } from '../lib/flashSales';
import { getSectionIdByCode } from '../lib/categories';
import { getMyPersonalizationProfile } from '../lib/personalization';
import { recordEvent } from '../lib/behaviorEvents';
import { showToast } from '../lib/toastBus';
import { ProductCard } from '../components/ProductCard';
import { DemandCard } from '../components/DemandCard';
import { FlashSaleCard } from '../components/FlashSaleCard';
import { SearchSuggest } from '../components/SearchSuggest';
import { CategorySidebar } from '../components/CategorySidebar';
import type { Suggestion } from '../lib/search';
import type { FlashSale, Product, ProfileStatus } from '../types';

function useCountdown(endAt: string | null) {
  const [remaining, setRemaining] = useState(0);
  const endRef = useRef<number>(0);

  useEffect(() => {
    endRef.current = endAt ? new Date(endAt).getTime() : 0;

    function tick() {
      setRemaining(endRef.current ? Math.max(0, endRef.current - Date.now()) : 0);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endAt]);

  const hours = String(Math.floor(remaining / (1000 * 60 * 60))).padStart(2, '0');
  const mins = String(Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
  const secs = String(Math.floor((remaining % (1000 * 60)) / 1000)).padStart(2, '0');
  return { hours, mins, secs, expired: endAt !== null && remaining === 0 };
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [heroQuery, setHeroQuery] = useState('');
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);
  const [flashSale, setFlashSale] = useState<FlashSale | null>(null);
  const { hours, mins, secs, expired } = useCountdown(flashSale?.endAt || null);

  const isSupplier = !!user && user.role !== 'buyer';

  const { data: products = [] } = useProducts();
  const { data: demands = [] } = useDemands();
  const { data: categories = [] } = useCategories();
  const { data: initialRecommended = [] } = useRecommendedProducts();
  const { data: matchingDemands = [] } = useMatchingDemands();

  const [filteredRecommended, setFilteredRecommended] = useState<Product[]>([]);

  useEffect(() => {
    setFilteredRecommended(initialRecommended);
  }, [initialRecommended]);

  useEffect(() => {
    void (async () => {
      const activeFlashSale = await getActiveFlashSale();
      setFlashSale(activeFlashSale);
      if (user) {
        const personalizationProfile = await getMyPersonalizationProfile();
        setProfileStatus(personalizationProfile?.status ?? null);
      }
    })();
  }, [user]);

  const featuredProducts = products.slice(0, 8);
  const recommendedIds = new Set(filteredRecommended.map((p) => p.id));
  const withRecommendedFirst = (candidates: Product[]) =>
    [...candidates].sort((a, b) => Number(recommendedIds.has(b.id)) - Number(recommendedIds.has(a.id)));
  const produceRail = withRecommendedFirst(products.filter((p) => p.categoryCode?.startsWith('produce.'))).slice(0, 4);
  const servicesRail = withRecommendedFirst(products.filter((p) => p.type === 'service')).slice(0, 4);
  const previewDemands = demands.slice(0, 4);

  function handleNotInterested(productId: string) {
    recordEvent('not_interested', productId);
    setFilteredRecommended((prev) => prev.filter((p) => p.id !== productId));
    showToast("Got it — you'll see less like this", 'info');
  }

  const sectionHref = (code: string) => {
    const id = getSectionIdByCode(categories, code);
    return id ? `/shop?categoryId=${encodeURIComponent(id)}` : '/shop';
  };

  const postHref = !user ? '/register' : isSupplier ? '/account/post-listing' : '/demands/new';
  const postLabel = !user ? 'Get Started' : isSupplier ? 'Post a Listing' : 'Post a Demand';

  function doHeroSearch(value: string = heroQuery) {
    if (!value.trim()) return;
    navigate(`/shop?search=${encodeURIComponent(value.trim())}`);
  }

  function goToProduct(item: Suggestion) {
    setHeroQuery('');
    navigate(`/shop/product/${item.value}`);
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
            Verified farmers, buyers, agro-dealers and service providers — all in one place.
          </p>
          <div className="hero-search">
            <SearchSuggest
              value={heroQuery}
              onChange={setHeroQuery}
              onSubmit={doHeroSearch}
              onSelectResult={goToProduct}
              scope="products"
              placeholder='Try "maize Kaduna", "farm consultant", "NPK fertilizer Lagos"'
            />
            <button onClick={() => doHeroSearch()}>
              <i className="fa-solid fa-magnifying-glass"></i> Search
            </button>
          </div>
          <div className="hero-actions" style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <Link to="/shop" className="btn-primary btn-inline">
              <i className="fa-solid fa-store"></i> Browse Market
            </Link>
            <Link to={postHref} className="btn-outline btn-inline">
              <i className="fa-solid fa-plus"></i> {postLabel}
            </Link>
          </div>
          <div className="popular">
            <span>Popular:</span>
            <Link to="/shop?search=tomatoes">Tomatoes</Link>
            <Link to="/shop?search=fertilizer">Fertilizer</Link>
            <Link to="/shop?search=maize">Maize</Link>
            <Link to="/shop?search=veterinary">Vet Services</Link>
            <Link to="/shop?search=irrigation">Irrigation</Link>
            <Link to="/shop?search=cassava">Cassava</Link>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <div className="trust-strip">
        <div className="trust-item"><i className="fa-solid fa-circle-check"></i> Verified Sellers</div>
        <div className="trust-item"><i className="fa-solid fa-handshake"></i> Direct Trade, No Middlemen</div>
        <div className="trust-item"><i className="fa-solid fa-money-check-dollar"></i> Payment Verification</div>
        <div className="trust-item"><i className="fa-solid fa-comments"></i> Buyer-Seller Messaging</div>
        <div className="trust-item"><i className="fa-solid fa-headset"></i> Support When You Need It</div>
      </div>

      {/* RECOMMENDED FOR YOU */}
      {filteredRecommended.length > 0 && (
        <>
          <div className="section">
            <div className="section-hdr">
              <h2><i className="fa-solid fa-sparkles" style={{ color: 'var(--primary)' }}></i> Recommended for You</h2>
            </div>
            <div className="grid-4">
              {filteredRecommended.map((p) => <ProductCard key={p.id} product={p} onNotInterested={handleNotInterested} />)}
            </div>
          </div>

          <div className="divider"></div>
        </>
      )}

      {/* DEMANDS YOU COULD FULFILL */}
      {matchingDemands.length > 0 && (
        <>
          <div className="section">
            <div className="section-hdr">
              <h2><i className="fa-solid fa-bullseye" style={{ color: 'var(--primary)' }}></i> Demands You Could Fulfill</h2>
              <Link to="/demands" className="see-all">View demand board <i className="fa-solid fa-chevron-right"></i></Link>
            </div>
            <div className="demand-grid">
              {matchingDemands.map((d) => <DemandCard key={d.id} demand={d} />)}
            </div>
          </div>

          <div className="divider"></div>
        </>
      )}

      {/* COMPLETE YOUR PROFILE */}
      {user && profileStatus && profileStatus !== 'completed' && (
        <>
          <div className="section">
            <div className="banner banner-green">
              <i className="fa-solid fa-sliders"></i>
              <h3>Get recommendations made for you</h3>
              <p>Tell us what you're looking for and we'll surface matching listings, demands and alerts across the site — takes under 2 minutes.</p>
              <Link to="/onboarding" className="banner-btn"><i className="fa-solid fa-arrow-right"></i> Complete My Profile</Link>
            </div>
          </div>

          <div className="divider"></div>
        </>
      )}

      {/* BROWSE MARKET */}
      <div className="section">
        <div className="shop-layout home-browse-layout">
          <CategorySidebar
            categories={categories}
            sectionId="all"
            categoryId="all"
            onSelectSection={(id) => navigate(id === 'all' ? '/shop' : `/shop?categoryId=${encodeURIComponent(id)}`)}
            onSelectCategory={(_sectionId, id) => navigate(`/shop?categoryId=${encodeURIComponent(id)}`)}
          />

          <div className="shop-content">
            <div className="section-hdr">
              <h2><i className="fa-solid fa-store" style={{ color: 'var(--primary)' }}></i> Browse the Market</h2>
              <Link to="/shop" className="see-all">See all <i className="fa-solid fa-chevron-right"></i></Link>
            </div>
            {products.length === 0 ? (
              <p className="text-muted text-center">No products yet.</p>
            ) : (
              <div className="grid-4">
                {featuredProducts.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="divider"></div>

      {/* FLASH DEALS */}
      {flashSale && !expired && flashSale.items.length > 0 && (
        <>
          <div className="section">
            <div className="section-hdr">
              <h2>
                <i className="fa-solid fa-fire" style={{ color: '#dc2626' }}></i>
                {flashSale.title}
                <span className="flash-badge">
                  <i className="fa-regular fa-clock"></i>
                  <span>{hours}</span>h : <span>{mins}</span>m : <span>{secs}</span>s
                </span>
              </h2>
              <Link to="/shop" className="see-all">See all <i className="fa-solid fa-chevron-right"></i></Link>
            </div>
            <div className="scroll-row">
              {flashSale.items.map((item) => <FlashSaleCard key={item.id} item={item} />)}
            </div>
          </div>

          <div className="divider"></div>
        </>
      )}

      {/* FRESH PRODUCE */}
      <div className="section">
        <div className="section-hdr">
          <h2><i className="fa-solid fa-wheat-awn" style={{ color: 'var(--primary)' }}></i> Fresh Produce</h2>
          <Link to={sectionHref('produce')} className="see-all">See all <i className="fa-solid fa-chevron-right"></i></Link>
        </div>
        {produceRail.length === 0 ? (
          <p className="text-muted">No fresh produce listed yet.</p>
        ) : (
          <div className="grid-4">
            {produceRail.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>

      <div className="divider"></div>

      {/* SERVICES */}
      <div className="section">
        <div className="section-hdr">
          <h2><i className="fa-solid fa-hand-holding-medical" style={{ color: 'var(--primary)' }}></i> Agro Services</h2>
          <Link to={sectionHref('services')} className="see-all">See all <i className="fa-solid fa-chevron-right"></i></Link>
        </div>
        {servicesRail.length === 0 ? (
          <p className="text-muted">No services listed yet.</p>
        ) : (
          <div className="grid-4">
            {servicesRail.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>

      <div className="divider"></div>

      {/* DEMAND BOARD PREVIEW */}
      <div className="section">
        <div className="section-hdr">
          <h2><i className="fa-solid fa-clipboard-list" style={{ color: 'var(--primary)' }}></i> Recent Demands</h2>
          <Link to="/demands" className="see-all">View demand board <i className="fa-solid fa-chevron-right"></i></Link>
        </div>
        {previewDemands.length === 0 ? (
          <p className="text-muted">No demands posted yet.</p>
        ) : (
          <div className="demand-grid">
            {previewDemands.map((d) => <DemandCard key={d.id} demand={d} />)}
          </div>
        )}
      </div>

      <div className="divider"></div>

      {/* SELLER / BUYER CALLS TO ACTION */}
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

      {/* HOW IT WORKS */}
      <section className="how-it-works">
        <div className="container">
          <h2 className="section-title">How Agrobaba Works</h2>
          <p className="section-subtitle">Simple and transparent agricultural trade in 3 steps.</p>
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
                <h3>Trade Directly</h3>
                <p>Agree terms, confirm payment, and get your order moving. Rate your experience and build your reputation.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
