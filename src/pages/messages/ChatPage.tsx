import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getConversation, markAsRead, sendMessage } from '../../lib/messages';
import { getBookingById } from '../../lib/bookings';
import type { Message, ServiceBooking } from '../../types';
import { useMessagesBadge } from '../../contexts/MessagesContext';
import { useAuth } from '../../contexts/AuthContext';
import { timeAgo } from '../../lib/format';
import { BookingSummaryCard } from '../../components/BookingSummaryCard';

export default function ChatPage() {
  const { partnerId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { refresh: refreshUnread } = useMessagesBadge();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const partnerName = searchParams.get('partnerName') || 'User';
  const productId = searchParams.get('productId');
  const productName = searchParams.get('productName') || '';
  const bookingId = searchParams.get('bookingId');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(productName ? `Hi! I'm interested in your listing: "${productName}". Is it still available?` : '');
  const [booking, setBooking] = useState<ServiceBooking | null>(null);

  useEffect(() => {
    let active = true;
    if (!bookingId) { setBooking(null); return undefined; }
    async function loadBooking() {
      const data = await getBookingById(bookingId!);
      if (active) setBooking(data);
    }
    void loadBooking();
    const interval = setInterval(loadBooking, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [bookingId]);

  useEffect(() => {
    let active = true;
    if (!partnerId) return undefined;

    async function loadConversation() {
      const conversation = await getConversation(partnerId!);
      if (!active) return;
      setMessages((prev) => {
        const lastId = conversation.length > 0 ? conversation[conversation.length - 1].id : null;
        const prevLastId = prev.length > 0 ? prev[prev.length - 1].id : null;
        return lastId === prevLastId && prev.length === conversation.length ? prev : conversation;
      });
      await markAsRead(partnerId!);
      await refreshUnread();
    }

    void loadConversation();
    const interval = setInterval(loadConversation, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [partnerId, refreshUnread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  if (!partnerId) return null;

  async function handleSend() {
    const content = input.trim();
    if (!content) return;

    const sent = await sendMessage({
      receiverId: partnerId!,
      receiverName: partnerName,
      content,
      productId: productId || null,
      productName: productName || null,
    });

    if (sent) {
      setInput('');
      const conversation = await getConversation(partnerId!);
      setMessages(conversation);
      await refreshUnread();
    }
  }

  return (
    <div className="section">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/account">My Account</Link></li>
            <li className="breadcrumb-item"><Link to="/messages">Messages</Link></li>
            <li className="breadcrumb-item active">Chat</li>
          </ol>
        </nav>

        <div className="chat-window">
          <div className="chat-header">
            <Link to="/messages" className="back-link" aria-label="Back to messages"><i className="fa-solid fa-arrow-left"></i></Link>
            <span className="chat-avatar">{(partnerName.charAt(0) || '?').toUpperCase()}</span>
            <span>{partnerName}</span>
          </div>

          {booking && (
            <BookingSummaryCard booking={booking} currentUserId={user?.id || ''} onUpdated={setBooking} />
          )}

          {!booking && productName && (
            <div className="chat-context">
              <i className="fa-solid fa-tag"></i>
              <span>Regarding: <strong>{productName}</strong></span>
            </div>
          )}

          <div className="chat-messages">
            {messages.length === 0 ? (
              <p className="text-muted text-center" style={{ padding: 24 }}>No messages yet. Say hello!</p>
            ) : (
              messages.map((m) => {
                const isSent = m.senderId === user?.id;
                const buyerClass = isSent && user?.role === 'buyer' ? ' buyer' : '';
                return (
                  <div key={m.id} className={`chat-bubble ${isSent ? 'sent' : 'received'}${buyerClass}`}>
                    {m.content}
                    <span className="bubble-time">{timeAgo(m.createdAt)}</span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef}></div>
          </div>

          <div className="chat-input">
            <input
              type="text" placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button onClick={handleSend} aria-label="Send">
              <i className="fa-solid fa-paper-plane"></i> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
