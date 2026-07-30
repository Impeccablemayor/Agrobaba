import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationsBadge } from '../../contexts/NotificationsContext';
import { getMyNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '../../lib/notifications';
import { timeAgo } from '../../lib/format';
import type { Notification } from '../../types';

const TYPE_ICONS: Record<string, string> = {
  message: 'fa-comment',
  demand_response: 'fa-reply',
  order_placed: 'fa-receipt',
  payment_confirmed: 'fa-circle-check',
  order_status: 'fa-truck',
  verification: 'fa-user-check',
  default: 'fa-bell',
};

export function NotificationBell() {
  const navigate = useNavigate();
  const { unreadCount, refresh } = useNotificationsBadge();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      setNotifications(await getMyNotifications());
      setLoading(false);
    }
  }

  async function handleItemClick(n: Notification) {
    if (!n.read) {
      await markNotificationAsRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      void refresh();
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  async function handleMarkAllRead() {
    await markAllNotificationsAsRead();
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    void refresh();
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button className="nav-icon-btn" title="Notifications" onClick={toggleOpen} style={{ cursor: 'pointer' }}>
        <i className="fa-regular fa-bell"></i>
        <span>Alerts</span>
        {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 340, maxHeight: 420, overflowY: 'auto',
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', zIndex: 1000,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <strong style={{ fontSize: 13 }}>Notifications</strong>
            {notifications.some((n) => !n.read) && (
              <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Loading…</div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
              <i className="fa-regular fa-bell-slash" style={{ fontSize: 24, marginBottom: 8, display: 'block' }}></i>
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                style={{
                  display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: n.read ? 'transparent' : 'var(--primary-light)',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fa-solid ${TYPE_ICONS[n.type] || TYPE_ICONS.default}`} style={{ color: 'var(--primary)', fontSize: 13 }}></i>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: n.read ? 500 : 700, marginBottom: 2 }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {n.body}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
