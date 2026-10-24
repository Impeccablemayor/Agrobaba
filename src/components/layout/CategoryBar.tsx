import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCategories } from '../../hooks/queries/useCategories';
import { getSectionIdByCode } from '../../lib/categories';
import type { Category } from '../../types';

interface CatLink {
  href: string;
  icon: string;
  label: string;
  match: (path: string, search: string) => boolean;
}

function buildSectionLinks(categories: Category[]): CatLink[] {
  const sectionHref = (code: string) => {
    const id = getSectionIdByCode(categories, code);
    return id ? `/shop?categoryId=${encodeURIComponent(id)}` : '/shop';
  };

  return [
    {
      href: '/shop',
      icon: 'fa-border-all',
      label: 'All Marketplace',
      match: (p, s) => p === '/shop' && !s,
    },
    {
      href: sectionHref('produce'),
      icon: 'fa-wheat-awn',
      label: 'Fresh Produce',
      match: (_p, s) => s.includes(`categoryId=${getSectionIdByCode(categories, 'produce') || '\0'}`),
    },
    {
      href: sectionHref('inputs'),
      icon: 'fa-flask',
      label: 'Agro Inputs',
      match: (_p, s) => s.includes(`categoryId=${getSectionIdByCode(categories, 'inputs') || '\0'}`),
    },
    {
      href: sectionHref('livestock'),
      icon: 'fa-cow',
      label: 'Livestock & Animals',
      match: (_p, s) => s.includes(`categoryId=${getSectionIdByCode(categories, 'livestock') || '\0'}`),
    },
    {
      href: sectionHref('equipment'),
      icon: 'fa-tractor',
      label: 'Farm Equipment',
      match: (_p, s) => s.includes(`categoryId=${getSectionIdByCode(categories, 'equipment') || '\0'}`),
    },
    {
      href: sectionHref('services'),
      icon: 'fa-hand-holding-medical',
      label: 'Agro Services',
      match: (_p, s) => s.includes(`categoryId=${getSectionIdByCode(categories, 'services') || '\0'}`),
    },
    {
      href: '/demands',
      icon: 'fa-clipboard-list',
      label: 'Demand Board',
      match: (p) => p.startsWith('/demands'),
    },
  ];
}

export function CategoryBar() {
  const location = useLocation();
  const { data: categories = [] } = useCategories();
  const scrollRef = useRef<HTMLUListElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const links = buildSectionLinks(categories);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  }

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [links.length]);

  function scrollBy(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  }

  return (
    <div id="category-bar" className="category-subnav">
      <div className="container cat-scroll-wrap">
        {canScrollLeft && (
          <button
            type="button"
            className="cat-scroll-btn cat-scroll-btn-left"
            onClick={() => scrollBy(-220)}
            aria-label="Scroll categories left"
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>
        )}

        <ul
          id="category-pills-list"
          className="category-list"
          ref={scrollRef}
          onScroll={updateScrollState}
        >
          {links.map((link) => {
            const isActive = link.match(location.pathname, location.search);
            return (
              <li key={link.label} className="cat-pill-item">
                <Link
                  to={link.href}
                  className={`cat-pill ${isActive ? 'active' : ''}`}
                >
                  <i className={`fa-solid ${link.icon}`}></i>
                  <span>{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {canScrollRight && (
          <button
            type="button"
            className="cat-scroll-btn cat-scroll-btn-right"
            onClick={() => scrollBy(220)}
            aria-label="Scroll categories right"
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        )}
      </div>
    </div>
  );
}
