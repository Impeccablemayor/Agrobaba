import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useMessagesBadge } from '../../contexts/MessagesContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { unreadCount } = useMessagesBadge();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function doSearch() {
    if (!query.trim()) return;
    navigate(`/shop?search=${encodeURIComponent(query.trim())}`);
  }

  function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/');
    }
  }

  return (
    <nav id="main-navbar">
      <div className="container navbar-inner">
        <Link className="navbar-brand" to="/">
          <i className="fa-solid fa-seedling"></i> Agro<span>baba</span>
        </Link>

        <div className="search-wrap">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            type="text"
            placeholder='Search "tomatoes Ibadan", "NPK fertilizer", "poultry vet Lagos"'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          />
        </div>
        <button className="search-btn" onClick={doSearch}>
          <i className="fa-solid fa-magnifying-glass"></i> Search
        </button>

        <div className="nav-actions" id="auth-links">
          {!user ? (
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
                <button className="btn-login" style={{ marginLeft: 4 }} onClick={handleLogout}>
                  <i className="fa-solid fa-right-from-bracket"></i> Logout
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>
    </nav>
  );
}
