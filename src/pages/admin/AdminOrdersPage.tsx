import { useEffect, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminOrders } from '../../hooks/queries/useOrders';
import { useUpdateOrderStatus } from '../../hooks/mutations/useOrderMutations';
import { formatDate, formatPrice } from '../../lib/format';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { Order } from '../../types';

type TabKey = 'all' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

function matchesTab(order: Order, tab: TabKey): boolean {
  if (tab === 'all') return true;
  return order.status === tab;
}

const NEXT_STATUS: Record<string, string> = { confirmed: 'shipped', shipped: 'delivered' };

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<Order | null>(null);
  const [confirmAction, setConfirmAction] = useState<'advance-status' | null>(null);

  const tab = (searchParams.get('tab') as TabKey) || 'all';
  const search = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(search);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: orders = [], isLoading } = useAdminOrders();
  const updateStatusMutation = useUpdateOrderStatus();

  useEffect(() => setSearchInput(search), [search]);

  const filtered = useMemo(() => {
    let list = orders.filter((o) => matchesTab(o, tab));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((o) =>
        o.invoiceNumber.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q) ||
        o.items.some((it) => it.sellerName?.toLowerCase().includes(q))
      );
    }
    if (dateFrom) list = list.filter((o) => new Date(o.createdAt) >= new Date(dateFrom));
    if (dateTo) list = list.filter((o) => new Date(o.createdAt) <= new Date(`${dateTo}T23:59:59`));

    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, tab, search, dateFrom, dateTo]);

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { all: orders.length, pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0 };
    orders.forEach((o) => {
      if (o.status in counts) counts[o.status as TabKey]++;
    });
    return counts;
  }, [orders]);

  if (!user) return null;
  if (user.role !== 'admin') return <Navigate to="/account" replace />;

  function setTab(next: TabKey) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next === 'all') p.delete('tab'); else p.set('tab', next);
      return p;
    });
  }

  function submitSearch(value: string) {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (value) p.set('search', value); else p.delete('search');
      return p;
    });
  }

  const totalValue = orders.reduce((s, o) => s + o.total, 0);

  function handleAdvanceStatus() {
    if (!selected || !selected.status || !(selected.status in NEXT_STATUS)) return;
    setConfirmAction(null);
    const nextStatus = NEXT_STATUS[selected.status] as Order['status'];
    updateStatusMutation.mutate(
      { orderId: selected.id, status: nextStatus },
      {
        onSuccess: () => {
          setSelected((prev) => (prev ? { ...prev, status: nextStatus } : null));
        },
      }
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Orders</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Every order placed on Agrobaba, across all buyers and sellers.</p>
      </div>

      {isLoading ? (
        <PageLoadingSpinner message="Loading orders…" />
      ) : (
        <>
          <div className="admin-stats-row">
            <div className="admin-stat-card">
              <div className="admin-stat-value">{orders.length}</div>
              <div className="admin-stat-label">Total orders</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value">{formatPrice(totalValue)}</div>
              <div className="admin-stat-label">Total order value</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-value">{orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length}</div>
              <div className="admin-stat-label">In progress</div>
            </div>
          </div>

          <div className="status-tabs">
            {TABS.map((t) => (
              <button key={t.key} className={`status-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                {t.label} <span className="count">{tabCounts[t.key]}</span>
              </button>
            ))}
          </div>

          <div className="admin-filters-row">
            <input
              type="text"
              placeholder="Search invoice, buyer or seller…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(searchInput); }}
              onBlur={() => submitSearch(searchInput)}
              style={{ minWidth: 220 }}
            />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From date" />
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To date" />
            {(search || dateFrom || dateTo) && (
              <button className="btn-outline btn-sm btn-inline" onClick={() => { setSearchInput(''); submitSearch(''); setDateFrom(''); setDateTo(''); }}>
                <i className="fa-solid fa-xmark"></i> Clear
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-cart">
              <i className="fa-solid fa-receipt"></i>
              <p>No orders match this view.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Invoice</th><th>Buyer</th><th>Seller(s)</th><th>Total</th><th>Date</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {filtered.map((order) => {
                    const sellers = [...new Set(order.items.map((it) => it.sellerName))].join(', ');
                    return (
                      <tr key={order.id} onClick={() => setSelected(order)}>
                        <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{order.invoiceNumber}</td>
                        <td style={{ fontWeight: 600 }}>{order.buyerName}</td>
                        <td>{sellers || '—'}</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(order.total)}</td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>
                          <span className={`chip ${order.status === 'delivered' ? 'chip-success' : order.status === 'cancelled' ? 'chip-danger' : 'chip-info'}`} style={{ textTransform: 'capitalize' }}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {selected && (
        <div className="admin-drawer-overlay" onClick={() => setSelected(null)}>
          <div className="admin-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-hdr">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800 }}>{selected.invoiceNumber}</h3>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>Placed {formatDate(selected.createdAt)}</p>
              </div>
              <button className="admin-drawer-close" onClick={() => setSelected(null)}><i className="fa-solid fa-xmark"></i></button>
            </div>

            <div className="admin-drawer-section">
              <h4>Status</h4>
              <span className="chip chip-info" style={{ textTransform: 'capitalize' }}>{selected.status}</span>
            </div>

            <div className="admin-drawer-section">
              <h4>Buyer</h4>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{selected.buyerName}</p>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>{selected.buyerPhone || 'No phone on file'}</p>
              <p style={{ fontSize: 12, color: 'var(--muted)' }}>{selected.buyerAddress || 'No address on file'}</p>
            </div>

            <div className="admin-drawer-section">
              <h4>Items</h4>
              {selected.items.map((it) => (
                <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                  <span>{it.quantity}&times; {it.name} <span style={{ color: 'var(--muted)' }}>({it.sellerName})</span></span>
                  <span style={{ fontWeight: 700 }}>{formatPrice(it.price * it.quantity)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <span>Total</span><span>{formatPrice(selected.total)}</span>
              </div>
            </div>

            <div className="admin-drawer-section" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selected.status in NEXT_STATUS && (
                <button className="btn-outline btn-inline btn-sm" onClick={() => setConfirmAction('advance-status')}>
                  <i className="fa-solid fa-truck"></i> Advance to "{NEXT_STATUS[selected.status]}"
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction === 'advance-status'}
        title="Advance order status?"
        message={`Move ${selected?.invoiceNumber} to "${selected?.status ? NEXT_STATUS[selected.status] : ''}"?`}
        confirmLabel="Advance status"
        onConfirm={handleAdvanceStatus}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
