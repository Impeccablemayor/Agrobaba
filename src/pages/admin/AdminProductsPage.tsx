import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdminProducts, useAdminProductDetail } from '../../hooks/queries/useAdmin';
import { useCategories } from '../../hooks/queries/useCategories';
import { formatDate, formatPrice, timeAgo } from '../../lib/format';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { ActionMenu } from '../../components/ActionMenu';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import {
  suspendAdminProduct,
  restoreAdminProduct,
  deleteAdminProduct,
  updateAdminProduct,
} from '../../lib/adminProducts';
import { showToast } from '../../lib/toastBus';
import type { AdminProductSummary } from '../../types';

export default function AdminProductsPage() {
  const [searchParams] = useSearchParams();

  // Filters & Pagination State
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [sellerId, setSellerId] = useState(searchParams.get('sellerId') || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(0);
  const size = 15;

  // Modals & Drawer State
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<AdminProductSummary | null>(null);
  const [productToSuspend, setProductToSuspend] = useState<AdminProductSummary | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [productToRestore, setProductToRestore] = useState<AdminProductSummary | null>(null);
  const [productToDelete, setProductToDelete] = useState<AdminProductSummary | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active image index for drawer gallery
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
    quantity: '',
    unit: '',
    location: '',
    categoryId: '',
    status: 'ACTIVE',
  });

  const { data: categories = [] } = useCategories();

  const queryParams = {
    search: search.trim() || undefined,
    status: status || undefined,
    category: category || undefined,
    sellerId: sellerId.trim() || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sort,
    page,
    size,
  };

  const { data: pageData, isLoading, refetch } = useAdminProducts(queryParams);
  const { data: activeDetail, isLoading: detailLoading } = useAdminProductDetail(selectedProductId);

  const products = pageData?.content || [];
  const totalElements = pageData?.totalElements || 0;
  const totalPages = pageData?.totalPages || 0;

  function handleOpenEdit(p: AdminProductSummary) {
    setEditingProduct(p);
    setEditForm({
      name: p.name || '',
      description: '',
      price: p.price ? String(p.price) : '',
      quantity: p.quantity !== null && p.quantity !== undefined ? String(p.quantity) : '',
      unit: p.unit || '',
      location: p.location || '',
      categoryId: p.categoryId ? String(p.categoryId) : '',
      status: p.status || 'ACTIVE',
    });
  }

  async function handleSaveEdit() {
    if (!editingProduct) return;
    if (!editForm.name.trim()) {
      showToast('Product name cannot be blank', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateAdminProduct(editingProduct.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        price: editForm.price ? Number(editForm.price) : undefined,
        quantity: editForm.quantity !== '' ? Number(editForm.quantity) : undefined,
        unit: editForm.unit.trim() || undefined,
        location: editForm.location.trim() || undefined,
        categoryId: editForm.categoryId ? Number(editForm.categoryId) : undefined,
        status: editForm.status,
      });
      setEditingProduct(null);
      void refetch();
    } catch {
      // error handled in api client
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmSuspend() {
    if (!productToSuspend || !suspendReason.trim()) {
      showToast('Please provide a reason for suspending this listing', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await suspendAdminProduct(productToSuspend.id, suspendReason.trim());
      setProductToSuspend(null);
      setSuspendReason('');
      void refetch();
    } catch {
      // error handled in api client
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmRestore() {
    if (!productToRestore) return;

    setIsSubmitting(true);
    try {
      await restoreAdminProduct(productToRestore.id);
      setProductToRestore(null);
      void refetch();
    } catch {
      // error handled in api client
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!productToDelete || !deleteReason.trim()) {
      showToast('Please provide a reason for deleting this listing', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteAdminProduct(productToDelete.id, deleteReason.trim());
      setProductToDelete(null);
      setDeleteReason('');
      if (selectedProductId === productToDelete.id) {
        setSelectedProductId(null);
      }
      void refetch();
    } catch {
      // error handled in api client
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetFilters() {
    setSearch('');
    setStatus('');
    setCategory('');
    setSellerId('');
    setStartDate('');
    setEndDate('');
    setSort('newest');
    setPage(0);
  }

  const hasActiveFilters = Boolean(
    search || status || category || sellerId || startDate || endDate || sort !== 'newest'
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>
            Product & Goods Management
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Inspect, moderate, suspend, or remove marketplace product listings across all sellers.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            <strong>{totalElements.toLocaleString()}</strong> total listings
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-panel" style={{ padding: '16px 18px', marginBottom: 0 }}>
        <div className="admin-filters-row" style={{ marginBottom: 12 }}>
          {/* Text & ID Search */}
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <input
              type="text"
              placeholder="Search by product name, ID, seller handle/email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              style={{ width: '100%', paddingLeft: 34 }}
            />
            <i
              className="fa-solid fa-magnifying-glass"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}
            ></i>
          </div>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Listings</option>
            <option value="INACTIVE">Suspended / Inactive</option>
            <option value="ARCHIVED">Deleted / Archived</option>
            <option value="DRAFT">Drafts</option>
          </select>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Sort Selector */}
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(0);
            }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_desc">Highest Price First</option>
            <option value="price_asc">Lowest Price First</option>
            <option value="name_asc">Name (A-Z)</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--danger)',
                cursor: 'pointer',
                fontWeight: 600,
                padding: '6px 10px',
                fontSize: 12.5,
              }}
            >
              <i className="fa-solid fa-rotate-left"></i> Reset
            </button>
          )}
        </div>

        {/* Extended Date & Seller filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--muted)' }}>Seller ID:</span>
            <input
              type="text"
              placeholder="e.g. 42"
              value={sellerId}
              onChange={(e) => {
                setSellerId(e.target.value);
                setPage(0);
              }}
              style={{ width: 90, padding: '4px 8px', fontSize: 12 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--muted)' }}>Created From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
              style={{ padding: '4px 8px', fontSize: 12 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--muted)' }}>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
              style={{ padding: '4px 8px', fontSize: 12 }}
            />
          </div>
        </div>
      </div>

      {/* Products Table */}
      {isLoading ? (
        <PageLoadingSpinner message="Loading marketplace products…" />
      ) : products.length === 0 ? (
        <div className="admin-panel" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <i className="fa-solid fa-boxes-stacked" style={{ fontSize: 32, color: 'var(--muted)', marginBottom: 12, display: 'block' }}></i>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No product listings found</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
            No products match the specified filters. Try selecting a different category or status, or clearing search.
          </p>
          <button type="button" className="btn btn-outline btn-sm" onClick={resetFilters}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="admin-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="admin-table-wrap" style={{ border: 'none' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>ID</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Seller</th>
                  <th>Price</th>
                  <th>Stock / Qty</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Reports</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isDeleted = p.status === 'ARCHIVED';
                  const isSuspended = p.status === 'INACTIVE';
                  const isActive = p.status === 'ACTIVE';

                  let statusBadgeClass = 'admin-chip';
                  let statusBg = 'var(--bg-soft)';
                  let statusColor = 'var(--text-body)';

                  if (isActive) {
                    statusBg = 'rgba(16, 185, 129, 0.12)';
                    statusColor = '#059669';
                  } else if (isSuspended) {
                    statusBg = 'rgba(245, 158, 11, 0.12)';
                    statusColor = '#d97706';
                  } else if (isDeleted) {
                    statusBg = 'rgba(239, 68, 68, 0.12)';
                    statusColor = '#dc2626';
                  }

                  return (
                    <tr
                      key={p.id}
                      onClick={() => {
                        setSelectedProductId(p.id);
                        setActiveImageIndex(0);
                      }}
                      style={{ cursor: 'pointer', opacity: isDeleted ? 0.7 : 1 }}
                    >
                      <td style={{ fontWeight: 600, color: 'var(--muted)', fontSize: 12 }}>
                        #{p.id}
                      </td>

                      {/* Product Thumbnail & Name */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 6,
                              overflow: 'hidden',
                              background: 'var(--bg-soft)',
                              flexShrink: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid var(--border-mid)',
                            }}
                          >
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <i className="fa-solid fa-image" style={{ color: 'var(--muted)', fontSize: 16 }}></i>
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-heading)' }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                              {p.listingType ? p.listingType.replace('_', ' ') : 'Product Sale'}
                              {p.location ? ` • ${p.location}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            background: 'var(--bg-soft)',
                            borderRadius: 4,
                            fontSize: 11.5,
                            fontWeight: 500,
                          }}
                        >
                          {p.category}
                        </span>
                      </td>

                      {/* Seller Info */}
                      <td>
                        {p.sellerId ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{ display: 'inline-block' }}
                          >
                            <Link
                              to={`/admin/users/${p.sellerId}`}
                              style={{
                                fontWeight: 600,
                                fontSize: 12.5,
                                color: 'var(--primary)',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              {p.sellerName || 'Seller #' + p.sellerId}
                              {p.sellerVerified && (
                                <i
                                  className="fa-solid fa-circle-check"
                                  title="Identity Verified"
                                  style={{ color: '#10b981', fontSize: 11 }}
                                ></i>
                              )}
                              {p.sellerBusinessVerified && (
                                <i
                                  className="fa-solid fa-briefcase"
                                  title="CAC Business Verified"
                                  style={{ color: '#3b82f6', fontSize: 11 }}
                                ></i>
                              )}
                            </Link>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {p.sellerPublicHandle ? `@${p.sellerPublicHandle}` : p.sellerEmail || `ID: ${p.sellerId}`}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>Unknown</span>
                        )}
                      </td>

                      {/* Price */}
                      <td style={{ fontWeight: 700, fontSize: 13 }}>
                        {formatPrice(p.price)}
                      </td>

                      {/* Stock / Quantity */}
                      <td>
                        <div style={{ fontSize: 12.5, fontWeight: 500 }}>
                          {p.quantity !== null && p.quantity !== undefined
                            ? `${p.quantity.toLocaleString()} ${p.unit || 'units'}`
                            : '—'}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={statusBadgeClass}
                          style={{
                            background: statusBg,
                            color: statusColor,
                            fontWeight: 700,
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 4,
                            textTransform: 'uppercase',
                          }}
                        >
                          {isSuspended ? 'Suspended' : isDeleted ? 'Archived' : p.status}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 500 }} title={formatDate(p.createdAt)}>
                          {timeAgo(p.createdAt)}
                        </div>
                        {p.updatedAt && p.updatedAt !== p.createdAt && (
                          <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                            upd {timeAgo(p.updatedAt)}
                          </div>
                        )}
                      </td>

                      {/* Reports */}
                      <td>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: p.reportsCount > 0 ? 'var(--danger)' : 'var(--muted)',
                          }}
                        >
                          {p.reportsCount > 0 ? (
                            <>
                              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 4 }}></i>
                              {p.reportsCount}
                            </>
                          ) : (
                            '0'
                          )}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <ActionMenu
                          items={[
                            {
                              label: 'View Full Details',
                              icon: 'fa-eye',
                              onClick: () => {
                                setSelectedProductId(p.id);
                                setActiveImageIndex(0);
                              },
                            },
                            ...(!isDeleted
                              ? [
                                  {
                                    label: 'Edit Product',
                                    icon: 'fa-pen-to-square',
                                    onClick: () => handleOpenEdit(p),
                                  },
                                  ...(p.status === 'ACTIVE'
                                    ? [
                                        {
                                          label: 'Suspend / Hide Listing',
                                          icon: 'fa-ban',
                                          onClick: () => {
                                            setProductToSuspend(p);
                                            setSuspendReason('');
                                          },
                                        },
                                      ]
                                    : [
                                        {
                                          label: 'Restore / Reactivate Listing',
                                          icon: 'fa-circle-check',
                                          onClick: () => setProductToRestore(p),
                                        },
                                      ]),
                                  {
                                    label: 'Delete Product',
                                    icon: 'fa-trash-can',
                                    danger: true,
                                    onClick: () => {
                                      setProductToDelete(p);
                                      setDeleteReason('');
                                    },
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                borderTop: '1px solid var(--border-mid)',
                background: 'var(--bg-soft)',
                fontSize: 12.5,
              }}
            >
              <div style={{ color: 'var(--muted)' }}>
                Showing page {page + 1} of {totalPages} ({totalElements.toLocaleString()} products)
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={page === 0}
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                >
                  <i className="fa-solid fa-chevron-left"></i> Previous
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product Detail Drawer */}
      {selectedProductId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setSelectedProductId(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 680,
              background: 'var(--bg-card)',
              height: '100%',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-mid)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                background: 'var(--bg-card)',
                zIndex: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                  Listing Details #{selectedProductId}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
                  {activeDetail?.product.name || 'Loading Product…'}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setSelectedProductId(null)}
                style={{ padding: '6px 12px' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Drawer Body */}
            {detailLoading || !activeDetail ? (
              <div style={{ padding: 40 }}>
                <PageLoadingSpinner message="Loading complete listing details…" />
              </div>
            ) : (
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Images Gallery */}
                {activeDetail.images && activeDetail.images.length > 0 ? (
                  <div>
                    <div
                      style={{
                        width: '100%',
                        height: 280,
                        borderRadius: 8,
                        overflow: 'hidden',
                        background: 'var(--bg-soft)',
                        border: '1px solid var(--border-mid)',
                        marginBottom: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={activeDetail.images[activeImageIndex] || activeDetail.images[0]}
                        alt={activeDetail.product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    {activeDetail.images.length > 1 && (
                      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                        {activeDetail.images.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImageIndex(idx)}
                            style={{
                              width: 54,
                              height: 54,
                              borderRadius: 6,
                              overflow: 'hidden',
                              border: activeImageIndex === idx ? '2px solid var(--primary)' : '1px solid var(--border-mid)',
                              padding: 0,
                              background: 'none',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      height: 140,
                      borderRadius: 8,
                      background: 'var(--bg-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--muted)',
                      border: '1px dashed var(--border-mid)',
                    }}
                  >
                    <i className="fa-solid fa-image" style={{ marginRight: 8 }}></i> No images uploaded
                  </div>
                )}

                {/* Status Alert if Suspended or Archived */}
                {activeDetail.product.status === 'INACTIVE' && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#d97706', fontSize: 13, marginBottom: 2 }}>
                      <i className="fa-solid fa-ban" style={{ marginRight: 6 }}></i> Listing is Currently Suspended
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-body)' }}>
                      <strong>Reason:</strong> {activeDetail.product.suspendedReason || 'Administrative suspension'}
                    </div>
                    {activeDetail.product.suspendedBy && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                        Suspended by {activeDetail.product.suspendedBy} on {formatDate(activeDetail.product.suspendedAt)}
                      </div>
                    )}
                  </div>
                )}

                {activeDetail.product.status === 'ARCHIVED' && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 13, marginBottom: 2 }}>
                      <i className="fa-solid fa-trash-can" style={{ marginRight: 6 }}></i> Listing is Archived / Deleted
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-body)' }}>
                      <strong>Reason:</strong> {activeDetail.product.deleteReason || 'Administrative deletion'}
                    </div>
                    {activeDetail.product.deletedBy && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                        Deleted by {activeDetail.product.deletedBy} on {formatDate(activeDetail.product.deletedAt)}
                      </div>
                    )}
                  </div>
                )}

                {/* Pricing & Stock Card */}
                <div className="admin-panel" style={{ padding: '16px', margin: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>PRICE</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--primary)' }}>
                        {formatPrice(activeDetail.product.price)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>AVAILABLE STOCK</div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>
                        {activeDetail.product.quantity !== null && activeDetail.product.quantity !== undefined
                          ? `${activeDetail.product.quantity.toLocaleString()} ${activeDetail.product.unit || 'units'}`
                          : 'Not tracked'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>CATEGORY</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{activeDetail.product.category}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>LOCATION</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{activeDetail.product.location || 'Nigeria'}</div>
                    </div>
                  </div>

                  {/* Quantity Rules & Tiers */}
                  {(activeDetail.minOrderQuantity || activeDetail.maxOrderQuantity || (activeDetail.priceTiers && activeDetail.priceTiers.length > 0)) && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-mid)', fontSize: 12 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Order Restrictions & Tiers:</div>
                      <div style={{ display: 'flex', gap: 16, color: 'var(--muted)', flexWrap: 'wrap' }}>
                        {activeDetail.minOrderQuantity && <span>Min Order: {activeDetail.minOrderQuantity}</span>}
                        {activeDetail.maxOrderQuantity && <span>Max Order: {activeDetail.maxOrderQuantity}</span>}
                        {activeDetail.incrementQuantity && <span>Increment: {activeDetail.incrementQuantity}</span>}
                        {activeDetail.negotiated && <span style={{ color: 'var(--primary)' }}>Price Negotiable</span>}
                      </div>
                      {activeDetail.priceTiers && activeDetail.priceTiers.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Bulk Pricing Tiers:</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {activeDetail.priceTiers.map((tier, i) => (
                              <span
                                key={i}
                                style={{
                                  padding: '2px 8px',
                                  background: 'var(--bg-soft)',
                                  borderRadius: 4,
                                  fontSize: 11,
                                }}
                              >
                                {tier.minQuantity}{tier.maxQuantity ? ` - ${tier.maxQuantity}` : '+'} units: <strong>{formatPrice(tier.unitPrice)}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Seller Profile Card (With Link to Seller Admin Profile) */}
                <div className="admin-panel" style={{ padding: '16px', margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                      SELLER INFORMATION
                    </div>
                    {activeDetail.product.sellerId && (
                      <Link
                        to={`/admin/users/${activeDetail.product.sellerId}`}
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: 'var(--primary)',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        Inspect Seller Admin Profile <i className="fa-solid fa-arrow-up-right-from-square"></i>
                      </Link>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 16,
                      }}
                    >
                      {(activeDetail.product.sellerName || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {activeDetail.product.sellerName || 'Seller #' + activeDetail.product.sellerId}
                        {activeDetail.product.sellerVerified && (
                          <span
                            style={{
                              fontSize: 10,
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: '#059669',
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontWeight: 700,
                            }}
                          >
                            <i className="fa-solid fa-circle-check"></i> ID Verified
                          </span>
                        )}
                        {activeDetail.product.sellerBusinessVerified && (
                          <span
                            style={{
                              fontSize: 10,
                              background: 'rgba(59, 130, 246, 0.1)',
                              color: '#2563eb',
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontWeight: 700,
                            }}
                          >
                            <i className="fa-solid fa-briefcase"></i> CAC Business
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {activeDetail.product.sellerEmail}
                        {activeDetail.product.sellerPublicHandle ? ` • @${activeDetail.product.sellerPublicHandle}` : ''}
                        {activeDetail.product.sellerRole ? ` • ${activeDetail.product.sellerRole}` : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                    DESCRIPTION
                  </div>
                  <div
                    style={{
                      background: 'var(--bg-soft)',
                      padding: 14,
                      borderRadius: 6,
                      fontSize: 13,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      color: 'var(--text-body)',
                    }}
                  >
                    {activeDetail.description || 'No description provided by the seller.'}
                  </div>
                </div>

                {/* Tags if available */}
                {activeDetail.tags && activeDetail.tags.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                      TAGS & KEYWORDS
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {activeDetail.tags.map((t, i) => (
                        <span key={i} style={{ padding: '2px 8px', background: 'var(--bg-soft)', borderRadius: 4, fontSize: 11 }}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Orders */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    RECENT PURCHASES & ORDERS ({activeDetail.relatedOrders.length})
                  </div>
                  {activeDetail.relatedOrders.length === 0 ? (
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '12px', background: 'var(--bg-soft)', borderRadius: 6 }}>
                      No order items associated with this product yet.
                    </div>
                  ) : (
                    <div className="admin-table-wrap" style={{ border: '1px solid var(--border-mid)', borderRadius: 6 }}>
                      <table className="admin-table" style={{ fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th>Invoice</th>
                            <th>Buyer</th>
                            <th>Qty</th>
                            <th>Line Total</th>
                            <th>Order Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeDetail.relatedOrders.map((ord, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{ord.invoiceNumber}</td>
                              <td>{ord.buyerName || 'Buyer #' + ord.buyerId}</td>
                              <td>{ord.quantity}</td>
                              <td style={{ fontWeight: 600 }}>{formatPrice(ord.total)}</td>
                              <td>
                                <span className="admin-chip" style={{ fontSize: 10 }}>
                                  {ord.status || 'COMPLETED'}
                                </span>
                              </td>
                              <td style={{ color: 'var(--muted)' }}>{ord.createdAt ? timeAgo(ord.createdAt) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Moderation History Audit Log */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                    MODERATION HISTORY & AUDIT LOGS
                  </div>
                  {activeDetail.moderationHistory.length === 0 ? (
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '12px', background: 'var(--bg-soft)', borderRadius: 6 }}>
                      No prior moderation actions recorded for this product.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {activeDetail.moderationHistory.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 6,
                            background: 'var(--bg-soft)',
                            border: '1px solid var(--border-mid)',
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <strong style={{ color: 'var(--text-heading)' }}>{m.event}</strong>
                            <span style={{ color: 'var(--muted)', fontSize: 11 }}>{timeAgo(m.createdAt)}</span>
                          </div>
                          <div style={{ color: 'var(--text-body)', marginBottom: 2 }}>{m.detail}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>By: {m.actor}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                <div style={{ fontSize: 11.5, color: 'var(--muted)', borderTop: '1px solid var(--border-mid)', paddingTop: 12 }}>
                  <div>Created: {formatDate(activeDetail.product.createdAt)}</div>
                  {activeDetail.product.updatedAt && (
                    <div>Last Modified: {formatDate(activeDetail.product.updatedAt)}</div>
                  )}
                </div>
              </div>
            )}

            {/* Drawer Footer Actions */}
            {activeDetail && (
              <div
                style={{
                  padding: '14px 20px',
                  borderTop: '1px solid var(--border-mid)',
                  display: 'flex',
                  gap: 10,
                  justifyContent: 'flex-end',
                  background: 'var(--bg-card)',
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 10,
                }}
              >
                {activeDetail.product.status !== 'ARCHIVED' && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleOpenEdit(activeDetail.product)}
                    >
                      <i className="fa-solid fa-pen-to-square"></i> Edit
                    </button>

                    {activeDetail.product.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setProductToSuspend(activeDetail.product);
                          setSuspendReason('');
                        }}
                      >
                        <i className="fa-solid fa-ban"></i> Suspend
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setProductToRestore(activeDetail.product)}
                      >
                        <i className="fa-solid fa-circle-check"></i> Restore
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={() => {
                        setProductToDelete(activeDetail.product);
                        setDeleteReason('');
                      }}
                    >
                      <i className="fa-solid fa-trash-can"></i> Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            padding: 16,
          }}
          onClick={() => setEditingProduct(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 540,
              background: 'var(--bg-card)',
              borderRadius: 8,
              boxShadow: 'var(--shadow-xl)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-mid)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                Edit Product Listing #{editingProduct.id}
              </h3>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '75vh', overflowY: 'auto' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Category
                </label>
                <select
                  value={editForm.categoryId}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, categoryId: e.target.value }))}
                  style={{ width: '100%' }}
                >
                  <option value="">Keep current category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Price (NGN ₦)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.price}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, price: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Available Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, quantity: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Unit (e.g. kg, bag, ton)
                  </label>
                  <input
                    type="text"
                    value={editForm.unit}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, unit: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                  style={{ width: '100%' }}
                >
                  <option value="ACTIVE">ACTIVE (Published on marketplace)</option>
                  <option value="INACTIVE">INACTIVE (Hidden / Suspended)</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Description (optional update)
                </label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  placeholder="Leave empty to retain existing description..."
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-mid)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setEditingProduct(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleSaveEdit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving Changes…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Product Modal */}
      {productToSuspend && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            padding: 16,
          }}
          onClick={() => setProductToSuspend(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'var(--bg-card)',
              borderRadius: 8,
              boxShadow: 'var(--shadow-xl)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-mid)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#d97706' }}>
                <i className="fa-solid fa-ban" style={{ marginRight: 6 }}></i> Suspend Product Listing
              </h3>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text-body)', margin: 0 }}>
                Suspending <strong>"{productToSuspend.name}"</strong> (Seller:{' '}
                <strong>{productToSuspend.sellerName || 'ID: ' + productToSuspend.sellerId}</strong>) will immediately hide it
                from marketplace search results and prevent buyers from adding it to cart or checking out.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Suspension Reason (Mandatory) *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Inappropriate item description, pricing anomaly, missing required disclosures, or seller policy violation..."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-mid)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setProductToSuspend(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ background: '#d97706', borderColor: '#d97706' }}
                onClick={handleConfirmSuspend}
                disabled={isSubmitting || !suspendReason.trim()}
              >
                {isSubmitting ? 'Suspending Listing…' : 'Suspend Listing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Product Dialog */}
      <ConfirmDialog
        open={Boolean(productToRestore)}
        title="Restore Product Listing"
        message={`Are you sure you want to restore "${productToRestore?.name}"? The listing will be reactivated and become publicly discoverable in the marketplace.`}
        confirmLabel="Restore Listing"
        onConfirm={handleConfirmRestore}
        onCancel={() => setProductToRestore(null)}
      />

      {/* Delete Product Modal */}
      {productToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            padding: 16,
          }}
          onClick={() => setProductToDelete(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'var(--bg-card)',
              borderRadius: 8,
              boxShadow: 'var(--shadow-xl)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-mid)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--danger)' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }}></i> Delete Product Listing
              </h3>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text-body)', margin: 0 }}>
                Are you sure you want to remove <strong>"{productToDelete.name}"</strong>?
              </p>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  background: 'var(--bg-soft)',
                  padding: '10px 12px',
                  borderRadius: 6,
                }}
              >
                <strong>Preservation Guarantee:</strong> The listing will be archived and removed from public search and discovery.
                Historical order items, customer receipts, and financial records referencing this product remain intact and uncorrupted.
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  Deletion Reason (Mandatory for audit trail) *
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Prohibited goods, fraudulent seller listing, counterfeit item, or duplicate listing..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-mid)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 10,
              }}
            >
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setProductToDelete(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleConfirmDelete}
                disabled={isSubmitting || !deleteReason.trim()}
              >
                {isSubmitting ? 'Deleting Listing…' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
