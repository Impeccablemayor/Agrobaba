import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getMyProducts } from '../../lib/products';
import { getMyOrders, getMySales } from '../../lib/orders';
import { getMyDemands } from '../../lib/demands';
import { getMyConversations } from '../../lib/messages';
import { getCartCount } from '../../lib/cart';
import { getMyVerificationStatus } from '../../lib/verification';
import { formatDate, formatPrice, timeAgo } from '../../lib/format';
import type { Demand, Order, Product, Role, Conversation } from '../../types';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';

interface MenuLink { href: string; icon: string; label: string; active?: boolean; danger?: boolean; }

const COMMON_LINKS = (unread: number): MenuLink[] => [
  { href: '/account', icon: 'fa-user', label: 'My Profile', active: true },
  { href: '/messages', icon: 'fa-comments', label: `Messages ${unread > 0 ? `(${unread})` : ''}` },
  { href: '/account/edit', icon: 'fa-pen-to-square', label: 'Edit Profile' },
  { href: '/account/change-password', icon: 'fa-lock', label: 'Change Password' },
  { href: '/account/delete', icon: 'fa-trash', label: 'Delete Account', danger: true },
];

const ROLE_LINKS: Record<Role, MenuLink[]> = {
  farmer: [
    { href: '/account/post-listing', icon: 'fa-plus-circle', label: 'Post Produce' },
    { href: '/account/my-listings', icon: 'fa-list', label: 'My Listings' },
    { href: '/account/my-orders', icon: 'fa-box', label: 'My Orders' },
    { href: '/account/my-sales', icon: 'fa-coins', label: 'My Sales' },
    { href: '/demands', icon: 'fa-clipboard-list', label: 'Browse Demands' },
    { href: '/demands/new', icon: 'fa-pen-to-square', label: 'Post a Demand' },
    { href: '/demands/mine', icon: 'fa-clipboard-check', label: 'My Demands' },
    { href: '/account/verify', icon: 'fa-user-check', label: 'Verify Account' },
  ],
  'agro-dealer': [
    { href: '/account/post-listing', icon: 'fa-plus-circle', label: 'Post Product' },
    { href: '/account/my-listings', icon: 'fa-list', label: 'My Listings' },
    { href: '/account/my-orders', icon: 'fa-box', label: 'My Orders' },
    { href: '/account/my-sales', icon: 'fa-coins', label: 'My Sales' },
    { href: '/demands', icon: 'fa-clipboard-list', label: 'Browse Demands' },
    { href: '/demands/new', icon: 'fa-pen-to-square', label: 'Post a Demand' },
    { href: '/demands/mine', icon: 'fa-clipboard-check', label: 'My Demands' },
    { href: '/account/verify', icon: 'fa-user-check', label: 'Verify Account' },
  ],
  'service-provider': [
    { href: '/account/post-listing', icon: 'fa-plus-circle', label: 'Post Service' },
    { href: '/account/my-listings', icon: 'fa-list', label: 'My Services' },
    { href: '/account/my-orders', icon: 'fa-calendar-check', label: 'My Bookings' },
    { href: '/account/my-sales', icon: 'fa-coins', label: 'My Earnings' },
    { href: '/demands', icon: 'fa-clipboard-list', label: 'Browse Demands' },
    { href: '/demands/new', icon: 'fa-pen-to-square', label: 'Post a Demand' },
    { href: '/demands/mine', icon: 'fa-clipboard-check', label: 'My Demands' },
    { href: '/account/verify', icon: 'fa-user-check', label: 'Verify Account' },
  ],
  buyer: [
    { href: '/demands/new', icon: 'fa-pen-to-square', label: 'Post Demand' },
    { href: '/demands/mine', icon: 'fa-clipboard-list', label: 'My Demands' },
    { href: '/account/my-orders', icon: 'fa-box', label: 'My Orders' },
    { href: '/cart', icon: 'fa-cart-shopping', label: 'My Cart' },
    { href: '/shop', icon: 'fa-store', label: 'Browse Shop' },
  ],
  admin: [
    { href: '/admin/verifications', icon: 'fa-user-check', label: 'Review Verifications' },
  ],
};

