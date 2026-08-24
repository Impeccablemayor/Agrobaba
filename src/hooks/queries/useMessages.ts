import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getConversation, getMyConversations, getUnreadCount } from '../../lib/messages';

export function useMyConversations() {
  return useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: () => getMyConversations(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useConversation(partnerId?: string) {
  return useQuery({
    queryKey: ['messages', 'conversation', partnerId],
    queryFn: () => (partnerId ? getConversation(partnerId) : Promise.resolve([])),
    enabled: Boolean(partnerId),
    staleTime: 10 * 1000,
    refetchInterval: 10 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useUnreadMessagesCount(enabled = true) {
  return useQuery({
    queryKey: ['messages', 'unreadCount'],
    queryFn: () => getUnreadCount(),
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}
