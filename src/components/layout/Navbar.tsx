import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useMessagesBadge } from '../../contexts/MessagesContext';
import { NotificationBell } from './NotificationBell';
import { SearchSuggest } from '../SearchSuggest';
import { ConfirmDialog } from '../ConfirmDialog';
import type { Suggestion } from '../../lib/search';

export function Navbar({ compact = false }: { compact?: boolean }) {
  const { user, status, logout } = useAuth();
  const { count } = useCart();
  const { unreadCount } = useMessagesBadge();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  function doSearch(value: string = query) {
    if (!value.trim()) return;
    navigate(`/shop?search=${encodeURIComponent(value.trim())}`);
  }

  function goToProduct(item: Suggestion) {
    setQuery('');
    navigate(`/shop/product/${item.value}`);
  }

  function handleLogout() {
    setLogoutOpen(false);
    logout();
    navigate('/');
  }

  return (
    <nav id="main-navbar">
      <div className="container navbar-inner">
        <Link className="navbar-brand" to="/">
          <i className="fa-solid fa-seedling"></i> Agro<span>baba</span>
        </Link>

        {compact && !searchOpen ? (
          <button
            type="button"
            className="nav-icon-btn"
            title="Search"
            onClick={() => setSearchOpen(true)}
            style={{ marginLeft: 'auto', marginRight: 8 }}
          >
            <i className="fa-solid fa-magnifying-glass"></i>
          </button>
        ) : (
          <>
            <div className="search-wrap">
              <i className="fa-solid fa-magnifying-glass"></i>
              <SearchSuggest
                value={query}
                onChange={setQuery}
                onSubmit={(v) => { doSearch(v); if (compact) setSearchOpen(false); }}
                onSelectResult={goToProduct}
                scope="products"
                placeholder='Search "tomatoes Ibadan", "NPK fertilizer", "poultry vet Lagos"'
                autoFocus={compact}
              />
            </div>
            <button className="search-btn" onClick={() => { doSearch(); if (compact) setSearchOpen(false); }}>
              <i className="fa-solid fa-magnifying-glass"></i> {!compact && 'Search'}
            </button>
          </>
        )}

        <div className="nav-actions" id="auth-links">
          {status === 'initializing' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 12 }}>
              <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }}></i>
              Checking session…
            </div>
          ) : (
            !user ? (
            <ul style={{ display: 'flex', alignItems: 'center', gap: 0, margin: 0, padding: 0 }}>
              <li>
                <Link to="/login" className="btn-login">
                  <i className="fa-solid fa-right-to-bracket"></i> Login
                </Link>
              </li>
              <li style={{ marginLeft: 8 }}>
                <Link to="/register" className="btn-join">
                  <i className="fa-solid fa-user-plus"></i> Join Free
                </Link>
              </li>
            </ul>
          ) : (
            <ul style={{ display: 'flex', alignItems: 'center', gap: 0, margin: 0, padding: 0 }}>
              <li>
                <Link to="/messages" className="nav-icon-btn" title="Messages">
                  <i className="fa-regular fa-comments"></i>
                  <span>Messages</span>
                  {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
                </Link>
              </li>
              <li>
                <NotificationBell />
              </li>
              <li>
                <Link to="/cart" className="nav-icon-btn" title="Cart">
                  <i className="fa-solid fa-cart-shopping"></i>
                  <span>Cart</span>
                  {count > 0 && <span className="nav-badge">{count}</span>}
                </Link>
              </li>
              <li>
                <Link to="/account" className="nav-icon-btn" title="My Account">
                  <i className="fa-regular fa-user"></i>
                  <span>{user.name.split(' ')[0]}</span>
                </Link>
              </li>
              <li>
                <button className="btn-login" style={{ marginLeft: 4 }} onClick={() => setLogoutOpen(true)}>
                  <i className="fa-solid fa-right-from-bracket"></i> Logout
                </button>
              </li>
            </ul>
            ))}
        </div>
      </div>
      <ConfirmDialog
        open={logoutOpen}
        title="Log out?"
        message="Are you sure you want to log out of your Agro-baba account?"
        confirmLabel="Log out"
        onConfirm={handleLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </nav>
  );
}
