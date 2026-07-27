import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getMyOrders } from '../../lib/orders';
import { formatDate, formatPrice } from '../../lib/format';

import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import type { Order } from '../../types';

type Filter = 'all' | 'unpaid' | 'paid' | 'delivered';

export default function MyOrdersPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      if (!user) return;
      setLoading(true);
      const data = await getMyOrders();
      if (active) {
        setOrders(data);
        setLoading(false);
      }
    }

    void loadOrders();
    return () => { active = false; };
  }, [user]);

  if (!user) return null;
  const isServiceProvider = user.role === 'service-provider';

  const paid = orders.filter((o) => o.paid).length;
  const unpaid = orders.filter((o) => !o.paid).length;
  const totalSpent = orders.filter((o) => o.paid).reduce((s, o) => s + o.total, 0);

  const stats = [
    { icon: 'fa-box', label: 'Total Orders', value: orders.length, color: 'var(--primary)' },
    { icon: 'fa-clock', label: 'Unpaid', value: unpaid, color: 'var(--accent)' },
    { icon: 'fa-circle-check', label: 'Paid', value: paid, color: 'var(--success)' },
    { icon: 'fa-naira-sign', label: 'Total Spent', value: formatPrice(totalSpent), color: 'var(--primary)' },
  ];

  let filtered = orders;
  if (filter === 'unpaid') filtered = orders.filter((o) => !o.paid);
  else if (filter === 'paid') filtered = orders.filter((o) => o.paid && o.status !== 'delivered');
  else if (filter === 'delivered') filtered = orders.filter((o) => o.status === 'delivered');

  return (
    <div className="section">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/account">My Account</Link></li>
            <li className="breadcrumb-item active">{isServiceProvider ? 'My Bookings' : 'My Orders'}</li>
          </ol>
        </nav>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>
            {isServiceProvider ? 'My Bookings' : 'My Orders'}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            {isServiceProvider ? 'Track services you have booked from others.' : "Track all orders you've placed and their delivery status."}
          </p>
        </div>

        {loading ? (
          <PageLoadingSpinner message="Loading your orders…" />
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

          <div className="shop-tabs">
            {(['all', 'unpaid', 'paid', 'delivered'] as const).map((f) => (
              <button key={f} className={`shop-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All Orders' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-cart">
              <i className="fa-solid fa-box-open"></i>
              <p>{filter === 'all' ? "You haven't placed any orders yet. Start shopping!" : `No ${filter} orders found.`}</p>
              {filter === 'all' && (
                <Link to="/shop" className="btn-primary btn-inline btn-sm">
                  <i className="fa-solid fa-store"></i> Browse Shop
                </Link>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>#</th><th>Invoice</th><th>Items</th><th>Total</th><th>Date</th><th>Payment</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order, i) => {
                    const itemCount = order.items ? order.items.reduce((s, it) => s + it.quantity, 0) : 0;
                    const statusClass = order.status === 'delivered' ? 'delivered' : order.paid ? 'delivered' : 'pending';
                    return (
                      <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => setActiveOrder(order)}>
                        <td>#{i + 1}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{order.invoiceNumber}</td>
                        <td>{itemCount} item{itemCount !== 1 ? 's' : ''}</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(order.total)}</td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td><span className={`status-${order.paid ? 'delivered' : 'pending'}`}>{order.paid ? 'Paid' : 'Unpaid'}</span></td>
                        <td><span className={`status-${statusClass}`} style={{ textTransform: 'capitalize' }}>{order.status}</span></td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {!order.paid ? (
                            <Link to={`/pay-offline?orderId=${order.id}`} className="btn-secondary btn-sm btn-inline" style={{ padding: '5px 10px' }}>Pay Now</Link>
                          ) : (
                            <button onClick={() => setActiveOrder(order)} className="btn-outline btn-sm btn-inline" style={{ padding: '5px 10px' }}>View</button>
                          )}
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
      </div>

      {activeOrder && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveOrder(null); }}
        >
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', maxWidth: 560, width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Order Details</h3>
              <button onClick={() => setActiveOrder(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--muted)', cursor: 'pointer' }}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Invoice Number</span>
                  <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>{activeOrder.invoiceNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Date</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{formatDate(activeOrder.createdAt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Payment Status</span>
                  <span className={`status-${activeOrder.paid ? 'delivered' : 'pending'}`}>{activeOrder.paid ? 'Paid' : 'Unpaid'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Order Status</span>
                  <span className={`status-${activeOrder.status === 'delivered' ? 'delivered' : 'pending'}`} style={{ textTransform: 'capitalize' }}>{activeOrder.status}</span>
                </div>
              </div>

              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>Items</h4>
              {activeOrder.items.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.quantity} &times; {formatPrice(item.price)} &middot; Sold by {item.sellerName}</div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(item.price * item.quantity)}</div>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '2px solid var(--border-mid)' }}>
                <span style={{ fontSize: 15, fontWeight: 800 }}>Total</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--primary)' }}>{formatPrice(activeOrder.total)}</span>
              </div>

              {!activeOrder.paid ? (
                <Link to={`/pay-offline?orderId=${activeOrder.id}`} className="btn-primary w-100" style={{ marginTop: 20 }}>
                  <i className="fa-solid fa-credit-card"></i> Complete Payment
                </Link>
              ) : (
                <div style={{ marginTop: 20, padding: 14, background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                  <i className="fa-solid fa-circle-check"></i> Payment confirmed on {formatDate(activeOrder.paymentDate || activeOrder.updatedAt)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
