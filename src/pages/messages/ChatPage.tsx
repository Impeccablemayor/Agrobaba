import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getConversation, markAsRead, sendMessage } from '../../lib/messages';
import type { Message } from '../../types';
import { useMessagesBadge } from '../../contexts/MessagesContext';
import { useAuth } from '../../contexts/AuthContext';
import { timeAgo } from '../../lib/format';

export default function ChatPage() {
  const { partnerId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { refresh: refreshUnread } = useMessagesBadge();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const partnerName = searchParams.get('partnerName') || 'User';
  const productId = searchParams.get('productId');
  const productName = searchParams.get('productName') || '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(productName ? `Hi! I'm interested in your listing: "${productName}". Is it still available?` : '');

  useEffect(() => {
    let active = true;
    if (!partnerId) return undefined;

    (async () => {
      const conversation = await getConversation(partnerId);
      if (active) setMessages(conversation);
      await markAsRead(partnerId);
      await refreshUnread();
    })();

    return () => { active = false; };
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

          {productName && (
            <div className="chat-context">
              <i className="fa-solid fa-tag"></i>
              <span>Regarding: <strong>{productName}</strong></span>
            </div>
          )}

          <div className="chat-messages">
            {messages.length === 0 ? (
              <p className="text-muted text-center" style={{ padding: 24 }}>No messages yet. Say hello!</p>
            ) : (
              messages.map((m) => (
                <div key={m.id}>
                  <div className={`chat-bubble ${m.senderId === user?.id ? 'sent' : 'received'}`}>
                    {m.content}
                    <span className="bubble-time">{timeAgo(m.createdAt)}</span>
                  </div>
                </div>
              ))
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
