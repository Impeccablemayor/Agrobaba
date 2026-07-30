import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { Role } from '../../types';

interface CatLink {
  href: string;
  icon: string;
  label: string;
  match: (path: string, search: string) => boolean;
}

const publicLinks: CatLink[] = [
  { href: '/shop', icon: 'fa-border-all', label: 'All', match: (p, s) => p === '/shop' && !s },
  { href: '/shop?tab=produce', icon: 'fa-wheat-awn', label: 'Produce', match: (_p, s) => s.includes('tab=produce') },
  { href: '/shop?tab=inputs', icon: 'fa-flask', label: 'Agro Inputs', match: (_p, s) => s.includes('tab=inputs') },
  { href: '/shop?tab=equipment', icon: 'fa-tractor', label: 'Equipment', match: (_p, s) => s.includes('tab=equipment') },
  { href: '/shop?tab=services', icon: 'fa-hand-holding-medical', label: 'Services', match: (_p, s) => s.includes('tab=services') },
  { href: '/demands', icon: 'fa-clipboard-list', label: 'Demand Board', match: (p) => p === '/demands' },
];

const roleLinks: Record<Role, CatLink[]> = {
  farmer: [
    { href: '/account/post-listing', icon: 'fa-plus-circle', label: 'Post Produce', match: (p) => p === '/account/post-listing' },
    { href: '/account/my-listings', icon: 'fa-list', label: 'My Listings', match: (p) => p === '/account/my-listings' },
    { href: '/account/my-orders', icon: 'fa-box', label: 'My Orders', match: (p) => p === '/account/my-orders' },
    { href: '/account/my-sales', icon: 'fa-coins', label: 'My Sales', match: (p) => p === '/account/my-sales' },
    { href: '/account/my-bookings', icon: 'fa-calendar-check', label: 'My Bookings', match: (p) => p === '/account/my-bookings' },
    { href: '/messages', icon: 'fa-comments', label: 'Messages', match: (p) => p.startsWith('/messages') },
  ],
  'agro-dealer': [
    { href: '/account/post-listing', icon: 'fa-plus-circle', label: 'Post Product', match: (p) => p === '/account/post-listing' },
    { href: '/account/my-listings', icon: 'fa-list', label: 'My Listings', match: (p) => p === '/account/my-listings' },
    { href: '/account/my-orders', icon: 'fa-box', label: 'My Orders', match: (p) => p === '/account/my-orders' },
    { href: '/account/my-sales', icon: 'fa-coins', label: 'My Sales', match: (p) => p === '/account/my-sales' },
    { href: '/account/my-bookings', icon: 'fa-calendar-check', label: 'My Bookings', match: (p) => p === '/account/my-bookings' },
    { href: '/messages', icon: 'fa-comments', label: 'Messages', match: (p) => p.startsWith('/messages') },
  ],
  'service-provider': [
    { href: '/account/post-listing', icon: 'fa-plus-circle', label: 'Post Service', match: (p) => p === '/account/post-listing' },
    { href: '/account/my-listings', icon: 'fa-list', label: 'My Services', match: (p) => p === '/account/my-listings' },
    { href: '/account/my-orders', icon: 'fa-box', label: 'My Orders', match: (p) => p === '/account/my-orders' },
    { href: '/account/my-bookings', icon: 'fa-calendar-check', label: 'My Bookings', match: (p) => p === '/account/my-bookings' },
    { href: '/messages', icon: 'fa-comments', label: 'Messages', match: (p) => p.startsWith('/messages') },
  ],
  buyer: [
    { href: '/demands/new', icon: 'fa-pen-to-square', label: 'Post Demand', match: (p) => p === '/demands/new' },
    { href: '/demands/mine', icon: 'fa-clipboard-list', label: 'My Demands', match: (p) => p === '/demands/mine' },
    { href: '/account/my-orders', icon: 'fa-box', label: 'My Orders', match: (p) => p === '/account/my-orders' },
    { href: '/account/my-bookings', icon: 'fa-calendar-check', label: 'My Bookings', match: (p) => p === '/account/my-bookings' },
    { href: '/cart', icon: 'fa-cart-shopping', label: 'Cart', match: (p) => p === '/cart' },
    { href: '/messages', icon: 'fa-comments', label: 'Messages', match: (p) => p.startsWith('/messages') },
  ],
  admin: [
    { href: '/account/post-listing', icon: 'fa-plus-circle', label: 'Post Listing', match: (p) => p === '/account/post-listing' },
    { href: '/demands/new', icon: 'fa-pen-to-square', label: 'Post Demand', match: (p) => p === '/demands/new' },
    { href: '/admin/orders', icon: 'fa-receipt', label: 'Orders', match: (p) => p === '/admin/orders' },
    { href: '/admin/flash-sales', icon: 'fa-fire', label: 'Flash Sales', match: (p) => p === '/admin/flash-sales' },
    { href: '/admin/coupons', icon: 'fa-tag', label: 'Coupons', match: (p) => p === '/admin/coupons' },
    { href: '/admin/verifications', icon: 'fa-user-check', label: 'Verifications', match: (p) => p === '/admin/verifications' },
    { href: '/messages', icon: 'fa-comments', label: 'Messages', match: (p) => p.startsWith('/messages') },
  ],
};

export function CategoryBar() {
  const { user } = useAuth();
  const location = useLocation();

  const links = user ? [...publicLinks, ...(roleLinks[user.role] || [])] : publicLinks;

  return (
    <div id="category-bar">
      <div className="container">
        <ul id="role-nav" className="category-list">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                to={link.href}
                className={`cat-pill ${link.match(location.pathname, location.search) ? 'active' : ''}`}
              >
                <i className={`fa-solid ${link.icon}`}></i>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
