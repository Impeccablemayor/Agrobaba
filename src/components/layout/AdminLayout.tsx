import { useState, type FormEvent } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from './NotificationBell';
import { ConfirmDialog } from '../ConfirmDialog';

interface NavItem {
  to: string;
  icon: string;
  label: string;
  isActive: (pathname: string, search: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', icon: 'fa-gauge', label: 'Overview', isActive: (p) => p === '/admin' },
  { to: '/admin/orders', icon: 'fa-receipt', label: 'Orders', isActive: (p, s) => p === '/admin/orders' && !s.includes('tab=payments') },
  { to: '/admin/orders?tab=payments', icon: 'fa-money-check-dollar', label: 'Payments', isActive: (p, s) => p === '/admin/orders' && s.includes('tab=payments') },
  { to: '/admin/verifications', icon: 'fa-user-check', label: 'Verifications', isActive: (p) => p === '/admin/verifications' },
  { to: '/admin/flash-sales', icon: 'fa-fire', label: 'Flash Sales', isActive: (p) => p === '/admin/flash-sales' },
  { to: '/admin/coupons', icon: 'fa-tag', label: 'Coupons', isActive: (p) => p === '/admin/coupons' },
  { to: '/admin/tickets', icon: 'fa-headset', label: 'Support Tickets', isActive: (p) => p === '/admin/tickets' },
  { to: '/admin/activity', icon: 'fa-clock-rotate-left', label: 'Admin Activity', isActive: (p) => p === '/admin/activity' },
];

/** Best-effort admin search - order invoice numbers are the most common lookup, so route there
 *  with the query prefilled. Orders/Verifications each own their own in-page search beyond this. */
function AdminSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/admin/orders?search=${encodeURIComponent(q.trim())}`);
  }

  return (
    <form onSubmit={submit} className="admin-topbar-search">
      <i className="fa-solid fa-magnifying-glass"></i>
      <input
        type="text"
        placeholder="Search orders by invoice, buyer, seller…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </form>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutOpen, setLogoutOpen] = useState(false);

  function handleLogout() {
    setLogoutOpen(false);
    logout();
    navigate('/portal-77x-admin');
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/admin" className="admin-sidebar-brand">
          <i className="fa-solid fa-seedling"></i> Agro<span>baba</span>
          <span className="admin-sidebar-brand-tag">Admin</span>
        </Link>
        <nav className="admin-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`admin-nav-link ${item.isActive(location.pathname, location.search) ? 'active' : ''}`}
            >
              <i className={`fa-solid ${item.icon}`}></i>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-nav-link">
            <i className="fa-solid fa-arrow-left"></i> Back to marketplace
          </Link>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <AdminSearch />
          <div className="admin-topbar-actions">
            <span className={`admin-env-badge ${import.meta.env.DEV ? 'is-dev' : 'is-prod'}`}>
              <i className="fa-solid fa-circle"></i> {import.meta.env.DEV ? 'Development' : 'Production'}
            </span>
            <NotificationBell />
            <div className="admin-topbar-user">
              <i className="fa-solid fa-user-shield"></i>
              <span>{user?.name || 'Admin'}</span>
            </div>
            <button className="btn-outline btn-sm btn-inline" onClick={() => setLogoutOpen(true)}>
              <i className="fa-solid fa-right-from-bracket"></i> Logout
            </button>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        title="Log out?"
        message="Are you sure you want to log out of the admin console?"
        confirmLabel="Log out"
        onConfirm={handleLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  );
}
