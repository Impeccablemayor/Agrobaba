import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getMySales, updateOrderStatus } from '../../lib/orders';
import { formatDate, formatPrice } from '../../lib/format';

import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import type { Order, OrderStatus } from '../../types';

type Filter = 'all' | 'unpaid' | 'paid' | 'processing';

export default function MySalesPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');

  const [sales, setSales] = useState<Awaited<ReturnType<typeof getMySales>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSales() {
      if (!user) return;
      setLoading(true);
      const data = await getMySales();
      if (active) {
        setSales(data);
        setLoading(false);
      }
    }

    void loadSales();
    return () => { active = false; };
  }, [user]);

  if (!user) return null;

  if (user.role === 'buyer') {
    return (
      <div className="section">
        <div className="container">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><Link to="/">Home</Link></li>
              <li className="breadcrumb-item"><Link to="/account">My Account</Link></li>
              <li className="breadcrumb-item active">My Sales</li>
            </ol>
          </nav>
          <div className="empty-cart">
            <i className="fa-solid fa-coins"></i>
            <p>As a buyer, you don't have sales. Check your orders instead.</p>
            <Link to="/account/my-orders" className="btn-primary btn-inline btn-sm">
              <i className="fa-solid fa-box"></i> View My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isServiceProvider = user.role === 'service-provider';
  const title = isServiceProvider ? 'My Earnings' : 'My Sales';
  const subtitle = isServiceProvider ? 'Track bookings and earnings from your services.' : 'Manage orders customers have placed for your listings.';

  function getMyEarnings(order: Order) {
    return order.items.filter((it) => it.sellerId === user!.id).reduce((s, it) => s + it.price * it.quantity, 0);
  }

  const paidSales = sales.filter((o) => o.paid);
  const totalEarnings = paidSales.reduce((s, o) => s + getMyEarnings(o), 0);
  const pending = sales.filter((o) => !o.paid).length;
  const toFulfill = sales.filter((o) => o.paid && o.status !== 'delivered').length;

  const stats = [
    { icon: 'fa-cart-shopping', label: 'Total Sales', value: sales.length, color: 'var(--primary)' },
    { icon: 'fa-naira-sign', label: 'Earnings', value: formatPrice(totalEarnings), color: 'var(--success)' },
    { icon: 'fa-clock', label: 'Awaiting Pay', value: pending, color: 'var(--accent)' },
    { icon: 'fa-truck', label: 'To Fulfill', value: toFulfill, color: 'var(--danger)' },
  ];

  let filtered = sales;
  if (filter === 'unpaid') filtered = sales.filter((o) => !o.paid);
  else if (filter === 'paid') filtered = sales.filter((o) => o.paid);
  else if (filter === 'processing') filtered = sales.filter((o) => o.paid && o.status !== 'delivered');

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    const ok = await updateOrderStatus(orderId, status);
    if (ok) {
      setSales((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
    }
  }

  return (
    <div className="section">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/account">My Account</Link></li>
            <li className="breadcrumb-item active">{title}</li>
          </ol>
        </nav>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>{title}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>{subtitle}</p>
        </div>

        {loading ? (
          <PageLoadingSpinner message="Loading your sales…" />
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
            {(['all', 'unpaid', 'paid', 'processing'] as const).map((f) => (
              <button key={f} className={`shop-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All Sales' : f === 'unpaid' ? 'Awaiting Payment' : f === 'paid' ? 'Paid' : 'To Fulfill'}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-cart">
              <i className="fa-solid fa-coins"></i>
              <p>{filter === 'all' ? "No sales yet. Once buyers order your listings, they'll appear here." : `No ${filter} sales found.`}</p>
              {filter === 'all' && (
                <Link to="/account/post-listing" className="btn-primary btn-inline btn-sm">
                  <i className="fa-solid fa-plus"></i> Post a Listing
                </Link>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>#</th><th>Buyer</th><th>Invoice</th><th>Your Earnings</th><th>Date</th><th>Payment</th><th>Fulfillment</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((order, i) => (
                    <tr key={order.id}>
                      <td>#{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{order.buyerName}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{order.buyerPhone || ''}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{order.invoiceNumber}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatPrice(getMyEarnings(order))}</td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td><span className={`status-${order.paid ? 'delivered' : 'pending'}`}>{order.paid ? 'Paid' : 'Unpaid'}</span></td>
                      <td>
                        {order.paid ? (
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                            style={{ border: '1.5px solid var(--border-mid)', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
                          >
                            <option value="confirmed">Confirmed</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                          </select>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Awaiting payment</span>
                        )}
                      </td>
                    </tr>
                  ))}
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