const QUICK_ACTIONS: Record<Role, { href: string; icon: string; label: string; style: string }[]> = {
  farmer: [
    { href: '/account/post-listing', icon: 'fa-plus', label: 'Post Produce', style: 'btn-primary' },
    { href: '/account/my-listings', icon: 'fa-list', label: 'My Listings', style: 'btn-outline' },
    { href: '/demands', icon: 'fa-clipboard-list', label: 'Browse Demands', style: 'btn-outline' },
    { href: '/demands/new', icon: 'fa-pen', label: 'Post a Demand', style: 'btn-outline' },
    { href: '/account/my-sales', icon: 'fa-coins', label: 'View Sales', style: 'btn-outline' },
  ],
  'agro-dealer': [
    { href: '/account/post-listing', icon: 'fa-plus', label: 'Post Product', style: 'btn-primary' },
    { href: '/account/my-listings', icon: 'fa-list', label: 'My Listings', style: 'btn-outline' },
    { href: '/demands', icon: 'fa-clipboard-list', label: 'Browse Demands', style: 'btn-outline' },
    { href: '/demands/new', icon: 'fa-pen', label: 'Post a Demand', style: 'btn-outline' },
    { href: '/account/my-sales', icon: 'fa-coins', label: 'View Sales', style: 'btn-outline' },
  ],
  'service-provider': [
    { href: '/account/post-listing', icon: 'fa-plus', label: 'Post Service', style: 'btn-primary' },
    { href: '/account/my-listings', icon: 'fa-list', label: 'My Services', style: 'btn-outline' },
    { href: '/demands', icon: 'fa-clipboard-list', label: 'Browse Demands', style: 'btn-outline' },
    { href: '/demands/new', icon: 'fa-pen', label: 'Post a Demand', style: 'btn-outline' },
    { href: '/account/my-orders', icon: 'fa-calendar-check', label: 'My Bookings', style: 'btn-outline' },
  ],
  buyer: [
    { href: '/demands/new', icon: 'fa-pen', label: 'Post a Demand', style: 'btn-primary' },
    { href: '/shop', icon: 'fa-store', label: 'Browse Shop', style: 'btn-outline' },
    { href: '/account/my-orders', icon: 'fa-box', label: 'My Orders', style: 'btn-outline' },
    { href: '/cart', icon: 'fa-cart-shopping', label: 'View Cart', style: 'btn-outline' },
  ],
  admin: [
    { href: '/admin/verifications', icon: 'fa-user-check', label: 'Review Verifications', style: 'btn-primary' },
  ],
};

