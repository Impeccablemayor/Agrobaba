import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { getSearchSuggestions, type Suggestion, type SuggestGroup, type SuggestGroupType } from '../lib/search';

interface SearchSuggestProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onSelectResult?: (item: Suggestion, groupType: SuggestGroupType) => void;
  scope?: 'products' | 'demands';
  placeholder?: string;
  inputClassName?: string;
  autoFocus?: boolean;
}

const GROUP_ICONS: Record<SuggestGroupType, string> = {
  category: 'fa-tag',
  product: 'fa-box',
  demand: 'fa-clipboard-list',
  location: 'fa-location-dot',
  popular: 'fa-fire',
};

export function SearchSuggest({ value, onChange, onSubmit, onSelectResult, scope = 'products', placeholder, inputClassName, autoFocus }: SearchSuggestProps) {
  const [groups, setGroups] = useState<SuggestGroup[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleGroups = groups.filter((g) => g.items.length > 0);
  const flatItems = visibleGroups.flatMap((g) => g.items.map((item) => ({ item, groupType: g.type })));

  useEffect(() => {
    if (value.trim().length < 2) {
      setGroups([]);
      setIsOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;
      void getSearchSuggestions(value.trim(), scope, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        setGroups(result);
        setIsOpen(result.some((g) => g.items.length > 0));
        setHighlighted(-1);
      });
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, scope]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function selectItem(item: Suggestion, groupType: SuggestGroupType) {
    setIsOpen(false);
    if ((groupType === 'product' || groupType === 'demand') && onSelectResult) {
      onSelectResult(item, groupType);
      return;
    }
    onChange(item.label);
    onSubmit(item.label);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || flatItems.length === 0) {
      if (e.key === 'Enter') onSubmit(value);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const picked = highlighted >= 0 ? flatItems[highlighted] : undefined;
      if (picked) selectItem(picked.item, picked.groupType);
      else { setIsOpen(false); onSubmit(value); }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  let runningIndex = -1;

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1 }}>
      <input
        type="text"
        className={inputClassName}
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (visibleGroups.length > 0) setIsOpen(true); }}
      />
      {isOpen && visibleGroups.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'var(--bg, #fff)', border: '1px solid var(--border, #e2e2e2)', borderRadius: 10,
          boxShadow: '0 12px 28px rgba(0,0,0,0.16)', zIndex: 60, maxHeight: 360, overflowY: 'auto',
        }}>
          {visibleGroups.map((group) => (
            <div key={group.type}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted, #888)', padding: '8px 12px 4px' }}>
                {group.label}
              </div>
              {group.items.map((item) => {
                runningIndex += 1;
                const idx = runningIndex;
                return (
                  <button
                    key={`${group.type}-${item.value}`}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); selectItem(item, group.type); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                      padding: '8px 12px', border: 'none',
                      background: idx === highlighted ? 'var(--primary-light, #f0f7f2)' : 'transparent',
                      cursor: 'pointer', fontSize: 13, color: 'inherit',
                    }}
                  >
                    <i className={`fa-solid ${GROUP_ICONS[group.type]}`} style={{ color: 'var(--muted, #999)', width: 14 }}></i>
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
