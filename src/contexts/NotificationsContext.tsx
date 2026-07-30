import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getUnreadNotificationCount } from '../lib/notifications';
import { useAuth } from './AuthContext';

interface NotificationsContextValue {
  unreadCount: number;
  refresh: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    if (!user) {
      setUnreadCount(0);
      return undefined;
    }
    async function fetchCount() {
      const count = await getUnreadNotificationCount();
      if (active) setUnreadCount(count);
    }

    void fetchCount();
    const interval = setInterval(fetchCount, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [user?.id]);

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
