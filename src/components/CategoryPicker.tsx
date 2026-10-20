import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CATEGORIES_QUERY_KEY, useCategories } from '../hooks/queries/useCategories';
import { createCategory, getChildren, getSections } from '../lib/categories';
import { showToast } from '../lib/toastBus';

interface CategoryPickerProps {
  /** Restrict the section dropdown to these section codes (e.g. a farmer only sees Farm Produce/Livestock). Omit for no restriction. */
  allowedSections?: string[];
  /** The most specific category id currently selected (subcategory if picked, else category, else section). */
  value: string | null;
  onChange: (categoryId: string | null) => void;
}

export function CategoryPicker({ allowedSections, value, onChange }: CategoryPickerProps) {
  const queryClient = useQueryClient();
  const categoriesQ = useCategories();
  const categories = useMemo(() => categoriesQ.data ?? [], [categoriesQ.data]);
  const loading = categoriesQ.isPending;
  const failed = categoriesQ.isFetched && categories.length === 0;

  const [sectionId, setSectionId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [subcategoryId, setSubcategoryId] = useState<string>('');

  // Inline custom entry states
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const [customSubcategoryName, setCustomSubcategoryName] = useState('');
  const [savingSubcategory, setSavingSubcategory] = useState(false);

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
      setSubcategoryId('');
    } else {
      setSectionId(node.id);
      setCategoryId('');
      setSubcategoryId('');
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
    setIsAddingCategory(false);
    setIsAddingSubcategory(false);
    onChange(id || null);
  }

  function handleCategory(id: string) {
    if (id === '__add_custom__') {
      setIsAddingCategory(true);
      return;
    }
    setCategoryId(id);
    setSubcategoryId('');
    setIsAddingCategory(false);
    setIsAddingSubcategory(false);
    onChange(id || sectionId || null);
  }

  function handleSubcategory(id: string) {
    if (id === '__add_custom__') {
      setIsAddingSubcategory(true);
      return;
    }
    setSubcategoryId(id);
    setIsAddingSubcategory(false);
    onChange(id || categoryId || sectionId || null);
  }

  async function handleSaveCustomCategory() {
    if (!customCategoryName.trim()) {
      showToast('Please enter a category name.', 'error');
      return;
    }
    if (!sectionId) {
      showToast('Please select a section first.', 'error');
      return;
    }

    setSavingCategory(true);
    try {
      const created = await createCategory({
        name: customCategoryName.trim(),
        parentId: sectionId,
      });
      await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      setCategoryId(created.id);
      setSubcategoryId('');
      setIsAddingCategory(false);
      setCustomCategoryName('');
      onChange(created.id);
      showToast(`Category "${created.name}" created and selected!`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not add category';
      showToast(message, 'error');
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleSaveCustomSubcategory() {
    if (!customSubcategoryName.trim()) {
      showToast('Please enter a subcategory name.', 'error');
      return;
    }
    if (!categoryId) {
      showToast('Please select a category first.', 'error');
      return;
    }

    setSavingSubcategory(true);
    try {
      const created = await createCategory({
        name: customSubcategoryName.trim(),
        parentId: categoryId,
      });
      await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      setSubcategoryId(created.id);
      setIsAddingSubcategory(false);
      setCustomSubcategoryName('');
      onChange(created.id);
      showToast(`Subcategory "${created.name}" created and selected!`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not add subcategory';
      showToast(message, 'error');
    } finally {
      setSavingSubcategory(false);
    }
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
            onClick={() => void categoriesQ.refetch()}
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
        {/* SECTION DROPDOWN */}
        <div className="col-md-4">
          <div className="form-group">
            <label>Section <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select required value={sectionId} onChange={(e) => handleSection(e.target.value)}>
              <option value="">Select a section…</option>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* CATEGORY DROPDOWN / CUSTOM INPUT */}
        <div className="col-md-4">
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ marginBottom: 0 }}>Category</label>
              {sectionId && !isAddingCategory && (
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  + Add new
                </button>
              )}
            </div>

            {isAddingCategory ? (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  type="text"
                  placeholder="Type new category name…"
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSaveCustomCategory();
                    } else if (e.key === 'Escape') {
                      setIsAddingCategory(false);
                      setCustomCategoryName('');
                    }
                  }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    disabled={savingCategory || !customCategoryName.trim()}
                    onClick={() => void handleSaveCustomCategory()}
                  >
                    {savingCategory ? (
                      <><i className="fa-solid fa-spinner fa-spin"></i> Saving…</>
                    ) : (
                      <><i className="fa-solid fa-plus"></i> Add & Select</>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn-outline btn-sm"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => {
                      setIsAddingCategory(false);
                      setCustomCategoryName('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => handleCategory(e.target.value)}
                disabled={!sectionId}
                style={{ marginTop: 6 }}
              >
                <option value="">{sectionId ? 'Select a category…' : 'Select a section first'}</option>
                {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                {sectionId && (
                  <option value="__add_custom__" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                    + Type new category…
                  </option>
                )}
              </select>
            )}
          </div>
        </div>

        {/* SUBCATEGORY DROPDOWN / CUSTOM INPUT */}
        <div className="col-md-4">
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ marginBottom: 0 }}>Subcategory</label>
              {categoryId && !isAddingSubcategory && (
                <button
                  type="button"
                  onClick={() => setIsAddingSubcategory(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                >
                  + Add new
                </button>
              )}
            </div>

            {isAddingSubcategory ? (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  type="text"
                  placeholder="Type new subcategory name…"
                  value={customSubcategoryName}
                  onChange={(e) => setCustomSubcategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSaveCustomSubcategory();
                    } else if (e.key === 'Escape') {
                      setIsAddingSubcategory(false);
                      setCustomSubcategoryName('');
                    }
                  }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    disabled={savingSubcategory || !customSubcategoryName.trim()}
                    onClick={() => void handleSaveCustomSubcategory()}
                  >
                    {savingSubcategory ? (
                      <><i className="fa-solid fa-spinner fa-spin"></i> Saving…</>
                    ) : (
                      <><i className="fa-solid fa-plus"></i> Add & Select</>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn-outline btn-sm"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => {
                      setIsAddingSubcategory(false);
                      setCustomSubcategoryName('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <select
                value={subcategoryId}
                onChange={(e) => handleSubcategory(e.target.value)}
                disabled={!categoryId}
                style={{ marginTop: 6 }}
              >
                <option value="">
                  {!categoryId
                    ? '—'
                    : subcategoryOptions.length === 0
                    ? 'No subcategories (optional or add one below)'
                    : 'Select a subcategory…'}
                </option>
                {subcategoryOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                {categoryId && (
                  <option value="__add_custom__" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                    + Type new subcategory…
                  </option>
                )}
              </select>
            )}
          </div>
        </div>
      </div>
      <p style={{ fontSize: 11, color: 'var(--muted)', margin: '-6px 0 14px' }}>
        Choose a Section first, then a Category, then a Subcategory — or click &ldquo;+ Add new&rdquo; if your option isn't listed.
      </p>
    </div>
  );
}
