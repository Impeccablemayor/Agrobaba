import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCategories, getSectionIdByCode } from '../../lib/categories';
import type { Category, Role } from '../../types';

interface CatLink {
  href: string;
  icon: string;
  label: string;
  match: (path: string, search: string) => boolean;
}

/** Section links resolve their target category id at render time (from the live categories list)
 *  instead of hardcoding database ids, and instead of the old `?tab=` params Shop never read. */
function buildSectionLinks(categories: Category[]): CatLink[] {
  const sectionHref = (code: string) => {
    const id = getSectionIdByCode(categories, code);
    return id ? `/shop?categoryId=${encodeURIComponent(id)}` : '/shop';
  };
  return [
    { href: '/shop', icon: 'fa-border-all', label: 'All', match: (p, s) => p === '/shop' && !s },
    { href: sectionHref('produce'), icon: 'fa-wheat-awn', label: 'Produce', match: (_p, s) => s.includes(`categoryId=${getSectionIdByCode(categories, 'produce') || '\0'}`) },
    { href: sectionHref('inputs'), icon: 'fa-flask', label: 'Agro Inputs', match: (_p, s) => s.includes(`categoryId=${getSectionIdByCode(categories, 'inputs') || '\0'}`) },
    { href: sectionHref('equipment'), icon: 'fa-tractor', label: 'Equipment', match: (_p, s) => s.includes(`categoryId=${getSectionIdByCode(categories, 'equipment') || '\0'}`) },
    { href: sectionHref('services'), icon: 'fa-hand-holding-medical', label: 'Services', match: (_p, s) => s.includes(`categoryId=${getSectionIdByCode(categories, 'services') || '\0'}`) },
    { href: '/demands', icon: 'fa-clipboard-list', label: 'Demand Board', match: (p) => p === '/demands' },
  ];
}

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
    { href: '/admin', icon: 'fa-gauge', label: 'Admin Console', match: (p) => p.startsWith('/admin') },
    { href: '/messages', icon: 'fa-comments', label: 'Messages', match: (p) => p.startsWith('/messages') },
  ],
};

export function CategoryBar({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const location = useLocation();
  const [categories, setCategories] = useState<Category[]>([]);
  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    void getCategories().then(setCategories);
  }, []);

  const sectionLinks = buildSectionLinks(categories);
  const quickLabels = ['All', 'Produce', 'Services', 'Demand Board'];
  const links = compact
    ? sectionLinks.filter((l) => quickLabels.includes(l.label))
    : (user ? [...sectionLinks, ...(roleLinks[user.role] || [])] : sectionLinks);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links.length]);

  function scrollBy(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  }

  return (
    <div id="category-bar">
      <div className="container cat-scroll-wrap">
        {canScrollLeft && (
          <button className="cat-scroll-btn cat-scroll-btn-left" onClick={() => scrollBy(-200)} aria-label="Scroll left">
            <i className="fa-solid fa-chevron-left"></i>
          </button>
        )}
        <ul id="role-nav" className="category-list" ref={scrollRef} onScroll={updateScrollState}>
          {links.map((link) => (
            <li key={link.label}>
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
        {canScrollRight && (
          <button className="cat-scroll-btn cat-scroll-btn-right" onClick={() => scrollBy(200)} aria-label="Scroll right">
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        )}
      </div>
    </div>
  );
}
