import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getUnreadCount } from '../lib/messages';

interface MessagesContextValue {
  unreadCount: number;
  refresh: () => void;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const count = await getUnreadCount();
      if (active) setUnreadCount(count);
    })();
    return () => { active = false; };
  }, []);

  async function refresh(): Promise<void> {
    const count = await getUnreadCount();
    setUnreadCount(count);
  }

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
