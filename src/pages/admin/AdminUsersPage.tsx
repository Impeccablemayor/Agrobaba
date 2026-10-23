import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminUsers } from '../../hooks/queries/useAdmin';
import { formatDate, roleLabel, timeAgo } from '../../lib/format';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { ActionMenu } from '../../components/ActionMenu';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { suspendUser, reinstateUser } from '../../lib/adminUsers';
import { showToast } from '../../lib/toastBus';
import type { AdminUserSummary } from '../../types';

export default function AdminUsersPage() {
  const navigate = useNavigate();

  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [verification, setVerification] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(0);
  const size = 15;

  // Suspension / Reinstatement Modals
  const [userToSuspend, setUserToSuspend] = useState<AdminUserSummary | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [userToReinstate, setUserToReinstate] = useState<AdminUserSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute query parameters passed to backend API
  const queryParams = {
    search: search.trim() || undefined,
    role: role || undefined,
    status: status || undefined,
    verification: verification || undefined,
    sort,
    page,
    size,
  };

  const { data: pageData, isLoading, refetch } = useAdminUsers(queryParams);

  // Client-side date filter refinement if date range is specified
  const filteredUsers = useMemo(() => {
    let list = pageData?.content || [];
    if (dateFrom) {
      list = list.filter((u) => new Date(u.createdAt) >= new Date(dateFrom));
    }
    if (dateTo) {
      list = list.filter((u) => new Date(u.createdAt) <= new Date(`${dateTo}T23:59:59`));
    }
    return list;
  }, [pageData?.content, dateFrom, dateTo]);

  const totalElements = pageData?.totalElements || 0;
  const totalPages = pageData?.totalPages || 0;

  async function handleSuspend() {
    if (!userToSuspend || !suspendReason.trim()) {
      showToast('Please enter a reason for suspension', 'error');
      return;
    }
    setIsSubmitting(true);
    const ok = await suspendUser(userToSuspend.id, suspendReason.trim());
    setIsSubmitting(false);
    if (ok) {
      setUserToSuspend(null);
      setSuspendReason('');
      void refetch();
    }
  }

  async function handleReinstate() {
    if (!userToReinstate) return;
    setIsSubmitting(true);
    const ok = await reinstateUser(userToReinstate.id);
    setIsSubmitting(false);
    if (ok) {
      setUserToReinstate(null);
      void refetch();
    }
  }

  function resetFilters() {
    setSearch('');
    setRole('');
    setStatus('');
    setVerification('');
    setDateFrom('');
    setDateTo('');
    setSort('newest');
    setPage(0);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>
            User Management
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Inspect, search, and manage user accounts, verification statuses, and marketplace activity.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            <strong>{totalElements.toLocaleString()}</strong> total accounts
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-panel" style={{ padding: '16px 18px', marginBottom: 0 }}>
        <div className="admin-filters-row" style={{ marginBottom: 12 }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <input
              type="text"
              placeholder="Search by name, handle, email, phone, or ID…"
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
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All Account Roles</option>
            <option value="farmer">Farmer</option>
            <option value="buyer">Buyer</option>
            <option value="agro-dealer">Agro-Dealer</option>
            <option value="service-provider">Service Provider</option>
            <option value="admin">Administrator</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All Account Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          <select
            value={verification}
            onChange={(e) => {
              setVerification(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All Verification States</option>
            <option value="identity_verified">ID Verified Only</option>
            <option value="business_verified">CAC Verified Only</option>
            <option value="email_verified">Email Verified Only</option>
            <option value="unverified">Unverified Only</option>
          </select>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(0);
            }}
          >
            <option value="newest">Newest Registered First</option>
            <option value="oldest">Oldest Registered First</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>

        {/* Date Range & Clear Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12 }}>
          <span style={{ color: 'var(--muted)' }}>Registered Between:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(0);
            }}
            style={{ fontSize: 12, padding: '4px 8px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-sm)' }}
          />
          <span style={{ color: 'var(--muted)' }}>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(0);
            }}
            style={{ fontSize: 12, padding: '4px 8px', border: '1px solid var(--border-mid)', borderRadius: 'var(--radius-sm)' }}
          />

          {(search || role || status || verification || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={resetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--danger)',
                cursor: 'pointer',
                fontWeight: 600,
                padding: '4px 8px',
                fontSize: 12,
              }}
            >
              <i className="fa-solid fa-rotate-left"></i> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <PageLoadingSpinner message="Loading user directory…" />
      ) : filteredUsers.length === 0 ? (
        <div className="admin-panel" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <i className="fa-solid fa-users-slash" style={{ fontSize: 32, color: 'var(--muted)', marginBottom: 12, display: 'block' }}></i>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No users matched the filters</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
            Try searching for a different name, email, or clearing your role/status filters.
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
                  <th>User / Handle</th>
                  <th>Contact & Location</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Verification</th>
                  <th>Activity Counts</th>
                  <th>Registered</th>
                  <th>Last Active</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isSuspended = u.status === 'SUSPENDED';

                  return (
                    <tr
                      key={u.id}
                      onClick={() => navigate(`/admin/users/${u.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Name & Handle */}
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                          {u.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                          {u.publicHandle ? `@${u.publicHandle}` : `ID: #${u.id}`}
                        </div>
                        {u.businessName && (
                          <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
                            <i className="fa-solid fa-building" style={{ fontSize: 10, marginRight: 4 }}></i>
                            {u.businessName}
                          </div>
                        )}
                      </td>

                      {/* Contact & Location */}
                      <td>
                        <div style={{ fontSize: 12 }}>{u.email}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.contact || 'No phone'}</div>
                        {(u.city || u.state) && (
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                            <i className="fa-solid fa-location-dot" style={{ fontSize: 10, marginRight: 3 }}></i>
                            {[u.city, u.state].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Role */}
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: u.role === 'admin' ? 'rgba(147, 51, 234, 0.1)' : 'var(--bg-soft)',
                            color: u.role === 'admin' ? '#9333ea' : 'var(--text)',
                          }}
                        >
                          {roleLabel(u.role)}
                        </span>
                      </td>

                      {/* Account Status */}
                      <td>
                        <span className={`chip ${isSuspended ? 'chip-danger' : 'chip-success'}`}>
                          <i className={`fa-solid ${isSuspended ? 'fa-ban' : 'fa-circle-check'}`}></i>
                          {u.status}
                        </span>
                      </td>

                      {/* Verification Badges */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          {u.identityVerified && (
                            <span className="chip chip-success" style={{ fontSize: 10, padding: '1px 6px' }}>
                              <i className="fa-solid fa-id-card"></i> ID Verified
                            </span>
                          )}
                          {u.businessVerified && (
                            <span className="chip chip-info" style={{ fontSize: 10, padding: '1px 6px' }}>
                              <i className="fa-solid fa-certificate"></i> CAC Verified
                            </span>
                          )}
                          {u.emailVerified && !u.identityVerified && !u.businessVerified && (
                            <span className="chip chip-neutral" style={{ fontSize: 10, padding: '1px 6px' }}>
                              <i className="fa-solid fa-envelope"></i> Email Confirmed
                            </span>
                          )}
                          {!u.identityVerified && !u.businessVerified && !u.emailVerified && (
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Unverified</span>
                          )}
                        </div>
                      </td>

                      {/* Aggregated Marketplace Counts */}
                      <td>
                        <div style={{ fontSize: 11.5, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          <span title="Product listings" style={{ color: 'var(--muted)' }}>
                            <i className="fa-solid fa-box" style={{ marginRight: 3 }}></i>
                            <strong style={{ color: 'var(--text)' }}>{u.listingsCount}</strong>
                          </span>
                          <span title="Buyer demands" style={{ color: 'var(--muted)' }}>
                            <i className="fa-solid fa-bullhorn" style={{ marginRight: 3 }}></i>
                            <strong style={{ color: 'var(--text)' }}>{u.demandsCount}</strong>
                          </span>
                          <span title="Orders" style={{ color: 'var(--muted)' }}>
                            <i className="fa-solid fa-receipt" style={{ marginRight: 3 }}></i>
                            <strong style={{ color: 'var(--text)' }}>{u.ordersCount}</strong>
                          </span>
                          <span title="Transactions" style={{ color: 'var(--muted)' }}>
                            <i className="fa-solid fa-credit-card" style={{ marginRight: 3 }}></i>
                            <strong style={{ color: 'var(--text)' }}>{u.transactionsCount}</strong>
                          </span>
                        </div>
                      </td>

                      {/* Registration Date */}
                      <td>
                        <div style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(u.createdAt)}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(u.createdAt)}</div>
                      </td>

                      {/* Last Active */}
                      <td>
                        {u.lastActiveAt ? (
                          <div style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                            <div>{timeAgo(u.lastActiveAt)}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{formatDate(u.lastActiveAt)}</div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Never logged in</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <ActionMenu
                          items={[
                            {
                              label: 'View Detailed Profile',
                              icon: 'fa-user',
                              onClick: () => navigate(`/admin/users/${u.id}`),
                            },
                            ...(isSuspended
                              ? [
                                  {
                                    label: 'Reinstate Account',
                                    icon: 'fa-user-check',
                                    onClick: () => setUserToReinstate(u),
                                  },
                                ]
                              : [
                                  {
                                    label: 'Suspend Account',
                                    icon: 'fa-ban',
                                    danger: true,
                                    onClick: () => {
                                      setUserToSuspend(u);
                                      setSuspendReason('');
                                    },
                                  },
                                ]),
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
                Showing page {page + 1} of {totalPages} ({totalElements.toLocaleString()} users)
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

      {/* Suspension Modal with Required Reason */}
      {userToSuspend && (
        <div className="confirm-overlay" onClick={() => !isSubmitting && setUserToSuspend(null)}>
          <div
            className="confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 440 }}
          >
            <div className="confirm-icon" style={{ background: '#fee2e2', color: 'var(--danger)' }}>
              <i className="fa-solid fa-user-slash"></i>
            </div>
            <h3>Suspend User Account</h3>
            <p>
              Suspending <strong>{userToSuspend.name}</strong> ({userToSuspend.email}) will immediately terminate their active sessions and block them from logging in, publishing listings, or creating orders.
            </p>
            <div style={{ margin: '14px 0', textAlign: 'left' }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                Reason for Suspension <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Specify violation, dispute, suspicious activity, or fraud report…"
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
                onClick={() => setUserToSuspend(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleSuspend}
                disabled={isSubmitting || !suspendReason.trim()}
              >
                {isSubmitting ? 'Suspending…' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reinstate Modal */}
      <ConfirmDialog
        open={Boolean(userToReinstate)}
        title="Reinstate User Account"
        message={`Are you sure you want to reinstate ${userToReinstate?.name}? This will restore their login access and allow them to resume marketplace activity.`}
        confirmLabel="Reinstate Account"
        cancelLabel="Cancel"
        busy={isSubmitting}
        onConfirm={handleReinstate}
        onCancel={() => setUserToReinstate(null)}
      />
    </div>
  );
}
