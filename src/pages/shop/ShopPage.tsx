import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getProducts } from '../../lib/products';
import { getCategories } from '../../lib/categories';
import { ProductCard } from '../../components/ProductCard';
import { SearchSuggest } from '../../components/SearchSuggest';
import { CategorySidebar } from '../../components/CategorySidebar';
import { getSearchSuggestions, type Suggestion, type SuggestGroup } from '../../lib/search';
import type { Category, Product } from '../../types';

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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [noResultsHints, setNoResultsHints] = useState<SuggestGroup[]>([]);
  const [reloadNonce, setReloadNonce] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    void getCategories().then(setCategories);
  }, []);

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

  // Picks up a search triggered from elsewhere (navbar/hero) while already on this page -
  // useSearchParams doesn't remount the page, so the initial-state read above only fires once.
  useEffect(() => {
    if (urlSearch !== submittedQuery) {
      setInputValue(urlSearch);
      setSubmittedQuery(urlSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearch]);

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

  useEffect(() => {
    const activeId = categoryId !== 'all' ? categoryId : (sectionId !== 'all' ? sectionId : undefined);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    void (async () => {
      const list = await getProducts({ categoryId: activeId, search: submittedQuery }, controller.signal);
      if (!controller.signal.aborted) {
        setProducts(list);
        setIsLoading(false);
        if (list.length === 0 && submittedQuery.trim()) {
          const hints = await getSearchSuggestions(submittedQuery.trim(), 'products');
          if (!controller.signal.aborted) setNoResultsHints(hints.filter((g) => g.type === 'category' || g.type === 'popular'));
        } else {
          setNoResultsHints([]);
        }
      }
    })();
  }, [sectionId, categoryId, submittedQuery, reloadNonce]);

  /** Bumped by "Try again" to re-run the fetch effect without changing any filter. */
  function handleRetry() {
    setReloadNonce((n) => n + 1);
  }

  const sortedProducts = useMemo(() => {
    let list = [...products];
    if (sort === 'price-low') list = list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    else if (sort === 'price-high') list = list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    else if (sort === 'rating') list = list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === 'popular') list = list.sort((a, b) => (b.sold || 0) - (a.sold || 0));
    return list;
  }, [products, sort]);

  // Browsing with zero results and zero filters almost certainly means the request failed
  // (e.g. a cold-starting backend), not that the marketplace is genuinely empty.
  const isUnfilteredView = !submittedQuery.trim() && categoryId === 'all' && sectionId === 'all';

  function resetFilters() {
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
              {isLoading && (
                <i className="fa-solid fa-spinner fa-spin" style={{ position: 'absolute', right: 14, top: 14, color: 'var(--muted)' }}></i>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                {isLoading ? 'Loading…' : `${sortedProducts.length} listing${sortedProducts.length !== 1 ? 's' : ''} found`}
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
            ) : sortedProducts.length === 0 ? (
              isUnfilteredView ? (
                <div className="empty-cart" style={{ margin: '24px 0' }}>
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <p>We couldn't load listings right now — the server may still be waking up.</p>
                  <button onClick={handleRetry} className="btn-primary btn-inline btn-sm">
                    <i className="fa-solid fa-rotate"></i> Try Again
                  </button>
                </div>
              ) : (
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
              )
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
