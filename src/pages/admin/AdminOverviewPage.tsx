import { Link } from 'react-router-dom';
import { useAdminOverview } from '../../hooks/queries/useAdmin';
import { formatDate, formatPrice, roleLabel, timeAgo } from '../../lib/format';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';

function MetricCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  subtext,
  linkTo,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  subtext?: string;
  linkTo?: string;
}) {
  const content = (
    <div className={`admin-stat-card ${linkTo ? 'is-link' : ''}`} style={{ height: '100%' }}>
      <div className="admin-stat-card-top">
        <div className="admin-stat-card-icon" style={{ background: iconBg, color: iconColor }}>
          <i className={`fa-solid ${icon}`}></i>
        </div>
        {linkTo && <i className="fa-solid fa-arrow-right" style={{ color: 'var(--muted)', fontSize: 11 }}></i>}
      </div>
      <div className="admin-stat-value" style={{ marginTop: 6 }}>{value}</div>
      <div className="admin-stat-label">{label}</div>
      {subtext && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{subtext}</div>}
    </div>
  );

  return linkTo ? <Link to={linkTo} style={{ textDecoration: 'none' }}>{content}</Link> : content;
}

export default function AdminOverviewPage() {
  const { data, isLoading: loading } = useAdminOverview();

  if (loading && !data) return <PageLoadingSpinner message="Loading platform overview…" />;
  if (!data) return <p className="text-muted">Unable to load the platform overview right now.</p>;

  const userMetrics = data.userMetrics;
  const listingMetrics = data.listingMetrics;
  const orderMetrics = data.orderMetrics;
  const paymentMetrics = data.paymentMetrics;
  const attentionItems = data.attentionItems || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Platform Overview</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          Real-time platform activity, financial settled totals, orders pipeline, and administrative alerts.
        </p>
      </div>

      {/* Attention Required Banner / Grid */}
      {attentionItems.length > 0 && (
        <div className="admin-panel" style={{ borderLeft: '4px solid var(--accent, #eab308)', padding: '18px 20px' }}>
          <div className="admin-panel-hdr" style={{ marginBottom: 12 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, margin: 0 }}>
              <i className="fa-solid fa-bell" style={{ color: 'var(--accent, #eab308)' }}></i>
              Requires Administrative Attention ({attentionItems.reduce((acc, item) => acc + item.count, 0)})
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {attentionItems.map((item) => (
              <Link
                key={item.id}
                to={item.link}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: item.severity === 'danger' ? '#fee2e2' : item.severity === 'warning' ? '#fef3c7' : 'var(--bg-soft)',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${item.severity === 'danger' ? '#fca5a5' : item.severity === 'warning' ? '#fde047' : 'var(--border-mid)'}`,
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'transform 0.15s ease',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{item.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{item.description}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      padding: '2px 8px',
                      borderRadius: 12,
                      background: item.severity === 'danger' ? '#ef4444' : item.severity === 'warning' ? '#f59e0b' : 'var(--primary)',
                      color: '#fff',
                    }}
                  >
                    {item.count}
                  </span>
                  <i className="fa-solid fa-chevron-right" style={{ fontSize: 11, color: 'var(--muted)' }}></i>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Primary Key Metric Tiles */}
      <div className="admin-stats-row">
        <MetricCard
          linkTo="/admin/users"
          icon="fa-users"
          iconBg="rgba(22, 101, 52, 0.1)"
          iconColor="var(--primary)"
          label="Total Registered Users"
          value={userMetrics ? userMetrics.totalUsers.toLocaleString() : '—'}
          subtext={userMetrics ? `+${userMetrics.newUsersLast7Days} this week · +${userMetrics.newUsersLast30Days} this month` : undefined}
        />
        <MetricCard
          linkTo="/admin/payments"
          icon="fa-money-bill-wave"
          iconBg="rgba(37, 99, 235, 0.1)"
          iconColor="#2563eb"
          label="Settled Gross Volume (GMV)"
          value={paymentMetrics ? formatPrice(paymentMetrics.totalSuccessfulVolume) : '—'}
          subtext="Total successful payments settled via Flutterwave"
        />
        <MetricCard
          linkTo="/admin/orders"
          icon="fa-receipt"
          iconBg="rgba(217, 119, 6, 0.1)"
          iconColor="#d97706"
          label="Total Platform Orders"
          value={orderMetrics ? orderMetrics.totalOrders.toLocaleString() : '—'}
          subtext={orderMetrics ? `${orderMetrics.ordersAwaitingFulfillment} awaiting fulfillment` : undefined}
        />
        <MetricCard
          linkTo="/admin/demands"
          icon="fa-bullhorn"
          iconBg="rgba(147, 51, 234, 0.1)"
          iconColor="#9333ea"
          label="Buyer Demands"
          value={listingMetrics ? listingMetrics.openDemands.toLocaleString() : '—'}
          subtext={listingMetrics ? `${listingMetrics.totalDemands} total posted demands` : undefined}
        />
      </div>

      {/* Financial Oversight & Payment Breakdown */}
      <div className="admin-panel">
        <div className="admin-panel-hdr">
          <div>
            <h3>Financial & Payment Oversight</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
              Calculated from verified payment transactions in Nigerian Naira (₦). Unsettled, pending, and failed attempts are excluded from revenue.
            </p>
          </div>
          <Link to="/admin/payments" className="see-all" style={{ fontSize: 12 }}>
            All Payments <i className="fa-solid fa-chevron-right"></i>
          </Link>
        </div>

        {paymentMetrics ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            <div style={{ padding: '14px', background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Settled Volume</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', marginTop: 4 }}>
                {formatPrice(paymentMetrics.totalSuccessfulVolume)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 2 }}>{paymentMetrics.successfulPayments} successful payments</div>
            </div>

            <div style={{ padding: '14px', background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Volume Last 30 Days</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)', marginTop: 4 }}>
                {formatPrice(paymentMetrics.volumeLast30Days)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Rolling 30-day window</div>
            </div>

            <div style={{ padding: '14px', background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Pending Payments</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#d97706', marginTop: 4 }}>
                {paymentMetrics.pendingPayments}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Awaiting gateway confirmation</div>
            </div>

            <div style={{ padding: '14px', background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Failed / Flagged</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: paymentMetrics.failedPayments > 0 ? 'var(--danger)' : 'var(--text)', marginTop: 4 }}>
                {paymentMetrics.failedPayments}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {paymentMetrics.needsReviewCount} flagged for review
              </div>
            </div>

            <div style={{ padding: '14px', background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Total Refunded</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#6b7280', marginTop: 4 }}>
                {formatPrice(paymentMetrics.totalRefundedVolume)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Approved dispute refunds</div>
            </div>
          </div>
        ) : (
          <p className="text-muted" style={{ fontSize: 12 }}>No payment metrics recorded yet.</p>
        )}
      </div>

      {/* Two Column Grid: Users Breakdown + Orders Pipeline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* User Breakdown Panel */}
        <div className="admin-panel" style={{ margin: 0 }}>
          <div className="admin-panel-hdr">
            <div>
              <h3>User Distribution & Verification</h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Active accounts across marketplace roles</p>
            </div>
            <Link to="/admin/users" className="see-all" style={{ fontSize: 12 }}>
              Manage Users <i className="fa-solid fa-chevron-right"></i>
            </Link>
          </div>

          {userMetrics && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(userMetrics.usersByRole).map(([role, count]) => (
                  <div
                    key={role}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      background: 'var(--bg-soft)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    <span>{roleLabel(role)}</span>
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{count}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12 }}>
                <span className="chip chip-success">
                  <i className="fa-solid fa-id-card"></i> {userMetrics.identityVerifiedCount} ID Verified
                </span>
                <span className="chip chip-info">
                  <i className="fa-solid fa-building-circle-check"></i> {userMetrics.businessVerifiedCount} CAC Verified
                </span>
                <span className="chip chip-neutral">
                  <i className="fa-solid fa-envelope-circle-check"></i> {userMetrics.emailVerifiedCount} Email Verified
                </span>
                {userMetrics.suspendedCount > 0 && (
                  <span className="chip chip-danger">
                    <i className="fa-solid fa-ban"></i> {userMetrics.suspendedCount} Suspended
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Orders Pipeline Panel */}
        <div className="admin-panel" style={{ margin: 0 }}>
          <div className="admin-panel-hdr">
            <div>
              <h3>Orders & Marketplace Pipeline</h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Order fulfillment states and open demands</p>
            </div>
            <Link to="/admin/orders" className="see-all" style={{ fontSize: 12 }}>
              Manage Orders <i className="fa-solid fa-chevron-right"></i>
            </Link>
          </div>

          {orderMetrics && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
                {Object.entries(orderMetrics.ordersByStatus).map(([status, count]) => (
                  <div
                    key={status}
                    style={{
                      padding: '10px 8px',
                      background: 'var(--bg-soft)',
                      borderRadius: 'var(--radius-sm)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text)' }}>{count}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize', marginTop: 2 }}>{status}</div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                  Awaiting Fulfillment: <strong style={{ color: orderMetrics.ordersAwaitingFulfillment > 0 ? 'var(--accent, #d97706)' : 'var(--text)' }}>{orderMetrics.ordersAwaitingFulfillment}</strong>
                </span>
                {listingMetrics && (
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                    Active Listings: <strong style={{ color: 'var(--primary)' }}>{listingMetrics.activeProducts}</strong> / {listingMetrics.totalProducts}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flash Sales Active/Upcoming */}
      {data.flashSalesSoon.length > 0 && (
        <div className="admin-panel">
          <div className="admin-panel-hdr">
            <h3>Flash Sales Starting or Ending Soon</h3>
            <Link to="/admin/flash-sales" className="see-all" style={{ fontSize: 12 }}>
              Manage Flash Sales <i className="fa-solid fa-chevron-right"></i>
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.flashSalesSoon.map((f) => (
              <div
                key={f.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: 'var(--bg-soft)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>{f.title}</div>
                <span className={`chip ${f.phase === 'starting' ? 'chip-info' : 'chip-pending'}`}>
                  {f.phase === 'starting' ? `Starts ${timeAgo(f.startAt)}` : `Ends ${timeAgo(f.endAt)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Platform & Admin Activity */}
      <div className="admin-panel">
        <div className="admin-panel-hdr">
          <div>
            <h3>Recent Platform Activity & Audit Log</h3>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
              Immutable audit trail of administrator actions, order transitions, and security events.
            </p>
          </div>
          <Link to="/admin/activity" className="see-all" style={{ fontSize: 12 }}>
            View Full Log <i className="fa-solid fa-chevron-right"></i>
          </Link>
        </div>

        {data.recentActions.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 12.5 }}>No platform activity recorded yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {data.recentActions.slice(0, 10).map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 6px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 12.5,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: 'var(--bg-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      color: 'var(--primary)',
                      flexShrink: 0,
                    }}
                  >
                    <i className="fa-solid fa-shield-halved"></i>
                  </div>
                  <div>
                    <span style={{ fontWeight: 700 }}>{a.event.replace(/_/g, ' ')}</span>
                    <span style={{ color: 'var(--muted)', marginLeft: 6 }}>by {a.actor}</span>
                    {a.detail && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{a.detail}</div>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: 12 }}>{timeAgo(a.createdAt)}</span>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{formatDate(a.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
