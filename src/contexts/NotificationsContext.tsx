import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getUnreadNotificationCount } from '../lib/notifications';
import { useAuth } from './AuthContext';

interface NotificationsContextValue {
  unreadCount: number;
  refresh: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/** Badge polls run at a relaxed cadence while the tab is visible and pause entirely while it is
 *  hidden (no user can see the badge then), refreshing immediately when the tab becomes visible
 *  again - same badge freshness in practice, ~90% fewer requests than unconditional 5s polling. */
const VISIBLE_POLL_MS = 10000;

function useUnreadBadgePoll(fetchCountFn: () => Promise<number>) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return undefined;
    }

    let active = true;
    let interval: number | undefined;

    async function fetchCount() {
      const count = await fetchCountFn();
      if (active) setUnreadCount(count);
    }

    function startPolling() {
      if (interval !== undefined || document.visibilityState === 'hidden') return;
      void fetchCount();
      interval = window.setInterval(() => {
        if (document.visibilityState === 'visible') void fetchCount();
      }, VISIBLE_POLL_MS);
    }

    function stopPolling() {
      if (interval !== undefined) {
        clearInterval(interval);
        interval = undefined;
      }
    }

    // Catch up the moment the tab comes back instead of waiting for the next tick.
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        stopPolling();
        startPolling();
      } else {
        stopPolling();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      active = false;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, fetchCountFn]);

  return [unreadCount, setUnreadCount] as const;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useUnreadBadgePoll(getUnreadNotificationCount);

  const refresh = useCallback(async (): Promise<void> => {
    if (!user) return;
    const count = await getUnreadNotificationCount();
    setUnreadCount(count);
  }, [user?.id]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsBadge(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotificationsBadge must be used within NotificationsProvider');
  return ctx;
}
