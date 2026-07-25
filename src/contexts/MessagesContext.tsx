import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getUnreadCount } from '../lib/messages';
import { useAuth } from './AuthContext';

interface MessagesContextValue {
  unreadCount: number;
  refresh: () => void;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    if (!user) {
      setUnreadCount(0);
      return undefined;
    }
    async function fetchCount() {
      const count = await getUnreadCount();
      if (active) setUnreadCount(count);
    }

    void fetchCount();
    const interval = setInterval(fetchCount, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [user?.id]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!user) return;
    const count = await getUnreadCount();
    setUnreadCount(count);
  }, [user?.id]);

  return (
    <MessagesContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessagesBadge(): MessagesContextValue {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error('useMessagesBadge must be used within MessagesProvider');
  return ctx;
}
