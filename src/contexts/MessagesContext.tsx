import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { useUnreadMessagesCount } from '../hooks/queries/useMessages';
import { useAuth } from './AuthContext';

interface MessagesContextValue {
  unreadCount: number;
  refresh: () => void;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: unreadCount = 0, refetch } = useUnreadMessagesCount(Boolean(user));

  const refresh = useCallback(() => {
    if (user) void refetch();
  }, [user, refetch]);

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
