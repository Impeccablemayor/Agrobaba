import { KEYS, getStore, setStore } from './storage';
import { uid } from './format';
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

export function sendMessage(data: SendMessageInput): Message | false {
  const user = getCurrentUser();
  if (!user) return false;

  const messages = getStore<Message>(KEYS.messages);

  const message: Message = {
    id: uid(),
    senderId: user.id,
    senderName: user.name,
    receiverId: data.receiverId,
    receiverName: data.receiverName,
    content: data.content,
    productId: data.productId || null,
    productName: data.productName || null,
    demandId: data.demandId || null,
    demandTitle: data.demandTitle || null,
    read: false,
    createdAt: new Date().toISOString(),
  };

  messages.push(message);
  setStore(KEYS.messages, messages);
  return message;
}

export function getMyConversations(): Conversation[] {
  const user = getCurrentUser();
  if (!user) return [];

  const messages = getStore<Message>(KEYS.messages);
  const mine = messages.filter((m) => m.senderId === user.id || m.receiverId === user.id);

  const convMap: Record<string, Conversation> = {};
  mine.forEach((m) => {
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
}

export function getConversation(partnerId: string): Message[] {
  const user = getCurrentUser();
  if (!user) return [];

  return getStore<Message>(KEYS.messages)
    .filter(
      (m) =>
        (m.senderId === user.id && m.receiverId === partnerId) ||
        (m.senderId === partnerId && m.receiverId === user.id)
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function markAsRead(partnerId: string): void {
  const user = getCurrentUser();
  if (!user) return;

  const messages = getStore<Message>(KEYS.messages);
  messages.forEach((m) => {
    if (m.senderId === partnerId && m.receiverId === user.id) {
      m.read = true;
    }
  });
  setStore(KEYS.messages, messages);
}

export function getUnreadCount(): number {
  const user = getCurrentUser();
  if (!user) return 0;
  return getStore<Message>(KEYS.messages).filter((m) => m.receiverId === user.id && !m.read).length;
}
