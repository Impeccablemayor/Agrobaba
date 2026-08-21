import { useCallback, useEffect, useState } from 'react';
import { getCategories, getChildren, getSections } from '../lib/categories';
import type { Category } from '../types';

interface CategoryPickerProps {
  /** Restrict the section dropdown to these section codes (e.g. a farmer only sees Farm Produce/Livestock). Omit for no restriction. */
  allowedSections?: string[];
  /** The most specific category id currently selected (subcategory if picked, else category, else section). */
  value: string | null;
  onChange: (categoryId: string | null) => void;
}

export function CategoryPicker({ allowedSections, value, onChange }: CategoryPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [sectionId, setSectionId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const data = await getCategories();
    setCategories(data);
    setLoading(false);
    if (data.length === 0) setFailed(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Reconstruct the section/category chain from an externally-set value (e.g. editing an existing listing).
  useEffect(() => {
    if (!value || categories.length === 0) return;
    const node = categories.find((c) => c.id === value);
    if (!node) return;
    if (node.level === 3) {
      setSubcategoryId(node.id);
      setCategoryId(node.parentId || '');
      const cat = categories.find((c) => c.id === node.parentId);
      setSectionId(cat?.parentId || '');
    } else if (node.level === 2) {
      setCategoryId(node.id);
      setSectionId(node.parentId || '');
    } else {
      setSectionId(node.id);
    }
  }, [value, categories]);

  const sections = allowedSections
    ? getSections(categories).filter((s) => allowedSections.includes(s.code))
    : getSections(categories);
  const categoryOptions = sectionId ? getChildren(categories, sectionId) : [];
  const subcategoryOptions = categoryId ? getChildren(categories, categoryId) : [];

  function handleSection(id: string) {
    setSectionId(id);
    setCategoryId('');
    setSubcategoryId('');
    onChange(id || null);
  }

  function handleCategory(id: string) {
    setCategoryId(id);
    setSubcategoryId('');
    onChange(id || sectionId || null);
  }

  function handleSubcategory(id: string) {
    setSubcategoryId(id);
    onChange(id || categoryId || sectionId || null);
  }

  if (loading) {
    return (
      <div className="form-group">
        <label>Category</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 13 }}>
          <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }}></i>
          Loading categories…
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="form-group">
        <label>Category <span style={{ color: 'var(--danger)' }}>*</span></label>
        <div
          style={{
            border: '1px solid var(--border-mid)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 14px',
            fontSize: 13,
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--danger)' }}></i>
          <span>Couldn't load the category list. Check your connection and try again.</span>
          <button
            type="button"
            onClick={() => void load()}
            className="btn-outline btn-sm btn-inline"
          >
            <i className="fa-solid fa-rotate-right"></i> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="row g-3">
        <div className="col-md-4">
          <div className="form-group">
            <label>Section <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select required value={sectionId} onChange={(e) => handleSection(e.target.value)}>
              <option value="">Select a section…</option>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="col-md-4">
          <div className="form-group">
            <label>Category</label>
            <select value={categoryId} onChange={(e) => handleCategory(e.target.value)} disabled={!sectionId}>
              <option value="">{sectionId ? 'Select a category…' : 'Select a section first'}</option>
              {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="col-md-4">
          <div className="form-group">
            <label>Subcategory</label>
            <select value={subcategoryId} onChange={(e) => handleSubcategory(e.target.value)} disabled={subcategoryOptions.length === 0}>
              <option value="">{subcategoryOptions.length ? 'Select a subcategory…' : '—'}</option>
              {subcategoryOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>
      <p style={{ fontSize: 11, color: 'var(--muted)', margin: '-6px 0 14px' }}>
        Choose a Section first, then a Category, then a Subcategory — the next dropdown unlocks once the one above is picked.
      </p>
    </div>
  );
}
