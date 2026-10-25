import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useMessagesBadge } from '../../contexts/MessagesContext';
import { NotificationBell } from './NotificationBell';
import { SearchSuggest } from '../SearchSuggest';
import { ConfirmDialog } from '../ConfirmDialog';
import type { Suggestion } from '../../lib/search';

export function Navbar() {
  const { user, phase, logout } = useAuth();
  const { count } = useCart();
  const { unreadCount } = useMessagesBadge();
  const navigate = useNavigate();
  const location = useLocation();

  const [query, setQuery] = useState('');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname, location.search]);

  // Click outside to close user dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function doSearch(value: string = query) {
    if (!value.trim()) return;
    setMobileSearchOpen(false);
    navigate(`/shop?search=${encodeURIComponent(value.trim())}`);
  }

  function goToProduct(item: Suggestion) {
    setQuery('');
    setMobileSearchOpen(false);
    navigate(`/shop/product/${item.value}`);
  }

  function handleLogout() {
    setLogoutOpen(false);
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    logout();
    navigate('/');
  }

  const isSupplier = user && user.role !== 'buyer' && user.role !== 'admin';
  const postListingHref = isSupplier ? '/account/post-listing' : '/demands/new';
  const postListingLabel = isSupplier ? 'Post Listing' : 'Post Demand';

  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U';
  const firstName = user?.name ? user.name.split(' ')[0] : 'Account';

  return (
    <>
      <header id="main-navbar" className="site-header">
        <div className="container header-container">
          {/* Mobile menu toggle */}
          <button
            type="button"
            className="mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars'}`}></i>
          </button>

          {/* Logo */}
          <Link className="navbar-brand" to="/" aria-label="Agrobaba Home">
            <img src="/agrobaba-logo.png" alt="AgroBaba" className="navbar-brand-logo-img" />
          </Link>

          {/* Primary Nav Links (Desktop) */}
          <nav className="desktop-nav-links" aria-label="Main menu">
            <Link
              to="/shop"
              className={`desktop-nav-link ${location.pathname === '/shop' ? 'active' : ''}`}
            >
              Marketplace
            </Link>
            <Link
              to="/demands"
              className={`desktop-nav-link ${location.pathname.startsWith('/demands') ? 'active' : ''}`}
            >
              Demand Board
            </Link>
            <Link
              to="/services"
              className={`desktop-nav-link ${location.pathname === '/services' ? 'active' : ''}`}
            >
              Services
            </Link>
            <Link
              to="/about"
              className={`desktop-nav-link ${location.pathname === '/about' ? 'active' : ''}`}
            >
              About
            </Link>
          </nav>

          {/* Search Box (Desktop) */}
          <div className="header-search-wrap">
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <SearchSuggest
              value={query}
              onChange={setQuery}
              onSubmit={doSearch}
              onSelectResult={goToProduct}
              scope="products"
              placeholder="Search produce, equipment, inputs…"
            />
            <button className="search-submit-btn" onClick={() => doSearch()} aria-label="Search">
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>

          {/* Right Action Icons & Auth */}
          <div className="header-actions">
            {/* Mobile Search Toggle */}
            <button
              type="button"
              className="mobile-search-toggle"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              aria-label="Toggle search"
            >
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>

            {/* Quick action button: Post Listing / Post Demand (logged-in only) */}
            {user && (
              <Link to={postListingHref} className="quick-post-btn">
                <i className="fa-solid fa-plus"></i>
                <span>{postListingLabel}</span>
              </Link>
            )}

            {phase === 'restoring' ? (
              <div className="session-restoring">
                <i className="fa-solid fa-spinner fa-spin"></i>
              </div>
            ) : !user ? (
              <div className="guest-actions">
                <Link to="/login" className="btn-nav-login">
                  Sign In
                </Link>
                <Link to="/register" className="btn-nav-join">
                  Join Free
                </Link>
              </div>
            ) : (
              <div className="user-nav-actions">
                {/* Messages */}
                <Link to="/messages" className="nav-action-icon" title="Messages" aria-label="Messages">
                  <i className="fa-regular fa-comment-dots"></i>
                  {unreadCount > 0 && <span className="nav-counter-badge">{unreadCount}</span>}
                </Link>

                {/* Notifications */}
                <div className="nav-action-wrapper">
                  <NotificationBell />
                </div>

                {/* Cart */}
                <Link to="/cart" className="nav-action-icon" title="Cart" aria-label="Shopping Cart">
                  <i className="fa-solid fa-cart-shopping"></i>
                  {count > 0 && <span className="nav-counter-badge">{count}</span>}
                </Link>

                {/* User Dropdown */}
                <div className="user-dropdown-container" ref={dropdownRef}>
                  <button
                    type="button"
                    className="user-avatar-trigger"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    aria-expanded={userDropdownOpen}
                    aria-haspopup="true"
                  >
                    <span className="user-avatar-initial">{userInitial}</span>
                    <span className="user-avatar-name">{firstName}</span>
                    <i className="fa-solid fa-chevron-down user-chevron"></i>
                  </button>

                  {userDropdownOpen && (
                    <div className="user-dropdown-menu" role="menu">
                      <div className="user-dropdown-header">
                        <div className="user-full-name">{user.name}</div>
                        <div className="user-email-text">{user.email}</div>
                        <span className="user-role-badge">
                          <i className="fa-solid fa-shield-halved"></i> {user.role}
                        </span>
                      </div>

                      <div className="user-dropdown-divider"></div>

                      <Link to="/account" className="user-dropdown-item" role="menuitem">
                        <i className="fa-regular fa-user"></i> My Account
                      </Link>

                      <Link to="/account/my-orders" className="user-dropdown-item" role="menuitem">
                        <i className="fa-solid fa-box"></i> My Orders
                      </Link>

                      {isSupplier ? (
                        <>
                          <Link to="/account/my-listings" className="user-dropdown-item" role="menuitem">
                            <i className="fa-solid fa-list-check"></i> My Listings
                          </Link>
                          <Link to="/account/my-sales" className="user-dropdown-item" role="menuitem">
                            <i className="fa-solid fa-coins"></i> My Sales & Invoices
                          </Link>
                          <Link to="/account/post-listing" className="user-dropdown-item" role="menuitem">
                            <i className="fa-solid fa-circle-plus"></i> Post New Listing
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link to="/demands/mine" className="user-dropdown-item" role="menuitem">
                            <i className="fa-solid fa-clipboard-list"></i> My Demands
                          </Link>
                          <Link to="/demands/new" className="user-dropdown-item" role="menuitem">
                            <i className="fa-solid fa-pen-to-square"></i> Post a Demand
                          </Link>
                        </>
                      )}

                      <Link to="/account/my-bookings" className="user-dropdown-item" role="menuitem">
                        <i className="fa-solid fa-calendar-check"></i> My Bookings
                      </Link>

                      {user.role === 'admin' && (
                        <Link to="/admin" className="user-dropdown-item admin-link" role="menuitem">
                          <i className="fa-solid fa-gauge-high"></i> Admin Console
                        </Link>
                      )}

                      <div className="user-dropdown-divider"></div>

                      <button
                        type="button"
                        className="user-dropdown-item text-danger"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setLogoutOpen(true);
                        }}
                        role="menuitem"
                      >
                        <i className="fa-solid fa-right-from-bracket"></i> Log Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search Expandable Bar */}
        {mobileSearchOpen && (
          <div className="mobile-search-bar">
            <div className="container mobile-search-inner">
              <SearchSuggest
                value={query}
                onChange={setQuery}
                onSubmit={doSearch}
                onSelectResult={goToProduct}
                scope="products"
                placeholder="Search produce, inputs, equipment…"
                autoFocus
              />
              <button
                type="button"
                className="mobile-search-close"
                onClick={() => setMobileSearchOpen(false)}
                aria-label="Close search"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Menu Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <Link className="navbar-brand" to="/" onClick={() => setMobileMenuOpen(false)} aria-label="Agrobaba Home">
                <img src="/agrobaba-logo.png" alt="AgroBaba" className="navbar-brand-logo-img" />
              </Link>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* User status in drawer */}
            <div className="mobile-drawer-user">
              {user ? (
                <div className="drawer-user-info">
                  <div className="drawer-avatar">{userInitial}</div>
                  <div className="drawer-user-details">
                    <div className="drawer-user-name">{user.name}</div>
                    <div className="drawer-user-role">{user.role}</div>
                  </div>
                </div>
              ) : (
                <div className="drawer-guest-box">
                  <p>Join thousands of verified farmers and buyers across Nigeria.</p>
                  <div className="drawer-guest-btns">
                    <Link to="/login" className="btn-primary btn-sm">Sign In</Link>
                    <Link to="/register" className="btn-outline btn-sm">Join Free</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation links */}
            <nav className="mobile-drawer-nav">
              <div className="drawer-nav-section-title">Marketplace</div>
              <Link to="/shop" className="drawer-nav-link">
                <i className="fa-solid fa-store"></i> All Products & Produce
              </Link>
              <Link to="/demands" className="drawer-nav-link">
                <i className="fa-solid fa-clipboard-list"></i> Buyer Demand Board
              </Link>
              <Link to="/services" className="drawer-nav-link">
                <i className="fa-solid fa-hand-holding-medical"></i> Agricultural Services
              </Link>

              {user && (
                <>
                  <div className="drawer-nav-section-title">My Activity</div>
                  <Link to="/account/my-orders" className="drawer-nav-link">
                    <i className="fa-solid fa-box"></i> My Orders
                  </Link>
                  <Link to="/messages" className="drawer-nav-link">
                    <i className="fa-regular fa-comments"></i> Messages {unreadCount > 0 && `(${unreadCount})`}
                  </Link>
                  <Link to="/cart" className="drawer-nav-link">
                    <i className="fa-solid fa-cart-shopping"></i> Shopping Cart {count > 0 && `(${count})`}
                  </Link>

                  {isSupplier ? (
                    <>
                      <Link to="/account/my-listings" className="drawer-nav-link">
                        <i className="fa-solid fa-list-check"></i> My Listings
                      </Link>
                      <Link to="/account/post-listing" className="drawer-nav-link highlight">
                        <i className="fa-solid fa-plus-circle"></i> Post New Listing
                      </Link>
                      <Link to="/account/my-sales" className="drawer-nav-link">
                        <i className="fa-solid fa-coins"></i> My Sales
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link to="/demands/mine" className="drawer-nav-link">
                        <i className="fa-solid fa-list-ol"></i> My Demands
                      </Link>
                      <Link to="/demands/new" className="drawer-nav-link highlight">
                        <i className="fa-solid fa-pen-to-square"></i> Post a Demand
                      </Link>
                    </>
                  )}

                  <Link to="/account" className="drawer-nav-link">
                    <i className="fa-regular fa-user"></i> Account Settings
                  </Link>

                  {user.role === 'admin' && (
                    <Link to="/admin" className="drawer-nav-link admin">
                      <i className="fa-solid fa-gauge"></i> Admin Console
                    </Link>
                  )}
                </>
              )}

              <div className="drawer-nav-section-title">About & Support</div>
              <Link to="/about" className="drawer-nav-link">
                <i className="fa-solid fa-circle-info"></i> About AgroBaba
              </Link>
              <Link to="/contact" className="drawer-nav-link">
                <i className="fa-solid fa-headset"></i> Help & Contact
              </Link>

              {user && (
                <button
                  type="button"
                  className="drawer-nav-link drawer-logout-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setLogoutOpen(true);
                  }}
                >
                  <i className="fa-solid fa-right-from-bracket"></i> Log Out
                </button>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (Phone-sized viewports) */}
      <nav className="mobile-bottom-nav" aria-label="Quick mobile navigation">
        <Link to="/" className={`bottom-nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          <i className="fa-solid fa-house"></i>
          <span>Home</span>
        </Link>
        <Link to="/shop" className={`bottom-nav-item ${location.pathname === '/shop' ? 'active' : ''}`}>
          <i className="fa-solid fa-store"></i>
          <span>Shop</span>
        </Link>
        <Link to="/demands" className={`bottom-nav-item ${location.pathname.startsWith('/demands') ? 'active' : ''}`}>
          <i className="fa-solid fa-clipboard-list"></i>
          <span>Demands</span>
        </Link>
        <Link to="/cart" className={`bottom-nav-item ${location.pathname === '/cart' ? 'active' : ''}`}>
          <div className="bottom-nav-icon-wrap">
            <i className="fa-solid fa-cart-shopping"></i>
            {count > 0 && <span className="bottom-nav-badge">{count}</span>}
          </div>
          <span>Cart</span>
        </Link>
        <Link
          to={user ? '/account' : '/login'}
          className={`bottom-nav-item ${location.pathname.startsWith('/account') || location.pathname === '/login' ? 'active' : ''}`}
        >
          <i className="fa-regular fa-circle-user"></i>
          <span>{user ? 'Account' : 'Sign In'}</span>
        </Link>
      </nav>

      {/* Logout confirmation dialog */}
      <ConfirmDialog
        open={logoutOpen}
        title="Log out?"
        message="Are you sure you want to log out of your AgroBaba account?"
        confirmLabel="Log out"
        onConfirm={handleLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </>
  );
}
