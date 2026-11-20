import { useState, type FormEvent } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationBell } from './NotificationBell';
import { ConfirmDialog } from '../ConfirmDialog';
import { useQuery } from '@tanstack/react-query';
import { canOpen, getAdminMe, PAGE_PERMISSION } from '../../lib/adminAccess';

interface NavItem {
  to: string;
  icon: string;
  label: string;
  isActive: (pathname: string, search: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', icon: 'fa-gauge', label: 'Overview', isActive: (p) => p === '/admin' },
  { to: '/admin/finance', icon: 'fa-chart-pie', label: 'Finance', isActive: (p) => p === '/admin/finance' },
  { to: '/admin/reconciliation', icon: 'fa-scale-balanced', label: 'Reconciliation', isActive: (p) => p === '/admin/reconciliation' },
  { to: '/admin/approvals', icon: 'fa-user-check', label: 'Approvals', isActive: (p) => p === '/admin/approvals' },
  { to: '/admin/users', icon: 'fa-users', label: 'Users', isActive: (p) => p.startsWith('/admin/users') },
  { to: '/admin/products', icon: 'fa-boxes-stacked', label: 'Products', isActive: (p) => p.startsWith('/admin/products') },
  { to: '/admin/demands', icon: 'fa-bullhorn', label: 'Buyer Demands', isActive: (p) => p.startsWith('/admin/demands') },
  { to: '/admin/orders', icon: 'fa-receipt', label: 'Orders', isActive: (p) => p === '/admin/orders' },
  { to: '/admin/payments', icon: 'fa-credit-card', label: 'Payments', isActive: (p) => p === '/admin/payments' },
  { to: '/admin/payouts', icon: 'fa-money-bill-transfer', label: 'Payouts', isActive: (p) => p === '/admin/payouts' },
  { to: '/admin/ledger', icon: 'fa-book', label: 'Ledger', isActive: (p) => p === '/admin/ledger' },
  { to: '/admin/transactions', icon: 'fa-handshake', label: 'Bookings & Quotes', isActive: (p) => p === '/admin/transactions' },
  { to: '/admin/disputes', icon: 'fa-scale-balanced', label: 'Disputes', isActive: (p) => p === '/admin/disputes' },
  { to: '/admin/inspection', icon: 'fa-magnifying-glass-chart', label: 'Inspection Periods', isActive: (p) => p === '/admin/inspection' },
  { to: '/admin/logistics', icon: 'fa-truck-ramp-box', label: 'Logistics & Transporters', isActive: (p) => p.startsWith('/admin/logistics') },
  { to: '/admin/verifications', icon: 'fa-user-check', label: 'Verifications', isActive: (p) => p === '/admin/verifications' },
  { to: '/admin/flash-sales', icon: 'fa-fire', label: 'Flash Sales', isActive: (p) => p === '/admin/flash-sales' },
  { to: '/admin/coupons', icon: 'fa-tag', label: 'Coupons', isActive: (p) => p === '/admin/coupons' },
  { to: '/admin/influencers', icon: 'fa-bullhorn', label: 'Influencers', isActive: (p) => p === '/admin/influencers' },
  { to: '/admin/tickets', icon: 'fa-headset', label: 'Support Tickets', isActive: (p) => p === '/admin/tickets' },
  { to: '/admin/categories', icon: 'fa-folder-tree', label: 'Categories', isActive: (p) => p === '/admin/categories' },
  { to: '/admin/personalization', icon: 'fa-brain', label: 'Personalization', isActive: (p) => p === '/admin/personalization' },
  { to: '/admin/activity', icon: 'fa-clock-rotate-left', label: 'Admin Activity', isActive: (p) => p === '/admin/activity' },
  { to: '/admin/emails', icon: 'fa-envelope', label: 'Email Logs', isActive: (p) => p === '/admin/emails' || p.startsWith('/admin/emails') },
  { to: '/admin/team', icon: 'fa-people-group', label: 'Admin Team', isActive: (p) => p === '/admin/team' },
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
  // Batch 8: the admin's role decides which pages show (the backend enforces it on every request).
  const { data: me } = useQuery({ queryKey: ['admin', 'me'], queryFn: getAdminMe, staleTime: 60_000 });
  const section = '/' + location.pathname.split('/').filter(Boolean).slice(0, 2).join('/');
  const known = section in PAGE_PERMISSION;
  const blocked = !!me && known && !canOpen(me, section);

  function handleLogout() {
    setLogoutOpen(false);
    logout();
    navigate('/portal-77x-admin');
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link to="/admin" className="admin-sidebar-brand" aria-label="Agrobaba Admin Home">
          <img src="/agrobaba-logo.png" alt="AgroBaba" className="admin-brand-logo-img" />
          <span className="admin-sidebar-brand-tag">Admin</span>
        </Link>
        <nav className="admin-sidebar-nav">
          {NAV_ITEMS.filter((item) => !me || canOpen(me, item.to)).map((item) => (
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
              <i className="fa-solid fa-circle"></i> <span className="admin-topbar-label">{import.meta.env.DEV ? 'Development' : 'Production'}</span>
            </span>
            <NotificationBell />
            <div className="admin-topbar-user">
              <i className="fa-solid fa-user-shield"></i>
              <span className="admin-topbar-label">{user?.name || 'Admin'}{me?.roleLabel ? ` · ${me.roleLabel}` : ''}</span>
            </div>
            <button className="btn-outline btn-sm btn-inline" aria-label="Logout" onClick={() => setLogoutOpen(true)}>
              <i className="fa-solid fa-right-from-bracket"></i> <span className="admin-topbar-label">Logout</span>
            </button>
          </div>
        </header>

        <main className="admin-content">
          {blocked ? (
            <div className="empty-cart">
              <i className="fa-solid fa-lock"></i>
              <p>This page isn’t available for your role ({me?.roleLabel ?? 'no admin role'}). Ask a super administrator if you need it.</p>
            </div>
          ) : <Outlet />}
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
