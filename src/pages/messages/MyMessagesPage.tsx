import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyConversations } from '../../lib/messages';
import { timeAgo } from '../../lib/format';
import type { Conversation } from '../../types';

export default function MyMessagesPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await getMyConversations();
      if (active) setConversations(data);
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="section">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/account">My Account</Link></li>
            <li className="breadcrumb-item active">Messages</li>
          </ol>
        </nav>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Messages</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>All your conversations with buyers and sellers in one place.</p>
        </div>

        {conversations.length === 0 ? (
          <div className="empty-cart">
            <i className="fa-regular fa-comments"></i>
            <p>No messages yet. Start a conversation by contacting a seller or responding to a demand.</p>
            <Link to="/shop" className="btn-primary btn-inline btn-sm">
              <i className="fa-solid fa-store"></i> Browse Shop
            </Link>
          </div>
        ) : (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {conversations.map((conv) => {
              const initial = conv.partnerName.charAt(0).toUpperCase();
              const lastMsg = conv.lastMessage.content.length > 60
                ? conv.lastMessage.content.substring(0, 60) + '...'
                : conv.lastMessage.content;
              return (
                <div
                  key={conv.partnerId}
                  className="conversation-item"
                  style={{ display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--border)' }}
                  onClick={() => navigate(`/messages/${conv.partnerId}?partnerName=${encodeURIComponent(conv.partnerName)}`)}
                >
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800, color: 'var(--primary)', fontSize: 18 }}>
                    {initial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span className="name">
                        {conv.partnerName}{' '}
                        {conv.unread > 0 && (
                          <span className="nav-badge" style={{ position: 'static', display: 'inline-flex', marginLeft: 4 }}>{conv.unread}</span>
                        )}
                      </span>
                      <span className="time">{timeAgo(conv.lastMessage.createdAt)}</span>
                    </div>
                    <div className="preview" style={conv.unread > 0 ? { fontWeight: 600, color: 'var(--text)' } : undefined}>{lastMsg}</div>
                  </div>
                  <i className="fa-solid fa-chevron-right" style={{ color: 'var(--muted)', fontSize: 12 }}></i>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
