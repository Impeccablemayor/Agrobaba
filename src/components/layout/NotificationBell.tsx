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
  order_status: 'fa-truck',
  verification: 'fa-user-check',
  listing_match: 'fa-tag',
  demand_match: 'fa-bullseye',
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
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
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
    <div ref={wrapperRef} className="notification-bell-wrapper">
      <button
        type="button"
        className="nav-action-icon"
        title="Notifications"
        aria-label="Notifications"
        onClick={toggleOpen}
      >
        <i className="fa-regular fa-bell"></i>
        {unreadCount > 0 && <span className="nav-counter-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <strong style={{ fontSize: 13 }}>Notifications</strong>
            {notifications.some((n) => !n.read) && (
              <button onClick={handleMarkAllRead} className="notification-mark-all-btn">
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div className="notification-dropdown-empty">Loading…</div>
          ) : notifications.length === 0 ? (
            <div className="notification-dropdown-empty">
              <i className="fa-regular fa-bell-slash" style={{ fontSize: 24, marginBottom: 8, display: 'block' }}></i>
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`notification-dropdown-item ${n.read ? 'is-read' : 'is-unread'}`}
              >
                <div className="notification-item-icon-box">
                  <i className={`fa-solid ${TYPE_ICONS[n.type] || TYPE_ICONS.default}`}></i>
                </div>
                <div className="notification-item-text">
                  <div className={`notification-item-title ${n.read ? 'read' : 'unread'}`}>{n.title}</div>
                  <div className="notification-item-body">
                    {n.body}
                  </div>
                  <div className="notification-item-time">{timeAgo(n.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
