import { showToast } from './toastBus';
import { api } from './api';
import { getCurrentUser } from './auth';
import type { Conversation, Message } from '../types';

export interface SendMessageInput {
  receiverId: string;
  receiverName: string;
  content: string;
  productId?: string | null;
  productName?: string | null;
  demandId?: string | null;
  demandTitle?: string | null;
}

interface ApiMessage {
  id: number;
  senderId: number;
  receiverId: number;
  senderName: string;
  receiverName: string;
  content: string;
  productId: number | null;
  productName: string | null;
  demandId: number | null;
  demandTitle: string | null;
  read: boolean;
  createdAt: string;
}

function mapMessage(m: ApiMessage): Message {
  return {
    id: String(m.id),
    senderId: String(m.senderId),
    senderName: m.senderName,
    receiverId: String(m.receiverId),
    receiverName: m.receiverName,
    content: m.content,
    productId: m.productId != null ? String(m.productId) : null,
    productName: m.productName,
    demandId: m.demandId != null ? String(m.demandId) : null,
    demandTitle: m.demandTitle,
    read: m.read,
    createdAt: m.createdAt,
  };
}

export async function sendMessage(data: SendMessageInput): Promise<Message | false> {
  try {
    const message = await api.post<ApiMessage>('/api/messages', {
      receiverId: Number(data.receiverId),
      receiverName: data.receiverName,
      content: data.content,
      productId: data.productId ? Number(data.productId) : null,
      productName: data.productName || null,
      demandId: data.demandId ? Number(data.demandId) : null,
      demandTitle: data.demandTitle || null,
    });
    return mapMessage(message);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send message';
    showToast(message, 'error');
    return false;
  }
}

export async function getMyConversations(): Promise<Conversation[]> {
  const user = getCurrentUser();
  if (!user) return [];

  try {
    const messages = (await api.get<ApiMessage[]>('/api/messages/me')).map(mapMessage);

    const convMap: Record<string, Conversation> = {};
    messages.forEach((m) => {
      const partnerId = m.senderId === user.id ? m.receiverId : m.senderId;
      const partnerName = m.senderId === user.id ? m.receiverName : m.senderName;

      if (!convMap[partnerId]) {
        convMap[partnerId] = { partnerId, partnerName, messages: [], unread: 0, lastMessage: m };
      }
      convMap[partnerId].messages.push(m);
      if (m.receiverId === user.id && !m.read) {
        convMap[partnerId].unread++;
      }
    });

    return Object.values(convMap)
      .map((conv) => {
        conv.messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        conv.lastMessage = conv.messages[conv.messages.length - 1];
        return conv;
      })
      .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load conversations';
    showToast(message, 'error');
    return [];
  }
}

export async function getConversation(partnerId: string): Promise<Message[]> {
  try {
    return (await api.get<ApiMessage[]>(`/api/messages/conversation/${partnerId}`)).map(mapMessage);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load conversation';
    showToast(message, 'error');
    return [];
  }
}

export async function markAsRead(partnerId: string): Promise<void> {
  try {
    await api.put(`/api/messages/read/${partnerId}`);
  } catch {
    // best-effort; a failed read-receipt shouldn't block viewing the conversation
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    return await api.get<number>('/api/messages/unread');
  } catch {
    return 0;
  }
}
