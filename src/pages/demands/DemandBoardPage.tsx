import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCategories } from '../../hooks/queries/useCategories';
import { useDemands } from '../../hooks/queries/useDemands';
import { DEMAND_CATEGORY_ICONS } from '../../lib/constants';
import { DemandCard } from '../../components/DemandCard';
import { SearchSuggest } from '../../components/SearchSuggest';
import { getSearchSuggestions, type SuggestGroup, type Suggestion } from '../../lib/search';

export default function DemandBoardPage() {
  const navigate = useNavigate();
  const [categoryId, setCategoryId] = useState('all');
  const [inputValue, setInputValue] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [noResultsHints, setNoResultsHints] = useState<SuggestGroup[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { data: categories = [] } = useCategories();
  const {
    data: demands = [],
    isLoading,
    isFetching,
  } = useDemands({ categoryId: categoryId === 'all' ? undefined : categoryId, search: submittedQuery });

  const categoryPills = useMemo(() => {
    const level2 = categories.filter((c) => c.level === 2);
    return [
      { key: 'all', label: 'All', icon: 'fa-border-all' },
      ...level2.map((c) => ({ key: c.id, label: c.name, icon: DEMAND_CATEGORY_ICONS[c.name] || DEMAND_CATEGORY_ICONS.default })),
    ];
  }, [categories]);

  useEffect(() => {
    if (!isLoading && demands.length === 0 && submittedQuery.trim()) {
      void getSearchSuggestions(submittedQuery.trim(), 'demands').then((hints) => {
        setNoResultsHints(hints.filter((g) => g.type === 'category' || g.type === 'popular'));
      });
    } else {
      setNoResultsHints([]);
    }
  }, [isLoading, demands.length, submittedQuery]);

  function handleSearch(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSubmittedQuery(value), 300);
  }

  function submitSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInputValue(value);
    setSubmittedQuery(value);
  }

  function goToDemand(item: Suggestion) {
    navigate(`/demands/${item.value}`);
  }

  const sortedDemands = useMemo(() => {
    let list = [...demands];
    if (sort === 'budget-high') list = list.sort((a, b) => b.budget - a.budget);
    else if (sort === 'budget-low') list = list.sort((a, b) => a.budget - b.budget);
    else if (sort === 'responses') list = list.sort((a, b) => (b.responses?.length || 0) - (a.responses?.length || 0));
    return list;
  }, [demands, sort]);

  return (
    <>
      <div style={{ background: 'linear-gradient(135deg, #1B6B3A, #0d4a24)', padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(244,161,29,0.15)', border: '1px solid rgba(244,161,29,0.3)', color: '#F4A11D', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 999, marginBottom: 16 }}>
            <i className="fa-solid fa-clipboard-list"></i> Live Demand Board
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', marginBottom: 10 }}>
            What Buyers Need Right Now
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 24, lineHeight: 1.7 }}>
            Browse open demands from buyers across Nigeria. If you can supply it — respond directly and start a deal.
          </p>
          <Link to="/demands/new" className="banner-btn" style={{ background: 'rgba(244,161,29,0.9)', borderColor: 'var(--accent)', color: '#fff', fontSize: 13, padding: '10px 24px' }}>
            <i className="fa-solid fa-pen"></i> Post Your Own Demand
          </Link>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><Link to="/">Home</Link></li>
              <li className="breadcrumb-item active">Demand Board</li>
            </ol>
          </nav>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
            <div className="search-wrap" style={{ flex: 1, minWidth: 240, position: 'relative' }}>
              <i className="fa-solid fa-magnifying-glass"></i>
              <SearchSuggest
                value={inputValue}
                onChange={handleSearch}
                onSubmit={submitSearch}
                onSelectResult={goToDemand}
                scope="demands"
                placeholder="Search demands by title, category, location..."
              />
              {isFetching && (
                <i className="fa-solid fa-spinner fa-spin" style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Sort:</label>
              <select
                value={sort} onChange={(e) => setSort(e.target.value)}
                style={{ border: '1.5px solid var(--border-mid)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', fontSize: 12, outline: 'none', cursor: 'pointer' }}
              >
                <option value="newest">Newest First</option>
                <option value="budget-high">Budget: High to Low</option>
                <option value="budget-low">Budget: Low to High</option>
                <option value="responses">Most Responses</option>
              </select>
            </div>
          </div>

          <div className="filter-pills">
            {categoryPills.map((p) => (
              <button
                key={p.key}
                className={`filter-pill ${categoryId === p.key ? 'active' : ''}`}
                onClick={() => setCategoryId(p.key)}
              >
                <i className={`fa-solid ${p.icon}`}></i> {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
              {isFetching && !isLoading ? 'Updating demands…' : `${sortedDemands.length} demand${sortedDemands.length !== 1 ? 's' : ''} posted`}
            </p>
            <Link to="/demands/new" className="btn-primary btn-inline btn-sm">
              <i className="fa-solid fa-plus"></i> Post a Demand
            </Link>
          </div>

          {isLoading ? (
            <div className="empty-cart" style={{ gridColumn: '1/-1' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--primary)' }}></i>
              <p>Loading demands…</p>
            </div>
          ) : sortedDemands.length === 0 ? (
            <div className="empty-cart" style={{ gridColumn: '1/-1' }}>
              <i className="fa-solid fa-clipboard-list"></i>
              <p>No demands found. Try a different search or category.</p>
              {noResultsHints.some((g) => g.items.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, margin: '12px 0' }}>
                  {noResultsHints.flatMap((g) => g.items).slice(0, 6).map((item) => (
                    <button key={item.value} onClick={() => submitSearch(item.label)} className="filter-pill">
                      <i className="fa-solid fa-magnifying-glass"></i> {item.label}
                    </button>
                  ))}
                </div>
              )}
              <Link to="/demands/new" className="btn-primary btn-inline btn-sm">
                <i className="fa-solid fa-plus"></i> Post a Demand
              </Link>
            </div>
          ) : (
            <div className="demand-grid">
              {sortedDemands.map((d) => (
                <DemandCard
                  key={d.id}
                  demand={d}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '32px 24px', marginTop: 16 }}>
        <div className="container">
          <div className="how-respond-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24, textAlign: 'center' }}>
            {[
              ['fa-magnifying-glass', '1. Browse Demands', 'Find demands that match what you supply. Filter by category, budget or location.'],
              ['fa-reply', '2. Send Your Offer', 'Click Respond, enter your price and message. A chat thread opens between you and the buyer.'],
              ['fa-handshake', '3. Close the Deal', 'Negotiate via chat. Agree on terms. Buyer pays into escrow. You deliver. Funds released.'],
            ].map(([icon, title, text]) => (
              <div key={title}>
                <div style={{ width: 48, height: 48, background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <i className={`fa-solid ${icon}`} style={{ color: 'var(--primary)', fontSize: 18 }}></i>
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{title}</h4>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
