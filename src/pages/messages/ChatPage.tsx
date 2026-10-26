import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useConversation } from '../../hooks/queries/useMessages';
import { useBooking } from '../../hooks/queries/useBookings';
import { markAsRead, sendMessage } from '../../lib/messages';
import type { Message, ServiceBooking } from '../../types';
import { useMessagesBadge } from '../../contexts/MessagesContext';
import { useAuth } from '../../contexts/AuthContext';
import { BookingSummaryCard } from '../../components/BookingSummaryCard';

const QUICK_REPLIES = [
  '👋 Hi, is this still available?',
  '💰 What is your best price?',
  '📍 Where is the pickup location?',
  '🚚 Can you arrange delivery?',
];

const EMOJIS = ['😊', '👍', '🤝', '🌾', '🚜', '📦', '💰', '🙏'];

function formatMessageTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function getDayKey(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  } catch {
    return 'unknown';
  }
}

function formatDayDivider(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return 'Today';

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return dateStr;
  }
}

export default function ChatPage() {
  const { partnerId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { refresh: refreshUnread } = useMessagesBadge();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const partnerName = searchParams.get('partnerName') || 'User';
  const productId = searchParams.get('productId');
  const productName = searchParams.get('productName') || '';
  const bookingId = searchParams.get('bookingId');

  const { data: messages = [], isLoading: loading, refetch: refetchConversation } = useConversation(partnerId);
  const { data: fetchedBooking } = useBooking(bookingId ?? undefined);

  const [booking, setBooking] = useState<ServiceBooking | null>(null);
  useEffect(() => {
    if (fetchedBooking) setBooking(fetchedBooking);
  }, [fetchedBooking]);

  const [input, setInput] = useState(
    productName ? `Hi! I'm interested in your listing: "${productName}". Is it still available?` : ''
  );
  const [sending, setSending] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [contextBannerVisible, setContextBannerVisible] = useState(true);

  const conversationContext = messages.find((m) => m.productName || m.demandTitle);
  const displayProductName = conversationContext?.productName || (messages.length === 0 ? productName : '');
  const displayProductId = conversationContext?.productId || (messages.length === 0 ? productId : null);
  const displayDemandTitle = conversationContext?.demandTitle || '';
  const displayDemandId = conversationContext?.demandId || null;

  useEffect(() => {
    if (partnerId && messages.length > 0) {
      void markAsRead(partnerId).then(() => refreshUnread());
    }
  }, [partnerId, messages.length, refreshUnread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  if (!partnerId) return null;

  async function handleSend() {
    if (sending) return;
    const content = input.trim();
    if (!content) return;

    setSending(true);
    const sent = await sendMessage({
      receiverId: partnerId!,
      receiverName: partnerName,
      content,
      productId: displayProductId || null,
      productName: displayProductName || null,
      demandId: displayDemandId || null,
      demandTitle: displayDemandTitle || null,
    });

    if (sent) {
      setInput('');
      setShowEmojis(false);
      await refetchConversation();
      await refreshUnread();
    }
    setSending(false);
  }

  function handleQuickReply(text: string) {
    setInput(text);
    inputRef.current?.focus();
  }

  function handleAddEmoji(emoji: string) {
    setInput((prev) => prev + emoji);
    inputRef.current?.focus();
  }

  // Group messages by day for date pills
  const dayGroups: { dayLabel: string; items: Message[] }[] = [];
  let currentDayKey = '';
  let currentGroup: { dayLabel: string; items: Message[] } | null = null;

  messages.forEach((m) => {
    const dayKey = getDayKey(m.createdAt);
    if (dayKey !== currentDayKey) {
      currentDayKey = dayKey;
      currentGroup = { dayLabel: formatDayDivider(m.createdAt), items: [m] };
      dayGroups.push(currentGroup);
    } else if (currentGroup) {
      currentGroup.items.push(m);
    }
  });

  return (
    <div className="section chat-page-root">
      <div className="container" style={{ maxWidth: 780, margin: '0 auto' }}>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/account">My Account</Link></li>
            <li className="breadcrumb-item"><Link to="/messages">Messages</Link></li>
            <li className="breadcrumb-item active">{partnerName}</li>
          </ol>
        </nav>

        <div className="chat-window">
          {/* WhatsApp Chat Header */}
          <div className="chat-header">
            <div className="chat-header-left">
              <Link to="/messages" className="chat-back-btn" title="Back to messages" aria-label="Back to messages">
                <i className="fa-solid fa-arrow-left"></i>
              </Link>
              <div className="chat-avatar-wrap">
                <span className="chat-avatar">
                  {(partnerName.charAt(0) || '?').toUpperCase()}
                </span>
                <span className="chat-online-dot" title="Active on AgroBaba"></span>
              </div>
              <div className="chat-header-info">
                <span className="chat-header-name">{partnerName}</span>
                <span className="chat-header-status">
                  <i className="fa-solid fa-shield-halved" style={{ fontSize: 10, color: '#00a884' }}></i>
                  Active on AgroBaba
                </span>
              </div>
            </div>

            <div className="chat-header-actions">
              {displayProductId && (
                <Link
                  to={`/shop/${displayProductId}`}
                  className="chat-header-btn"
                  title="View referenced product"
                  aria-label="View product"
                >
                  <i className="fa-solid fa-bag-shopping"></i>
                </Link>
              )}
              {displayDemandId && (
                <Link
                  to={`/demands/${displayDemandId}`}
                  className="chat-header-btn"
                  title="View referenced demand"
                  aria-label="View demand"
                >
                  <i className="fa-solid fa-clipboard-list"></i>
                </Link>
              )}
              <button
                type="button"
                className="chat-header-btn"
                onClick={() => refetchConversation()}
                title="Refresh messages"
                aria-label="Refresh conversation"
              >
                <i className={`fa-solid fa-arrow-rotate-right ${loading ? 'fa-spin' : ''}`}></i>
              </button>
            </div>
          </div>

          {/* Service Booking Card if present */}
          {booking && (
            <BookingSummaryCard booking={booking} currentUserId={user?.id || ''} onUpdated={setBooking} />
          )}

          {/* Pinned Context Banner (Regarding Product or Demand) */}
          {!booking && contextBannerVisible && (displayProductName || displayDemandTitle) && (
            <div className="chat-context-banner">
              <div className="chat-context-info">
                <div className="chat-context-icon">
                  <i className={`fa-solid ${displayDemandTitle ? 'fa-clipboard-list' : 'fa-tag'}`}></i>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#667781' }}>
                    {displayDemandTitle ? 'Inquiry on Demand' : 'Inquiry on Product'}
                  </div>
                  <div className="chat-context-title">
                    {displayDemandTitle || displayProductName}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {displayProductId && (
                  <Link to={`/shop/${displayProductId}`} className="chat-context-link">
                    View <i className="fa-solid fa-arrow-up-right-from-square"></i>
                  </Link>
                )}
                {displayDemandId && (
                  <Link to={`/demands/${displayDemandId}`} className="chat-context-link">
                    View <i className="fa-solid fa-arrow-up-right-from-square"></i>
                  </Link>
                )}
                <button
                  type="button"
                  className="chat-context-close"
                  onClick={() => setContextBannerVisible(false)}
                  title="Hide banner"
                  aria-label="Hide context banner"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>
          )}

          {/* Messages Stream */}
          <div className="chat-messages">
            {/* WhatsApp Security Notice */}
            <div className="chat-security-notice">
              <i className="fa-solid fa-lock"></i>
              <span>Messages are direct &amp; secured through your AgroBaba account.</span>
            </div>

            {loading && messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: '#667781' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 8, display: 'block', color: '#00a884' }}></i>
                <span>Loading conversation…</span>
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#667781' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: '#ffffff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                }}>
                  <i className="fa-regular fa-comments" style={{ fontSize: 26, color: '#00a884' }}></i>
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#111b21', marginBottom: 4 }}>No messages yet</h4>
                <p style={{ fontSize: 13, maxWidth: 300, margin: '0 auto' }}>
                  Send a message below or tap a quick question to start chatting with {partnerName}.
                </p>
              </div>
            ) : (
              dayGroups.map((group) => (
                <div key={group.dayLabel} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {/* WhatsApp Centered Date Pill */}
                  <div className="chat-date-pill">{group.dayLabel}</div>

                  {group.items.map((m) => {
                    const isSent = m.senderId === user?.id;
                    return (
                      <div
                        key={m.id}
                        className={`chat-bubble ${isSent ? 'sent' : 'received'}`}
                      >
                        <div className="chat-bubble-content">{m.content}</div>
                        <div className="chat-bubble-footer">
                          <span>{formatMessageTime(m.createdAt)}</span>
                          {isSent && (
                            <i
                              className={`fa-solid fa-check-double chat-check-double ${m.read ? 'read' : 'unread'}`}
                              title={m.read ? 'Read' : 'Delivered'}
                            ></i>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            <div ref={messagesEndRef}></div>
          </div>

          {/* Quick-reply suggestions */}
          <div className="chat-quick-replies">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply}
                type="button"
                className="quick-reply-chip"
                onClick={() => handleQuickReply(reply)}
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Optional Quick Emoji Bar */}
          {showEmojis && (
            <div className="chat-emoji-bar">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="chat-emoji-btn"
                  onClick={() => handleAddEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* WhatsApp Input Bar */}
          <div className="chat-input-bar">
            <button
              type="button"
              className={`chat-input-action-btn ${showEmojis ? 'active' : ''}`}
              onClick={() => setShowEmojis(!showEmojis)}
              title="Add emoji"
              aria-label="Add emoji"
            >
              <i className="fa-regular fa-face-smile"></i>
            </button>

            <div className="chat-input-field-wrap">
              <input
                ref={inputRef}
                type="text"
                className="chat-input-field"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>

            <button
              type="button"
              className="chat-send-circle-btn"
              onClick={handleSend}
              disabled={sending || !input.trim()}
              title="Send message"
              aria-label="Send message"
            >
              {sending ? (
                <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
              ) : (
                <i className="fa-solid fa-paper-plane" style={{ marginLeft: 2 }}></i>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
