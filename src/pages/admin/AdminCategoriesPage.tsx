import { useEffect, useState } from 'react';
import { adminGetCategories, adminUpdateCategory, adminDeleteCategory } from '../../lib/categories';
import type { Category } from '../../types';
import { showToast } from '../../lib/toastBus';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'user' | 'system'>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  // Editing state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('APPROVED');
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const data = await adminGetCategories();
      setCategories(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load categories';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function startEdit(c: Category) {
    setEditingCategory(c);
    setEditName(c.name);
    setEditStatus(c.status || 'APPROVED');
    setEditActive(c.active ?? true);
  }

  async function handleSaveEdit() {
    if (!editingCategory) return;
    if (!editName.trim()) {
      showToast('Name cannot be empty', 'error');
      return;
    }
    setSavingEdit(true);
    try {
      const updated = await adminUpdateCategory(editingCategory.id, {
        name: editName.trim(),
        status: editStatus,
        active: editActive,
      });
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setEditingCategory(null);
      showToast(`Category "${updated.name}" updated successfully!`, 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update category';
      showToast(message, 'error');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleActive(c: Category) {
    const newActive = !c.active;
    try {
      const updated = await adminUpdateCategory(c.id, {
        name: c.name,
        active: newActive,
      });
      setCategories((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      showToast(`Category "${c.name}" ${newActive ? 'activated' : 'deactivated'}.`, 'success');
    } catch {
      showToast('Failed to update status', 'error');
    }
  }

  async function handleDelete(c: Category) {
    if (!window.confirm(`Are you sure you want to deactivate category "${c.name}"?`)) return;
    try {
      await adminDeleteCategory(c.id);
      setCategories((prev) => prev.map((item) => (item.id === c.id ? { ...item, active: false } : item)));
      showToast(`Category "${c.name}" deactivated.`, 'success');
    } catch {
      showToast('Failed to delete category', 'error');
    }
  }

  const sections = Array.from(new Set(categories.map((c) => c.section))).filter(Boolean);

  const filtered = categories.filter((c) => {
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const match = c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || (c.createdBy && c.createdBy.toLowerCase().includes(q));
      if (!match) return false;
    }
    // Filter type
    if (filterType === 'user' && !c.createdBy) return false;
    if (filterType === 'system' && c.createdBy) return false;
    // Section
    if (sectionFilter !== 'all' && c.section !== sectionFilter) return false;
    return true;
  });

  const userCreatedCount = categories.filter((c) => !!c.createdBy).length;

  if (loading) return <PageLoadingSpinner message="Loading categories…" />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>
            Taxonomy & Categories
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
            Review, edit, and manage system and user-added categories and subcategories.
          </p>
        </div>
        <button type="button" onClick={() => void loadData()} className="btn-outline btn-sm btn-inline">
          <i className="fa-solid fa-rotate-right"></i> Refresh
        </button>
      </div>

      {/* STATS */}
      <div className="admin-stats-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 20 }}>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{categories.length}</div>
          <div className="admin-stat-label">Total Categories in Taxonomy</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value" style={{ color: 'var(--primary)' }}>{userCreatedCount}</div>
          <div className="admin-stat-label">Added by Users</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value" style={{ color: '#16a34a' }}>
            {categories.filter((c) => c.active !== false).length}
          </div>
          <div className="admin-stat-label">Active Categories</div>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="admin-panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              {(['all', 'user', 'system'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterType(t)}
                  style={{
                    padding: '6px 14px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    border: 'none',
                    background: filterType === t ? 'var(--primary)' : 'var(--bg)',
                    color: filterType === t ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {t === 'all' ? 'All' : t === 'user' ? `User Added (${userCreatedCount})` : 'System Pre-seeded'}
                </button>
              ))}
            </div>

            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              style={{ width: 'auto', minWidth: 160, padding: '7px 12px', fontSize: 12.5 }}
            >
              <option value="all">All Sections</option>
              {sections.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: 240, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search category, code, user…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '7px 12px', fontSize: 12.5 }}
            />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="admin-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ margin: 0, fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--bg-soft)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px' }}>Name</th>
                <th style={{ padding: '12px 16px' }}>Level</th>
                <th style={{ padding: '12px 16px' }}>Section</th>
                <th style={{ padding: '12px 16px' }}>Origin</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                    No categories match the selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>{c.code}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontWeight: 700,
                          background: c.level === 1 ? '#dbeafe' : c.level === 2 ? '#e0e7ff' : '#f3e8ff',
                          color: c.level === 1 ? '#1e40af' : c.level === 2 ? '#3730a3' : '#6b21a8',
                        }}
                      >
                        {c.level === 1 ? 'Section (L1)' : c.level === 2 ? 'Category (L2)' : 'Subcategory (L3)'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--muted)' }}>
                      {c.section}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {c.createdBy ? (
                        <div>
                          <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                            <i className="fa-solid fa-user" style={{ marginRight: 4 }}></i> User Created
                          </span>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{c.createdBy}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>System</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: c.active !== false ? '#22c55e' : '#ef4444',
                            display: 'inline-block',
                          }}
                        ></span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>
                          {c.active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn-outline btn-sm btn-inline"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => startEdit(c)}
                        >
                          <i className="fa-solid fa-pen"></i> Edit
                        </button>
                        <button
                          type="button"
                          className="btn-outline btn-sm btn-inline"
                          style={{ padding: '4px 10px', fontSize: 12 }}
                          onClick={() => void handleToggleActive(c)}
                        >
                          {c.active !== false ? (
                            <><i className="fa-solid fa-eye-slash"></i> Disable</>
                          ) : (
                            <><i className="fa-solid fa-eye"></i> Enable</>
                          )}
                        </button>
                        <button
                          type="button"
                          className="btn-outline btn-sm btn-inline"
                          style={{ padding: '4px 10px', fontSize: 12, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          onClick={() => void handleDelete(c)}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingCategory && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setEditingCategory(null)}
        >
          <div
            style={{
              background: 'var(--bg)',
              borderRadius: 'var(--radius)',
              width: '100%',
              maxWidth: 480,
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Edit Category</h3>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--muted)' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Category Code</label>
              <input type="text" disabled value={editingCategory.code} style={{ opacity: 0.7 }} />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Display Name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Review Status</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="APPROVED">Approved</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  style={{ width: 16, height: 16 }}
                />
                Active (visible in marketplace dropdowns)
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-outline btn-sm btn-inline"
                onClick={() => setEditingCategory(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary btn-sm btn-inline"
                disabled={savingEdit || !editName.trim()}
                onClick={() => void handleSaveEdit()}
              >
                {savingEdit ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>} Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
