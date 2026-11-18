import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCategories } from '../../hooks/queries/useCategories';
import { useProducts } from '../../hooks/queries/useProducts';
import { ProductCard } from '../../components/ProductCard';
import { SearchSuggest } from '../../components/SearchSuggest';
import { CategorySidebar } from '../../components/CategorySidebar';
import { getSearchSuggestions, type SuggestGroup, type Suggestion } from '../../lib/search';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  DEFAULT_MARKETPLACE_FILTERS, filterMarketplaceProducts, hasActiveMarketplaceFilters, type MarketplaceFilters,
} from '../../lib/marketplaceFilters';

function priceOrNull(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export default function ShopPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const urlCategoryId = searchParams.get('categoryId') || 'all';

  const [sectionId, setSectionId] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [inputValue, setInputValue] = useState(urlSearch);
  const [submittedQuery, setSubmittedQuery] = useState(urlSearch);
  const [sort, setSort] = useState('newest');
  const [noResultsHints, setNoResultsHints] = useState<SuggestGroup[]>([]);
  const [filters, setFilters] = useState<MarketplaceFilters>(DEFAULT_MARKETPLACE_FILTERS);
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data: states = [] } = useQuery({
    queryKey: ['locations', 'states'],
    queryFn: () => api.get<{ id: number; name: string }[]>('/api/states'),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const updateFilter = <K extends keyof MarketplaceFilters>(key: K, value: MarketplaceFilters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: categories = [] } = useCategories();

  useEffect(() => {
    if (urlCategoryId === 'all') {
      setSectionId('all');
      setCategoryId('all');
      return;
    }

    const selected = categories.find((category) => category.id === urlCategoryId);
    if (!selected) return;

    const parent = selected.level === 1
      ? selected
      : categories.find((category) => category.id === selected.parentId);
    const section = parent?.level === 1
      ? parent
      : categories.find((category) => category.id === parent?.parentId);

    setSectionId(section?.id || 'all');
    setCategoryId(selected.level === 1 ? 'all' : selected.id);
  }, [categories, urlCategoryId]);

  useEffect(() => {
    if (urlSearch !== submittedQuery) {
      setInputValue(urlSearch);
      setSubmittedQuery(urlSearch);
    }
  }, [urlSearch, submittedQuery]);

  const activeCategoryId = categoryId !== 'all' ? categoryId : (sectionId !== 'all' ? sectionId : undefined);

  const {
    data: products = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useProducts({ categoryId: activeCategoryId, search: submittedQuery });

  useEffect(() => {
    if (!isLoading && products.length === 0 && submittedQuery.trim()) {
      void getSearchSuggestions(submittedQuery.trim(), 'products').then((hints) => {
        setNoResultsHints(hints.filter((g) => g.type === 'category' || g.type === 'popular'));
      });
    } else {
      setNoResultsHints([]);
    }
  }, [isLoading, products.length, submittedQuery]);

  function handleSelectSection(id: string) {
    setSectionId(id);
    setCategoryId('all');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id === 'all') next.delete('categoryId'); else next.set('categoryId', id);
      return next;
    });
  }

  function handleSelectCategory(newSectionId: string, newCategoryId: string) {
    setSectionId(newSectionId);
    setCategoryId(newCategoryId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('categoryId', newCategoryId);
      return next;
    });
  }

  function handleSearch(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => submitSearch(value), 300);
  }

  function submitSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInputValue(value);
    setSubmittedQuery(value);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set('search', value); else next.delete('search');
      return next;
    }, { replace: true });
  }

  function goToProduct(item: Suggestion) {
    navigate(`/shop/product/${item.value}`);
  }

  const effectiveFilters = useMemo<MarketplaceFilters>(() => ({
    ...filters, minPrice: priceOrNull(minPriceInput), maxPrice: priceOrNull(maxPriceInput),
  }), [filters, minPriceInput, maxPriceInput]);
  const filtersActive = hasActiveMarketplaceFilters(effectiveFilters);

  const sortedProducts = useMemo(() => {
    let list = filterMarketplaceProducts(products, effectiveFilters);
    if (sort === 'price-low') list = list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    else if (sort === 'price-high') list = list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    else if (sort === 'rating') list = list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === 'popular') list = list.sort((a, b) => (b.sold || 0) - (a.sold || 0));
    return list;
  }, [products, sort, effectiveFilters]);

  // "Unfiltered + empty" means the backend returned nothing at all (likely asleep), which shows
  // the retry state; an empty result caused only by refinements shows "no listings found".
  const isUnfilteredView = !submittedQuery.trim() && categoryId === 'all' && sectionId === 'all' && !filtersActive;

  function clearRefinements() {
    setFilters(DEFAULT_MARKETPLACE_FILTERS);
    setMinPriceInput('');
    setMaxPriceInput('');
  }

  function resetFilters() {
    clearRefinements();
    setSectionId('all');
    setCategoryId('all');
    setInputValue('');
    setSubmittedQuery('');
    setSort('newest');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('categoryId');
      next.delete('search');
      return next;
    });
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

        <div className="shop-layout">
          <CategorySidebar
            categories={categories}
            sectionId={sectionId}
            categoryId={categoryId}
            onSelectSection={handleSelectSection}
            onSelectCategory={handleSelectCategory}
          />

          <div className="shop-content">
            <div className="shop-search" style={{ position: 'relative', display: 'flex' }}>
              <SearchSuggest
                value={inputValue}
                onChange={handleSearch}
                onSubmit={submitSearch}
                onSelectResult={goToProduct}
                scope="products"
                placeholder="🔍 Search by name, category, location, seller..."
              />
              {isFetching && (
                <i className="fa-solid fa-spinner fa-spin" style={{ position: 'absolute', right: 14, top: 14, color: 'var(--muted)' }}></i>
              )}
            </div>

            <div className="marketplace-filter-toggle-row">
              <button
                type="button" className={`btn-outline btn-sm btn-inline${filtersActive ? ' is-active' : ''}`}
                onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} aria-controls="marketplace-filters"
              >
                <i className="fa-solid fa-sliders"></i> Filters{filtersActive ? ' (on)' : ''}
              </button>
              {filtersActive && (
                <button type="button" className="btn-outline btn-sm btn-inline" onClick={clearRefinements}>
                  <i className="fa-solid fa-xmark"></i> Clear filters
                </button>
              )}
            </div>

            {filtersOpen && (
              <div className="marketplace-filters" id="marketplace-filters" aria-label="Marketplace filters">
                <label><span>Listing type</span>
                  <select value={filters.listingType} onChange={(e) => updateFilter('listingType', e.target.value as MarketplaceFilters['listingType'])}>
                    <option value="all">Products and services</option>
                    <option value="product">Products only</option>
                    <option value="service">Services only</option>
                  </select>
                </label>
                <label><span>Listed by</span>
                  <select value={filters.sellerRole} onChange={(e) => updateFilter('sellerRole', e.target.value as MarketplaceFilters['sellerRole'])}>
                    <option value="all">All sellers</option>
                    <option value="farmer">Farmers</option>
                    <option value="agro-dealer">Agro-dealers</option>
                    <option value="service-provider">Service providers</option>
                  </select>
                </label>
                <label><span>State / FCT</span>
                  <select value={filters.state} onChange={(e) => updateFilter('state', e.target.value)}>
                    <option value="">Anywhere in Nigeria</option>
                    {states.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </label>
                <label><span>Min price (₦)</span>
                  <input type="number" min="0" inputMode="numeric" placeholder="Any" value={minPriceInput} onChange={(e) => setMinPriceInput(e.target.value)} />
                </label>
                <label><span>Max price (₦)</span>
                  <input type="number" min="0" inputMode="numeric" placeholder="Any" value={maxPriceInput} onChange={(e) => setMaxPriceInput(e.target.value)} />
                </label>
                <label className="marketplace-filter-check">
                  <input type="checkbox" checked={filters.verifiedOnly} onChange={(e) => updateFilter('verifiedOnly', e.target.checked)} />
                  <span>Verified sellers only</span>
                </label>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                {isFetching && !isLoading ? 'Updating listings…' : `${sortedProducts.length} listing${sortedProducts.length !== 1 ? 's' : ''} found`}
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

            {isLoading ? (
              <div className="empty-cart" style={{ margin: '24px 0' }} aria-live="polite" aria-busy="true">
                <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--primary)' }}></i>
                <p>Loading listings… this can take a moment when the server is waking up.</p>
              </div>
            ) : isError || (sortedProducts.length === 0 && isUnfilteredView) ? (
              <div className="empty-cart" style={{ margin: '24px 0' }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
                <p>We couldn't load listings right now — the server may still be waking up.</p>
                <button onClick={() => void refetch()} className="btn-primary btn-inline btn-sm">
                  <i className="fa-solid fa-rotate"></i> Try Again
                </button>
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="empty-cart" style={{ margin: '24px 0' }}>
                <i className="fa-solid fa-store-slash"></i>
                <p>No listings found. Try a different search or category.</p>
                {noResultsHints.some((g) => g.items.length > 0) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, margin: '12px 0' }}>
                    {noResultsHints.flatMap((g) => g.items).slice(0, 6).map((item) => (
                      <button key={item.value} onClick={() => submitSearch(item.label)} className="filter-pill">
                        <i className="fa-solid fa-magnifying-glass"></i> {item.label}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={resetFilters} className="btn-secondary btn-inline btn-sm">
                  <i className="fa-solid fa-rotate"></i> Clear filters
                </button>
              </div>
            ) : (
              <div className="grid-3">
                {sortedProducts.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
