import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getProducts } from '../../lib/products';
import { ProductCard } from '../../components/ProductCard';
import type { Product, ProductType } from '../../types';

const TABS = [
  { key: 'all', label: 'All Listings', icon: 'fa-border-all' },
  { key: 'produce', label: 'Fresh Produce', icon: 'fa-wheat-awn' },
  { key: 'inputs', label: 'Agro Inputs', icon: 'fa-flask' },
  { key: 'equipment', label: 'Equipment', icon: 'fa-tractor' },
  { key: 'services', label: 'Services', icon: 'fa-hand-holding-medical' },
];

const TYPE_MAP: Record<string, ProductType | 'all'> = {
  all: 'all', produce: 'produce', inputs: 'product', equipment: 'product', services: 'service',
};
const CATEGORY_MAP: Record<string, string> = { equipment: 'Equipment Hire' };

const FILTER_PILLS = [
  { key: 'all', label: 'All', icon: 'fa-border-all' },
  { key: 'Vegetables', label: 'Vegetables', icon: 'fa-apple-whole' },
  { key: 'Grains', label: 'Grains', icon: 'fa-wheat-awn' },
  { key: 'Tubers', label: 'Tubers', icon: 'fa-leaf' },
  { key: 'Fish', label: 'Fish', icon: 'fa-fish' },
  { key: 'Poultry', label: 'Poultry', icon: 'fa-egg' },
  { key: 'Fertilizers', label: 'Fertilizers', icon: 'fa-flask' },
  { key: 'Pesticides', label: 'Pesticides', icon: 'fa-spray-can-sparkles' },
  { key: 'Animal Feed', label: 'Animal Feed', icon: 'fa-bone' },
  { key: 'Irrigation', label: 'Irrigation', icon: 'fa-droplet' },
  { key: 'Veterinary', label: 'Veterinary', icon: 'fa-stethoscope' },
  { key: 'Consultancy', label: 'Consultancy', icon: 'fa-user-tie' },
];

export default function ShopPage() {
  const [searchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') || 'all';
  const urlSearch = searchParams.get('search') || '';

  const [tab, setTab] = useState(urlTab);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState(urlSearch);
  const [sort, setSort] = useState('newest');
  const [products, setProducts] = useState<Product[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(value), 300);
  }

  useEffect(() => {
    void (async () => {
      const filters: { type?: ProductType | 'all'; category?: string; search?: string } = { search };
      if (tab !== 'all') {
        filters.type = TYPE_MAP[tab];
        if (CATEGORY_MAP[tab]) filters.category = CATEGORY_MAP[tab];
      }
      if (category !== 'all') {
        filters.category = category;
        filters.type = 'all';
      }
      const list = await getProducts(filters);
      setProducts(list);
    })();
  }, [tab, category, search]);

  const sortedProducts = useMemo(() => {
    let list = [...products];
    if (sort === 'price-low') list = list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-high') list = list.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') list = list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === 'popular') list = list.sort((a, b) => (b.sold || 0) - (a.sold || 0));
    return list;
  }, [products, sort]);

  function resetFilters() {
    setTab('all');
    setCategory('all');
    setSearch('');
    setSort('newest');
  }

  return (
    <div className="section">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item active">Shop</li>
          </ol>
        </nav>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>
            Shop Agricultural Products
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Browse quality listings from verified farmers, dealers and service providers across Nigeria.
          </p>
        </div>

        <div className="shop-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`shop-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => { setTab(t.key); setCategory('all'); }}
            >
              <i className={`fa-solid ${t.icon}`}></i> {t.label}
            </button>
          ))}
        </div>

        <div className="shop-search">
          <input
            type="text"
            placeholder="🔍 Search by name, category, location, seller..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <div className="filter-pills">
          {FILTER_PILLS.map((p) => (
            <button
              key={p.key}
              className={`filter-pill ${category === p.key ? 'active' : ''}`}
              onClick={() => { setCategory(p.key); if (p.key !== 'all') setTab('all'); }}
            >
              <i className={`fa-solid ${p.icon}`}></i> {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
            {sortedProducts.length} listing{sortedProducts.length !== 1 ? 's' : ''} found
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Sort by:</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{ border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius-sm)', padding: '6px 10px', fontSize: 12, outline: 'none', cursor: 'pointer' }}
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>

        {sortedProducts.length === 0 ? (
          <div className="empty-cart" style={{ gridColumn: '1/-1', margin: '24px 0' }}>
            <i className="fa-solid fa-store-slash"></i>
            <p>No listings found. Try a different search or category.</p>
            <button onClick={resetFilters} className="btn-secondary btn-inline btn-sm">
              <i className="fa-solid fa-rotate"></i> Clear filters
            </button>
          </div>
        ) : (
          <div className="grid-4">
            {sortedProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