export default function MyAccountPage() {
  const { user } = useAuth();
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [mySales, setMySales] = useState<Order[]>([]);
  const [myDemands, setMyDemands] = useState<Demand[]>([]);
  const [myConvs, setMyConvs] = useState<Conversation[]>([]);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadData() {
      if (!user) return;
      setLoading(true);
      const [products, orders, sales, demands, conversations, verification] = await Promise.all([
        getMyProducts(),
        getMyOrders(),
        getMySales(),
        getMyDemands(),
        getMyConversations(),
        getMyVerificationStatus(),
      ]);

      if (!active) return;
      setMyProducts(products);
      setMyOrders(orders);
      setMySales(sales);
      setMyDemands(demands);
      setMyConvs(conversations);
      setVerified(verification?.verified ?? user.verified);
      setLoading(false);
    }

    void loadData();
    return () => { active = false; };
  }, [user]);

  if (!user) return null;
  const unread = myConvs.reduce((s, c) => s + c.unread, 0);
  const totalRevenue = mySales
    .filter((o) => o.paid)
    .reduce((s, o) => s + o.items.filter((i) => i.sellerId === user.id).reduce((ss, i) => ss + i.price * i.quantity, 0), 0);

  const menuLinks = [...ROLE_LINKS[user.role], ...COMMON_LINKS(unread)];

  const statsConfig: Record<Role, { icon: string; label: string; value: string | number; color: string }[]> = {
    farmer: [
      { icon: 'fa-list', label: 'Listings', value: myProducts.length, color: 'var(--primary)' },
      { icon: 'fa-coins', label: 'Total Sales', value: mySales.length, color: 'var(--accent)' },
      { icon: 'fa-box', label: 'Orders', value: myOrders.length, color: 'var(--primary)' },
      { icon: 'fa-clipboard-list', label: 'My Demands', value: myDemands.length, color: 'var(--danger)' },
    ],
    'agro-dealer': [
      { icon: 'fa-list', label: 'Products', value: myProducts.length, color: 'var(--primary)' },
      { icon: 'fa-coins', label: 'Total Sales', value: mySales.length, color: 'var(--accent)' },
      { icon: 'fa-box', label: 'Orders', value: myOrders.length, color: 'var(--primary)' },
      { icon: 'fa-clipboard-list', label: 'My Demands', value: myDemands.length, color: 'var(--danger)' },
    ],
    'service-provider': [
      { icon: 'fa-list', label: 'Services', value: myProducts.length, color: 'var(--primary)' },
      { icon: 'fa-calendar-check', label: 'Bookings', value: mySales.length, color: 'var(--accent)' },
      { icon: 'fa-clipboard-list', label: 'My Demands', value: myDemands.length, color: 'var(--danger)' },
      { icon: 'fa-naira-sign', label: 'Revenue', value: formatPrice(totalRevenue), color: 'var(--primary)' },
    ],
    buyer: [
      { icon: 'fa-clipboard-list', label: 'My Demands', value: myDemands.length, color: 'var(--primary)' },
      { icon: 'fa-box', label: 'Orders', value: myOrders.length, color: 'var(--accent)' },
      { icon: 'fa-cart-shopping', label: 'Cart Items', value: getCartCount(), color: 'var(--primary)' },
      { icon: 'fa-comments', label: 'Unread Msgs', value: unread, color: 'var(--danger)' },
    ],
    admin: [
      { icon: 'fa-user-check', label: 'Role', value: 'Administrator', color: 'var(--primary)' },
    ],
  };
  const stats = statsConfig[user.role];
  const actions = QUICK_ACTIONS[user.role];

  if (loading) {
    return (
      <div className="account-container">
        <div className="account-menu">
          <div className="menu-header"><i className="fa-solid fa-circle-user"></i> My Account</div>
        </div>
        <div id="account-summary">
          <PageLoadingSpinner message="Loading your account overview…" />
        </div>
      </div>
    );
  }

  const recentActivity: { icon: string; color: string; text: string; sub: string; time: string; status: string }[] = [];
  myOrders.slice(0, 3).forEach((o) =>
    recentActivity.push({
      icon: 'fa-box', color: 'var(--primary)',
      text: `Order placed — ${formatPrice(o.total)}`,
      sub: o.invoiceNumber, time: timeAgo(o.createdAt), status: o.paid ? 'paid' : 'pending',
    })
  );
  mySales.slice(0, 3).forEach((o) =>
    recentActivity.push({
      icon: 'fa-coins', color: 'var(--accent)',
      text: `Sale received from ${o.buyerName}`,
      sub: o.invoiceNumber, time: timeAgo(o.createdAt), status: o.paid ? 'paid' : 'unpaid',
    })
  );
  recentActivity.sort((a, b) => b.time.localeCompare(a.time));

  return (
    <div className="account-container">
      <div className="account-menu">
        <div className="menu-header">
          <i className="fa-solid fa-circle-user"></i> My Account
        </div>
        <div>
          {menuLinks.map((link) => (
            <Link key={link.href + link.label} to={link.href} className={`${link.active ? 'active' : ''} ${link.danger ? 'logout-link' : ''}`}>
              <i className={`fa-solid ${link.icon}`}></i> {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div id="account-summary">
        <div className="summary-header">
          <div>
            <h2>Welcome, {user.name.split(' ')[0]}!</h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Member since {formatDate(user.joinedAt)}</p>
          </div>
          <span className="role-badge">{user.role}</span>
        </div>

        <div className="stats-grid">
          {stats.map((s) => (
            <div className="stat-card" key={s.label}>
              <div className="stat-icon"><i className={`fa-solid ${s.icon}`} style={{ color: s.color }}></i></div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 28 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            Quick Actions
          </h4>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {actions.map((a) => (
              <Link key={a.href + a.label} to={a.href} className={`${a.style} btn-inline btn-sm`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <i className={`fa-solid ${a.icon}`}></i> {a.label}
              </Link>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            Profile Details
          </h4>
          <div className="account-detail-grid">
            <div className="account-detail-item">
              <div className="label">Full Name</div>
              <div className="value">{user.name}</div>
            </div>
            <div className="account-detail-item">
              <div className="label">Email Address</div>
              <div className="value">{user.email}</div>
            </div>
            <div className="account-detail-item">
              <div className="label">Phone Number</div>
              <div className="value">{user.contact || '—'}</div>
            </div>
            <div className="account-detail-item">
              <div className="label">Location</div>
              <div className="value">{[user.city, user.country].filter(Boolean).join(', ') || '—'}</div>
            </div>
            <div className="account-detail-item">
              <div className="label">Role</div>
              <div className="value">{user.role}</div>
            </div>
            <div className="account-detail-item">
              <div className="label">Verification</div>
              <div className="value">
                {verified ? (
                  <span className="verified-chip"><i className="fa-solid fa-circle-check"></i> Verified</span>
                ) : (
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>Not verified yet</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
            Recent Activity
          </h4>
          {recentActivity.length === 0 ? (
            <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32, textAlign: 'center' }}>
              <i className="fa-regular fa-clock-rotate-left" style={{ fontSize: 32, color: 'var(--border-mid)', display: 'block', marginBottom: 12 }}></i>
              <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>No recent activity yet. Start by browsing the shop or posting a listing!</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                <Link to="/shop" className="btn-secondary btn-inline btn-sm"><i className="fa-solid fa-store"></i> Browse Shop</Link>
                <Link to="/demands" className="btn-outline btn-inline btn-sm"><i className="fa-solid fa-clipboard-list"></i> View Demands</Link>
              </div>
            </div>
          ) : (
            recentActivity.slice(0, 5).map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fa-solid ${a.icon}`} style={{ color: a.color }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{a.sub}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.time}</div>
                  <span className={`status-${a.status === 'paid' ? 'delivered' : 'pending'}`} style={{ fontSize: 10 }}>{a.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
