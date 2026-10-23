import { useState } from 'react';
import { useAdminDemands, useAdminDemandDetail } from '../../hooks/queries/useAdmin';
import { formatDate, formatPrice, timeAgo } from '../../lib/format';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { ActionMenu } from '../../components/ActionMenu';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { closeAdminDemand, deleteAdminDemand, updateAdminDemand } from '../../lib/adminDemands';
import { showToast } from '../../lib/toastBus';
import type { AdminDemandSummary } from '../../types';

export default function AdminDemandsPage() {
  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(0);
  const size = 15;

  // Modals & Drawer State
  const [selectedDemandId, setSelectedDemandId] = useState<number | null>(null);
  const [editingDemand, setEditingDemand] = useState<AdminDemandSummary | null>(null);
  const [demandToDelete, setDemandToDelete] = useState<AdminDemandSummary | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [demandToClose, setDemandToClose] = useState<AdminDemandSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    quantity: '',
    budget: '',
    location: '',
    deadline: '',
    status: 'OPEN',
  });

  const queryParams = {
    search: search.trim() || undefined,
    status: status || undefined,
    sort,
    page,
    size,
  };

  const { data: pageData, isLoading, refetch } = useAdminDemands(queryParams);
  const { data: activeDetail, isLoading: detailLoading } = useAdminDemandDetail(selectedDemandId);

  const demands = pageData?.content || [];
  const totalElements = pageData?.totalElements || 0;
  const totalPages = pageData?.totalPages || 0;

  function handleOpenEdit(d: AdminDemandSummary) {
    setEditingDemand(d);
    setEditForm({
      title: d.title || '',
      description: d.description || '',
      quantity: d.quantity || '',
      budget: d.budget ? String(d.budget) : '',
      location: d.location || '',
      deadline: d.deadline ? d.deadline.slice(0, 10) : '',
      status: d.status || 'OPEN',
    });
  }

  async function handleSaveEdit() {
    if (!editingDemand) return;
    if (!editForm.title.trim()) {
      showToast('Demand title cannot be blank', 'error');
      return;
    }

    setIsSubmitting(true);
    const updated = await updateAdminDemand(editingDemand.id, {
      title: editForm.title.trim(),
      description: editForm.description.trim() || undefined,
      quantity: editForm.quantity.trim() || undefined,
      budget: editForm.budget ? Number(editForm.budget) : undefined,
      location: editForm.location.trim() || undefined,
      deadline: editForm.deadline ? `${editForm.deadline}T23:59:59` : undefined,
      status: editForm.status,
    });
    setIsSubmitting(false);

    if (updated) {
      setEditingDemand(null);
      void refetch();
    }
  }

  async function handleConfirmClose() {
    if (!demandToClose) return;
    setIsSubmitting(true);
    const updated = await closeAdminDemand(demandToClose.id);
    setIsSubmitting(false);
    if (updated) {
      setDemandToClose(null);
      void refetch();
    }
  }

  async function handleConfirmDelete() {
    if (!demandToDelete || !deleteReason.trim()) {
      showToast('Please specify a reason for deleting/archiving this demand', 'error');
      return;
    }
    setIsSubmitting(true);
    const updated = await deleteAdminDemand(demandToDelete.id, deleteReason.trim());
    setIsSubmitting(false);
    if (updated) {
      setDemandToDelete(null);
      setDeleteReason('');
      void refetch();
    }
  }

  function resetFilters() {
    setSearch('');
    setStatus('');
    setSort('newest');
    setPage(0);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>
            Buyer Demands Oversight
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Monitor buyer requests, submitted quotations, offers, and manage demand lifecycle.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            <strong>{totalElements.toLocaleString()}</strong> buyer demands
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-panel" style={{ padding: '16px 18px', marginBottom: 0 }}>
        <div className="admin-filters-row" style={{ marginBottom: 0 }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <input
              type="text"
              placeholder="Search demands by title, buyer, location, or ID…"
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

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All Active Demands</option>
            <option value="OPEN">Open Only</option>
            <option value="CLOSED">Closed Only</option>
            <option value="MATCHED">Matched Only</option>
            <option value="deleted">Archived / Soft-Deleted</option>
          </select>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(0);
            }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="budget_desc">Highest Budget First</option>
            <option value="budget_asc">Lowest Budget First</option>
          </select>

          {(search || status || sort !== 'newest') && (
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
      </div>

      {/* Demands Table */}
      {isLoading ? (
        <PageLoadingSpinner message="Loading buyer demands…" />
      ) : demands.length === 0 ? (
        <div className="admin-panel" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <i className="fa-solid fa-bullhorn" style={{ fontSize: 32, color: 'var(--muted)', marginBottom: 12, display: 'block' }}></i>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No buyer demands found</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
            No buyer demands match the specified filters. Try selecting a different status or resetting your search.
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
                  <th>Demand / Category</th>
                  <th>Buyer</th>
                  <th>Quantity & Location</th>
                  <th>Budget</th>
                  <th>Status</th>
                  <th>Offers</th>
                  <th>Created</th>
                  <th>Deadline</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {demands.map((d) => {
                  const isDeleted = Boolean(d.deleted);

                  return (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedDemandId(d.id)}
                      style={{ cursor: 'pointer', opacity: isDeleted ? 0.75 : 1 }}
                    >
                      {/* Demand Title & Category */}
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                          {d.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          <span>#{d.id}</span>
                          {d.category && <span style={{ marginLeft: 6 }}>• {d.category}</span>}
                        </div>
                      </td>

                      {/* Buyer */}
                      <td>
                        {d.buyer ? (
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 12.5 }}>{d.buyer.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.buyer.email}</div>
                            {d.buyer.verified && (
                              <span className="chip chip-success" style={{ fontSize: 9.5, padding: '1px 5px', marginTop: 2 }}>
                                Verified
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: 12 }}>Anonymous / Deleted</span>
                        )}
                      </td>

                      {/* Quantity & Location */}
                      <td>
                        <div style={{ fontSize: 12.5 }}>{d.quantity || 'Flexible'}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          <i className="fa-solid fa-location-dot" style={{ fontSize: 10, marginRight: 3 }}></i>
                          {d.location || 'Any location'}
                        </div>
                      </td>

                      {/* Budget */}
                      <td>
                        <span style={{ fontWeight: 800, fontSize: 13 }}>
                          {d.budget ? formatPrice(d.budget) : 'Open'}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td>
                        {isDeleted ? (
                          <span className="chip chip-danger" title={`Deleted: ${d.deleteReason || 'No reason'}`}>
                            <i className="fa-solid fa-trash-can"></i> Deleted
                          </span>
                        ) : (
                          <span
                            className={`chip ${
                              d.status === 'OPEN'
                                ? 'chip-success'
                                : d.status === 'MATCHED'
                                ? 'chip-info'
                                : 'chip-neutral'
                            }`}
                          >
                            {d.status}
                          </span>
                        )}
                      </td>

                      {/* Offers Count */}
                      <td>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 12,
                            color: d.responsesCount > 0 ? 'var(--primary)' : 'var(--muted)',
                          }}
                        >
                          <i className="fa-solid fa-hand-holding-dollar" style={{ marginRight: 4 }}></i>
                          {d.responsesCount} {d.responsesCount === 1 ? 'offer' : 'offers'}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td>
                        <div style={{ fontSize: 12 }}>{formatDate(d.createdAt)}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(d.createdAt)}</div>
                      </td>

                      {/* Deadline */}
                      <td>
                        {d.deadline ? (
                          <div style={{ fontSize: 12 }}>{formatDate(d.deadline)}</div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>None set</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <ActionMenu
                          items={[
                            {
                              label: 'View Details & Offers',
                              icon: 'fa-eye',
                              onClick: () => setSelectedDemandId(d.id),
                            },
                            ...(!isDeleted
                              ? [
                                  {
                                    label: 'Edit Demand',
                                    icon: 'fa-pen-to-square',
                                    onClick: () => handleOpenEdit(d),
                                  },
                                  ...(d.status === 'OPEN'
                                    ? [
                                        {
                                          label: 'Close Demand',
                                          icon: 'fa-lock',
                                          onClick: () => setDemandToClose(d),
                                        },
                                      ]
                                    : []),
                                  {
                                    label: 'Soft-Delete / Archive',
                                    icon: 'fa-trash-can',
                                    danger: true,
                                    onClick: () => {
                                      setDemandToDelete(d);
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
                Showing page {page + 1} of {totalPages} ({totalElements.toLocaleString()} demands)
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <i className="fa-solid fa-chevron-left"></i> Previous
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Demand Detail Drawer */}
      {selectedDemandId !== null && (
        <div className="admin-drawer-overlay" onClick={() => setSelectedDemandId(null)}>
          <div
            className="admin-drawer"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(540px, 100vw)' }}
          >
            {detailLoading || !activeDetail ? (
              <PageLoadingSpinner message="Loading demand detail…" />
            ) : (
              <>
                <div className="admin-drawer-hdr">
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 900, marginBottom: 2 }}>{activeDetail.demand.title}</h3>
                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
                      Demand #{activeDetail.demand.id} • Posted {formatDate(activeDetail.demand.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="admin-drawer-close"
                    onClick={() => setSelectedDemandId(null)}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                {/* Soft-Deleted Notice */}
                {activeDetail.demand.deleted && (
                  <div
                    style={{
                      padding: '12px 14px',
                      background: '#fee2e2',
                      border: '1px solid #fca5a5',
                      borderRadius: 'var(--radius-sm)',
                      color: '#991b1b',
                      fontSize: 12.5,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      <i className="fa-solid fa-trash-can" style={{ marginRight: 6 }}></i>
                      Soft-Deleted / Archived
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <strong>Reason:</strong> {activeDetail.demand.deleteReason || 'Not specified'}
                    </div>
                    <div style={{ fontSize: 11, marginTop: 2, opacity: 0.85 }}>
                      Deleted by {activeDetail.demand.deletedBy || 'Admin'} on {formatDate(activeDetail.demand.deletedAt)}
                    </div>
                  </div>
                )}

                {/* Demand Overview Section */}
                <div className="admin-drawer-section">
                  <h4>Demand Overview</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12.5 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>STATUS</div>
                      <span className={`chip ${activeDetail.demand.status === 'OPEN' ? 'chip-success' : 'chip-neutral'}`} style={{ marginTop: 2 }}>
                        {activeDetail.demand.status}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>BUDGET</div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>
                        {activeDetail.demand.budget ? formatPrice(activeDetail.demand.budget) : 'Open'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>QUANTITY NEEDED</div>
                      <div style={{ fontWeight: 600 }}>{activeDetail.demand.quantity || 'Flexible'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>PREFERRED LOCATION</div>
                      <div style={{ fontWeight: 600 }}>{activeDetail.demand.location || 'Any location'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>CATEGORY</div>
                      <div>{activeDetail.demand.category || 'General'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>DEADLINE</div>
                      <div>{activeDetail.demand.deadline ? formatDate(activeDetail.demand.deadline) : 'None set'}</div>
                    </div>
                  </div>

                  {activeDetail.demand.description && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }}>DESCRIPTION</div>
                      <p style={{ fontSize: 12.5, lineHeight: 1.5, background: 'var(--bg-soft)', padding: 10, borderRadius: 'var(--radius-sm)' }}>
                        {activeDetail.demand.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Buyer Information */}
                <div className="admin-drawer-section">
                  <h4>Buyer Details</h4>
                  {activeDetail.demand.buyer ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{activeDetail.demand.buyer.name}</div>
                      <div style={{ color: 'var(--muted)' }}>{activeDetail.demand.buyer.email}</div>
                      {activeDetail.demand.buyer.contact && <div>Phone: {activeDetail.demand.buyer.contact}</div>}
                      <div style={{ marginTop: 4 }}>
                        {activeDetail.demand.buyer.verified && (
                          <span className="chip chip-success" style={{ fontSize: 10, marginRight: 6 }}>
                            ID Verified
                          </span>
                        )}
                        {activeDetail.demand.buyer.businessVerified && (
                          <span className="chip chip-info" style={{ fontSize: 10 }}>
                            CAC Verified
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--muted)', fontSize: 12 }}>Buyer details unavailable.</p>
                  )}
                </div>

                {/* Submitted Offers / Responses */}
                <div className="admin-drawer-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h4 style={{ margin: 0 }}>Offers & Responses ({activeDetail.responses.length})</h4>
                  </div>

                  {activeDetail.responses.length === 0 ? (
                    <p style={{ color: 'var(--muted)', fontSize: 12.5 }}>No offers or responses have been submitted for this demand yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {activeDetail.responses.map((resp) => (
                        <div
                          key={resp.id}
                          style={{
                            padding: '12px 14px',
                            background: 'var(--bg-soft)',
                            borderRadius: 'var(--radius-sm)',
                            border: resp.accepted ? '1.5px solid var(--primary)' : '1px solid var(--border-mid)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: 12.5 }}>
                              {resp.responder ? resp.responder.name : `Responder #${resp.id}`}
                              {resp.responder?.verified && (
                                <i className="fa-solid fa-circle-check" style={{ color: 'var(--primary)', marginLeft: 5, fontSize: 11 }} title="Verified Seller"></i>
                              )}
                            </div>
                            <div>
                              {resp.price ? (
                                <span style={{ fontWeight: 900, color: 'var(--text)', fontSize: 13 }}>
                                  {formatPrice(resp.price)}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--muted)', fontSize: 11 }}>No quote price</span>
                              )}
                            </div>
                          </div>

                          {resp.product && (
                            <div style={{ fontSize: 11.5, color: 'var(--primary)', marginTop: 4, fontWeight: 600 }}>
                              <i className="fa-solid fa-box" style={{ marginRight: 4 }}></i>
                              Linked Product: {resp.product.name}
                            </div>
                          )}

                          <div style={{ fontSize: 12, marginTop: 6, color: 'var(--text)' }}>
                            {resp.message}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
                            <span>{timeAgo(resp.createdAt)}</span>
                            {resp.accepted && (
                              <span className="chip chip-success" style={{ fontSize: 9.5 }}>
                                <i className="fa-solid fa-check"></i> Accepted Offer
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Drawer Footer Actions */}
                {!activeDetail.demand.deleted && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleOpenEdit(activeDetail.demand)}
                      style={{ flex: 1 }}
                    >
                      <i className="fa-solid fa-pen-to-square"></i> Edit Demand
                    </button>
                    {activeDetail.demand.status === 'OPEN' && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setDemandToClose(activeDetail.demand)}
                      >
                        <i className="fa-solid fa-lock"></i> Close
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        setDemandToDelete(activeDetail.demand);
                        setDeleteReason('');
                      }}
                      style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                    >
                      <i className="fa-solid fa-trash-can"></i> Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Demand Modal */}
      {editingDemand && (
        <div className="confirm-overlay" onClick={() => !isSubmitting && setEditingDemand(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500, textAlign: 'left' }}>
            <h3 style={{ marginBottom: 14 }}>Edit Buyer Demand #{editingDemand.id}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Title <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 12.5, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-mid)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Budget (₦)
                  </label>
                  <input
                    type="number"
                    value={editForm.budget}
                    onChange={(e) => setEditForm((f) => ({ ...f, budget: e.target.value }))}
                    placeholder="e.g. 500000"
                    style={{ width: '100%', padding: '8px 10px', fontSize: 12.5, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-mid)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Quantity Needed
                  </label>
                  <input
                    type="text"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))}
                    placeholder="e.g. 50 bags, 2 tons"
                    style={{ width: '100%', padding: '8px 10px', fontSize: 12.5, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-mid)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Preferred Location
                  </label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Kano, Ibadan"
                    style={{ width: '100%', padding: '8px 10px', fontSize: 12.5, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-mid)' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 12.5, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-mid)' }}
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="MATCHED">MATCHED</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Deadline
                </label>
                <input
                  type="date"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm((f) => ({ ...f, deadline: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 12.5, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-mid)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11.5, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 12.5, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-mid)' }}
                />
              </div>
            </div>

            <div className="confirm-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setEditingDemand(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveEdit}
                disabled={isSubmitting || !editForm.title.trim()}
              >
                {isSubmitting ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Demand Dialog */}
      <ConfirmDialog
        open={Boolean(demandToClose)}
        title="Close Buyer Demand"
        message={`Are you sure you want to close "${demandToClose?.title}"? Sellers will no longer be able to submit new offers or quotes.`}
        confirmLabel="Close Demand"
        cancelLabel="Cancel"
        busy={isSubmitting}
        onConfirm={handleConfirmClose}
        onCancel={() => setDemandToClose(null)}
      />

      {/* Soft-Delete Demand Modal with Mandatory Reason */}
      {demandToDelete && (
        <div className="confirm-overlay" onClick={() => !isSubmitting && setDemandToDelete(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="confirm-icon" style={{ background: '#fee2e2', color: 'var(--danger)' }}>
              <i className="fa-solid fa-trash-can"></i>
            </div>
            <h3>Archive / Delete Demand</h3>
            <p>
              Soft-deleting <strong>"{demandToDelete.title}"</strong> will immediately remove it from public marketplace listings, search results, and buyer active demands. Associated orders, offers, and financial records will be preserved for audits and dispute resolution.
            </p>
            <div style={{ margin: '14px 0', textAlign: 'left' }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                Reason for Deletion <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Specify policy violation, spam, duplicate demand, or buyer request…"
                rows={3}
                style={{
                  width: '100%',
                  padding: 8,
                  fontSize: 12.5,
                  borderRadius: 'var(--radius-sm)',
                  border: '1.5px solid var(--border-mid)',
                  outline: 'none',
                }}
              />
            </div>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDemandToDelete(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={isSubmitting || !deleteReason.trim()}
              >
                {isSubmitting ? 'Deleting…' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
