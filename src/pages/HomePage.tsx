import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useProducts } from '../hooks/queries/useProducts';
import { useCategories } from '../hooks/queries/useCategories';
import { useDemands } from '../hooks/queries/useDemands';
import { useMatchingDemands, useRecommendedProducts } from '../hooks/queries/useHome';
import { useActiveFlashSale } from '../hooks/queries/useFlashSales';
import { useMyProfileStatus } from '../hooks/queries/usePersonalization';
import { getSectionIdByCode } from '../lib/categories';
import { recordEvent } from '../lib/behaviorEvents';
import { showToast } from '../lib/toastBus';
import { ProductCard } from '../components/ProductCard';
import { DemandCard } from '../components/DemandCard';
import { FlashSaleCard } from '../components/FlashSaleCard';
import { SearchSuggest } from '../components/SearchSuggest';
import type { Suggestion } from '../lib/search';
import type { Product } from '../types';

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
  const { data: flashSale = null } = useActiveFlashSale();
  const { data: personalizationProfile } = useMyProfileStatus(Boolean(user));
  const profileStatus = personalizationProfile?.status ?? null;
  const { hours, mins, secs, expired } = useCountdown(flashSale?.endAt || null);

  const isSupplier = !!user && user.role !== 'buyer' && user.role !== 'admin';

  const { data: products = [] } = useProducts();
  const { data: demands = [] } = useDemands();
  const { data: categories = [] } = useCategories();
  const { data: initialRecommended = [] } = useRecommendedProducts();
  const { data: matchingDemands = [] } = useMatchingDemands();

  const [filteredRecommended, setFilteredRecommended] = useState<Product[]>([]);

  useEffect(() => {
    setFilteredRecommended(initialRecommended);
  }, [initialRecommended]);

  const featuredProducts = products.slice(0, 8);
  const recommendedIds = new Set(filteredRecommended.map((p) => p.id));
  const withRecommendedFirst = (candidates: Product[]) =>
    [...candidates].sort((a, b) => Number(recommendedIds.has(b.id)) - Number(recommendedIds.has(a.id)));

  const produceRail = withRecommendedFirst(
    products.filter((p) => p.categoryCode?.startsWith('produce.') || p.type === 'produce')
  ).slice(0, 4);

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

  const postHref = !user ? '/demands' : isSupplier ? '/account/post-listing' : '/demands/new';
  const postLabel = !user ? 'View Demand Board' : isSupplier ? 'Post a Listing' : 'Post a Demand';
  const postIcon = !user ? 'fa-clipboard-list' : 'fa-plus';

  function doHeroSearch(value: string = heroQuery) {
    if (!value.trim()) return;
    navigate(`/shop?search=${encodeURIComponent(value.trim())}`);
  }

  function goToProduct(item: Suggestion) {
    setHeroQuery('');
    navigate(`/shop/product/${item.value}`);
  }

  return (
    <div className="home-page-root">
      {/* SECTION A: HERO */}
      <section className="hero-editorial-section">
        <div className="container">
          <div className="hero-split-grid">
            {/* Left Column: Messaging & Search */}
            <div className="hero-content-col">
              <div className="hero-badge-pill">
                <i className="fa-solid fa-leaf"></i> Nigeria's Agricultural Marketplace
              </div>

              <h1 className="hero-main-title">
                Good things grow <br />
                <span className="hero-title-highlight">when we connect.</span>
              </h1>

              <p className="hero-description-text">
                Direct trade between verified farmers, agro-dealers, and buyers across Nigeria. Real farm pricing, transparent quantities, and escrow protection.
              </p>

              {/* Prominent Search Bar */}
              <div className="hero-search-box">
                <i className="fa-solid fa-magnifying-glass hero-search-icon"></i>
                <SearchSuggest
                  value={heroQuery}
                  onChange={setHeroQuery}
                  onSubmit={doHeroSearch}
                  onSelectResult={goToProduct}
                  scope="products"
                  placeholder='Search "tomatoes Ibadan", "NPK fertilizer", "maize Kano"…'
                />
                <button
                  type="button"
                  className="hero-search-submit"
                  onClick={() => doHeroSearch()}
                  aria-label="Search listings"
                >
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <span>Search</span>
                </button>
              </div>

              {/* Dual Calls to Action */}
              <div className="hero-cta-group">
                <Link to="/shop" className="btn-primary hero-btn-main">
                  <i className="fa-solid fa-store"></i> Browse Marketplace
                </Link>
                <Link to={postHref} className="btn-outline hero-btn-sub">
                  <i className={`fa-solid ${postIcon}`}></i> {postLabel}
                </Link>
              </div>

              {/* Quick Popular Keywords */}
              <div className="hero-popular-tags">
                <span className="popular-label">Popular:</span>
                <Link to="/shop?search=tomatoes" className="popular-tag">Tomatoes</Link>
                <Link to="/shop?search=fertilizer" className="popular-tag">Fertilizer</Link>
                <Link to="/shop?search=maize" className="popular-tag">Maize</Link>
                <Link to="/shop?search=cassava" className="popular-tag">Cassava</Link>
                <Link to="/shop?search=tractor" className="popular-tag">Tractor Hire</Link>
                <Link to="/shop?search=poultry" className="popular-tag">Poultry Feed</Link>
              </div>
            </div>

            {/* Right Column: Authentic Editorial Imagery */}
            <div className="hero-visual-col">
              <div className="hero-image-card">
                <img
                  src="/hero-agriculture.jpg"
                  alt="Verified Nigerian farmer with fresh harvest on farmland"
                  className="hero-farmer-img"
                  loading="eager"
                  fetchPriority="high"
                />
                {/* Floating Reassurance Badges */}
                <div className="floating-badge farm-verified-badge">
                  <i className="fa-solid fa-circle-check"></i>
                  <div>
                    <strong>Verified Farmer</strong>
                    <span>Adegbayi, Oyo State</span>
                  </div>
                </div>

                <div className="floating-badge escrow-badge">
                  <i className="fa-solid fa-shield-halved"></i>
                  <div>
                    <strong>Escrow Protected</strong>
                    <span>Payment verified on delivery</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION B: TRUST & REASSURANCE */}
      <section className="trust-reassurance-strip">
        <div className="container">
          <div className="trust-grid">
            <div className="trust-card">
              <div className="trust-icon-box">
                <i className="fa-solid fa-user-check"></i>
              </div>
              <div className="trust-card-text">
                <h4>Verified Sellers</h4>
                <p>Identity & farm verification so you deal with legitimate producers.</p>
              </div>
            </div>

            <div className="trust-card">
              <div className="trust-icon-box">
                <i className="fa-solid fa-handshake"></i>
              </div>
              <div className="trust-card-text">
                <h4>Direct Market Trade</h4>
                <p>Cut out unwarranted middleman markups. Buy direct from the source.</p>
              </div>
            </div>

            <div className="trust-card">
              <div className="trust-icon-box">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <div className="trust-card-text">
                <h4>Payment Escrow</h4>
                <p>Your money is held safely and only released when goods arrive as agreed.</p>
              </div>
            </div>

            <div className="trust-card">
              <div className="trust-icon-box">
                <i className="fa-solid fa-truck-fast"></i>
              </div>
              <div className="trust-card-text">
                <h4>Nationwide Delivery</h4>
                <p>Coordinated transit across states with verified agricultural transporters.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION C: PRODUCT CATEGORIES */}
      <section className="categories-showcase-section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="section-eyebrow">Explore AgroBaba</span>
              <h2 className="section-heading">Browse by Category</h2>
            </div>
            <Link to="/shop" className="see-all-link">
              All categories <i className="fa-solid fa-arrow-right"></i>
            </Link>
          </div>

          <div className="category-cards-grid">
            <Link to={sectionHref('produce')} className="category-feature-card">
              <div className="category-icon-circle green">
                <i className="fa-solid fa-wheat-awn"></i>
              </div>
              <h3>Fresh Produce</h3>
              <p>Grains, tubers, fruits, plantains & vegetables</p>
              <span className="category-link-text">Browse produce <i className="fa-solid fa-chevron-right"></i></span>
            </Link>

            <Link to={sectionHref('inputs')} className="category-feature-card">
              <div className="category-icon-circle amber">
                <i className="fa-solid fa-flask"></i>
              </div>
              <h3>Agro Inputs & Seeds</h3>
              <p>Fertilizers, agrochemicals, hybrid seeds & nutrients</p>
              <span className="category-link-text">Browse inputs <i className="fa-solid fa-chevron-right"></i></span>
            </Link>

            <Link to={sectionHref('livestock')} className="category-feature-card">
              <div className="category-icon-circle green">
                <i className="fa-solid fa-cow"></i>
              </div>
              <h3>Livestock & Aquaculture</h3>
              <p>Poultry, goats, cattle, fish, fingerlings & feed</p>
              <span className="category-link-text">Browse livestock <i className="fa-solid fa-chevron-right"></i></span>
            </Link>

            <Link to={sectionHref('equipment')} className="category-feature-card">
              <div className="category-icon-circle amber">
                <i className="fa-solid fa-tractor"></i>
              </div>
              <h3>Farm Machinery</h3>
              <p>Tractors, harvesters, planters & irrigation tools</p>
              <span className="category-link-text">Browse machinery <i className="fa-solid fa-chevron-right"></i></span>
            </Link>

            <Link to={sectionHref('services')} className="category-feature-card">
              <div className="category-icon-circle green">
                <i className="fa-solid fa-hand-holding-medical"></i>
              </div>
              <h3>Agro Services</h3>
              <p>Veterinary, agronomy, drone spraying & consulting</p>
              <span className="category-link-text">Explore services <i className="fa-solid fa-chevron-right"></i></span>
            </Link>

            <Link to={sectionHref('land')} className="category-feature-card">
              <div className="category-icon-circle amber">
                <i className="fa-solid fa-map-location-dot"></i>
              </div>
              <h3>Land & Facilities</h3>
              <p>Farmland lease, storage warehouses & cold rooms</p>
              <span className="category-link-text">Explore facilities <i className="fa-solid fa-chevron-right"></i></span>
            </Link>
          </div>
        </div>
      </section>

      {/* COMPLETE YOUR PROFILE PROMPT */}
      {user && profileStatus && profileStatus !== 'completed' && (
        <section className="marketplace-section" style={{ padding: '16px 0' }}>
          <div className="container">
            <div className="banner banner-green" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, borderRadius: 'var(--radius)', padding: '20px 24px' }}>
              <div>
                <h3 style={{ fontSize: 16, marginBottom: 4, color: '#fff' }}>
                  <i className="fa-solid fa-sliders" style={{ marginRight: 8 }}></i> Get tailored recommendations
                </h3>
                <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.9)' }}>
                  Tell us what you grow, sell, or buy — we will surface matching produce, buyer demands, and local alerts.
                </p>
              </div>
              <Link to="/onboarding" className="btn-primary" style={{ background: '#fff', color: 'var(--primary-dark)', margin: 0, whiteSpace: 'nowrap' }}>
                <i className="fa-solid fa-arrow-right"></i> Complete Profile
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* RECOMMENDED FOR YOU (PERSONALIZED) */}
      {filteredRecommended.length > 0 && (
        <section className="marketplace-section highlight-bg">
          <div className="container">
            <div className="section-header-row">
              <div>
                <span className="section-eyebrow">Personalized For You</span>
                <h2 className="section-heading">
                  <i className="fa-solid fa-sparkles text-accent"></i> Recommended Products
                </h2>
              </div>
            </div>
            <div className="product-grid-4">
              {filteredRecommended.map((p) => (
                <ProductCard key={p.id} product={p} onNotInterested={handleNotInterested} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* DEMANDS YOU COULD FULFILL */}
      {matchingDemands.length > 0 && (
        <section className="marketplace-section">
          <div className="container">
            <div className="section-header-row">
              <div>
                <span className="section-eyebrow">Buyer Demand Matching</span>
                <h2 className="section-heading">
                  <i className="fa-solid fa-bullseye text-primary"></i> Demands You Can Fulfill
                </h2>
              </div>
              <Link to="/demands" className="see-all-link">
                View demand board <i className="fa-solid fa-arrow-right"></i>
              </Link>
            </div>
            <div className="demand-cards-grid">
              {matchingDemands.map((d) => (
                <DemandCard key={d.id} demand={d} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FLASH DEALS (IF ACTIVE) */}
      {flashSale && !expired && flashSale.items.length > 0 && (
        <section className="marketplace-section flash-deals-container">
          <div className="container">
            <div className="section-header-row">
              <div className="flash-header-left">
                <span className="section-eyebrow">Limited Time Offers</span>
                <h2 className="section-heading">
                  <i className="fa-solid fa-fire text-danger"></i> {flashSale.title}
                  <span className="flash-timer-pill">
                    <i className="fa-regular fa-clock"></i> {hours}h : {mins}m : {secs}s
                  </span>
                </h2>
              </div>
              <Link to="/shop" className="see-all-link">
                See all deals <i className="fa-solid fa-arrow-right"></i>
              </Link>
            </div>
            <div className="flash-scroll-row">
              {flashSale.items.map((item) => (
                <FlashSaleCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECTION D: FEATURED MARKETPLACE PRODUCTS */}
      <section className="marketplace-section">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="section-eyebrow">Marketplace Discovery</span>
              <h2 className="section-heading">Featured Produce & Inputs</h2>
            </div>
            <Link to="/shop" className="see-all-link">
              Browse all listings <i className="fa-solid fa-arrow-right"></i>
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="empty-state-card">
              <i className="fa-solid fa-store-slash"></i>
              <p>No listings loaded yet. The marketplace server may be connecting.</p>
              <Link to="/shop" className="btn-primary btn-inline btn-sm">Refresh Shop</Link>
            </div>
          ) : (
            <div className="product-grid-4">
              {featuredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION E: FRESH PRODUCE RAIL */}
      {produceRail.length > 0 && (
        <section className="marketplace-section highlight-bg">
          <div className="container">
            <div className="section-header-row">
              <div>
                <span className="section-eyebrow">Harvest Direct</span>
                <h2 className="section-heading">
                  <i className="fa-solid fa-wheat-awn text-primary"></i> Fresh Farm Produce
                </h2>
              </div>
              <Link to={sectionHref('produce')} className="see-all-link">
                View all produce <i className="fa-solid fa-arrow-right"></i>
              </Link>
            </div>
            <div className="product-grid-4">
              {produceRail.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECTION E2: AGRICULTURAL SERVICES */}
      {servicesRail.length > 0 && (
        <section className="marketplace-section">
          <div className="container">
            <div className="section-header-row">
              <div>
                <span className="section-eyebrow">Value Chain Expertise</span>
                <h2 className="section-heading">
                  <i className="fa-solid fa-hand-holding-medical text-primary"></i> Agricultural Services
                </h2>
              </div>
              <Link to={sectionHref('services')} className="see-all-link">
                View all services <i className="fa-solid fa-arrow-right"></i>
              </Link>
            </div>
            <div className="product-grid-4">
              {servicesRail.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SECTION F: DEMAND BOARD PREVIEW */}
      <section className="marketplace-section highlight-bg">
        <div className="container">
          <div className="section-header-row">
            <div>
              <span className="section-eyebrow">Buyers Sourcing</span>
              <h2 className="section-heading">
                <i className="fa-solid fa-clipboard-list text-primary"></i> Recent Buyer Demands
              </h2>
            </div>
            <Link to="/demands" className="see-all-link">
              View full demand board <i className="fa-solid fa-arrow-right"></i>
            </Link>
          </div>

          {previewDemands.length === 0 ? (
            <div className="empty-state-card">
              <i className="fa-solid fa-clipboard"></i>
              <p>No buyer demands posted yet. Be the first to post what you need!</p>
              <Link to="/demands/new" className="btn-primary btn-inline btn-sm">Post a Demand</Link>
            </div>
          ) : (
            <div className="demand-cards-grid">
              {previewDemands.map((d) => (
                <DemandCard key={d.id} demand={d} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SECTION G: SELLER & BUYER PARTICIPATION (RESTRAINED DUAL CARDS) */}
      <section className="participation-section">
        <div className="container">
          <div className="participation-grid">
            {/* Seller card */}
            <div className="participation-card farmer-card">
              <div className="participation-icon">
                <i className="fa-solid fa-tractor"></i>
              </div>
              <h3>Are you a Farmer, Dealer, or Service Provider?</h3>
              <p>
                List your harvests, agricultural inputs, machinery, or expertise directly to serious buyers across Nigeria. Transparent escrow payout and zero listing fees.
              </p>
              <Link to={user ? '/account/post-listing' : '/register'} className="btn-primary participation-btn">
                <i className="fa-solid fa-circle-plus"></i> Start Selling Today
              </Link>
            </div>

            {/* Buyer card */}
            <div className="participation-card buyer-card">
              <div className="participation-icon">
                <i className="fa-solid fa-basket-shopping"></i>
              </div>
              <h3>Sourcing Specific Crops, Feeds, or Equipment?</h3>
              <p>
                Post your exact requirements on the Demand Board. Verified farmers and suppliers will send you competitive quotes directly with no middleman hassle.
              </p>
              <Link to="/demands/new" className="btn-secondary participation-btn">
                <i className="fa-solid fa-pen-to-square"></i> Post a Buyer Demand
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION H: HOW AGROBABA WORKS */}
      <section className="how-it-works-section">
        <div className="container">
          <div className="section-center-header">
            <span className="section-eyebrow">Dependable Commerce</span>
            <h2 className="section-heading">How AgroBaba Works</h2>
            <p className="section-subtext">Straightforward agricultural commerce in three transparent steps.</p>
          </div>

          <div className="steps-cards-row">
            <div className="process-step-card">
              <div className="step-badge">01</div>
              <div className="step-icon-wrap">
                <i className="fa-solid fa-user-plus"></i>
              </div>
              <h3>Connect & Discover</h3>
              <p>
                Sign up free as a farmer, buyer, dealer, or service provider. Search verified listings or post a custom demand for what you need.
              </p>
            </div>

            <div className="process-step-card">
              <div className="step-badge">02</div>
              <div className="step-icon-wrap">
                <i className="fa-solid fa-comments-dollar"></i>
              </div>
              <h3>Agree Terms & Price</h3>
              <p>
                Message sellers directly, request quotes for bulk orders, and agree on verified delivery terms and specifications.
              </p>
            </div>

            <div className="process-step-card">
              <div className="step-badge">03</div>
              <div className="step-icon-wrap">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <h3>Escrow Protected Delivery</h3>
              <p>
                Pay into escrow with confidence. Goods are delivered through tracked transit, and payout is only released when you confirm receipt.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
