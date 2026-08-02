import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAllOrdersAdmin } from '../../lib/orders';
import { formatDate, formatPrice } from '../../lib/format';
import { Breadcrumb } from '../../components/Breadcrumb';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import type { Order } from '../../types';

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const data = await getAllOrdersAdmin();
      if (active) {
        setOrders(data);
        setLoading(false);
      }
    }
    if (user?.role === 'admin') void load();
    return () => { active = false; };
  }, [user]);

  if (!user) return null;
  if (user.role !== 'admin') return <Navigate to="/account" replace />;

  const totalRevenue = orders.filter((o) => o.paid).reduce((s, o) => s + o.total, 0);
  const unpaidCount = orders.filter((o) => !o.paid).length;

  const stats = [
    { icon: 'fa-receipt', label: 'Total Orders', value: orders.length, color: 'var(--primary)' },
    { icon: 'fa-naira-sign', label: 'Total Revenue', value: formatPrice(totalRevenue), color: 'var(--success)' },
    { icon: 'fa-clock', label: 'Awaiting Payment', value: unpaidCount, color: 'var(--accent)' },
  ];

  return (
    <div className="section">
      <div className="container">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'My Account', href: '/account' }, { label: 'Review Orders' }]} />

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Review Orders</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Every order placed on Agrobaba, across all buyers and sellers.</p>
        </div>

        {loading ? (
          <PageLoadingSpinner message="Loading orders…" />
        ) : (
          <>
            <div className="stats-grid" style={{ marginBottom: 28 }}>
              {stats.map((s) => (
                <div className="stat-card" key={s.label}>
                  <div className="stat-icon"><i className={`fa-solid ${s.icon}`} style={{ color: s.color }}></i></div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {orders.length === 0 ? (
              <div className="empty-cart">
                <i className="fa-solid fa-receipt"></i>
                <p>No orders have been placed yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Buyer</th><th>Seller(s)</th><th>Invoice</th><th>Total</th><th>Date</th><th>Payment</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, i) => {
                      const sellers = [...new Set(order.items.map((it) => it.sellerName))].join(', ');
                      return (
                        <tr key={order.id}>
                          <td>#{i + 1}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{order.buyerName}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{order.buyerPhone || ''}</div>
                          </td>
                          <td style={{ fontSize: 12 }}>{sellers || '—'}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{order.invoiceNumber}</td>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(order.total)}</td>
                          <td>{formatDate(order.createdAt)}</td>
                          <td><span className={`status-${order.paid ? 'delivered' : 'pending'}`}>{order.paid ? 'Paid' : 'Unpaid'}</span></td>
                          <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{order.status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
