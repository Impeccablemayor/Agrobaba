import { useState } from 'react';
import { formatPrice } from '../lib/format';
import { shortDateTime } from '../lib/fulfilmentRules';
import {
  addDisputeMessage, isOpenDispute, OUTCOME_LABELS, REASON_LABELS, statusLabel, type Dispute, type DisputeMessage, type DisputeRole,
} from '../lib/disputes';
import { EvidenceList, EvidencePicker } from './EvidencePicker';

const AUTHOR: Record<DisputeMessage['authorRole'], Record<DisputeRole, string>> = {
  BUYER: { buyer: 'You', seller: 'Buyer', admin: 'Buyer' },
  SELLER: { buyer: 'Seller', seller: 'You', admin: 'Seller' },
  ADMIN: { buyer: 'AgroBaba', seller: 'AgroBaba', admin: 'AgroBaba (admin)' },
  SYSTEM: { buyer: 'AgroBaba', seller: 'AgroBaba', admin: 'System' },
};

const TONE: Record<Dispute['status'], string> = {
  AWAITING_SELLER: 'chip-pending', UNDER_REVIEW: 'chip-pending', RESOLVED: 'chip-success', WITHDRAWN: 'chip-neutral',
};

/** Summary of a dispute for the given side. */
export function DisputeSummary({ d, role }: { d: Dispute; role: DisputeRole }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Dispute #{d.id} · {REASON_LABELS[d.reason]}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Order <span style={{ fontFamily: 'monospace' }}>{d.vendorOrderNumber}</span>
            {role !== 'seller' && d.sellerName ? <> · {d.sellerName}</> : null} · opened {shortDateTime(d.createdAt)}
          </div>
        </div>
        <span className={`chip ${TONE[d.status]}`}>{statusLabel(d.status, role)}</span>
      </div>
      {d.status === 'AWAITING_SELLER' && d.sellerResponseDueAt && (
        <p style={{ fontSize: 12, margin: 0, color: role === 'seller' ? 'var(--danger)' : 'var(--text-secondary)' }}>
          {role === 'seller'
            ? `Please respond by ${shortDateTime(d.sellerResponseDueAt)} with your side and any evidence. After that AgroBaba decides without it.`
            : `The seller has until ${shortDateTime(d.sellerResponseDueAt)} to respond. After that AgroBaba decides.`}
        </p>
      )}
      {d.status === 'UNDER_REVIEW' && (
        <p style={{ fontSize: 12, margin: 0, color: 'var(--text-secondary)' }}>
          {role === 'admin' ? 'Ready for a decision.' : 'AgroBaba is reviewing both sides. You can still add information below.'}
        </p>
      )}
      {isOpenDispute(d.status) && role === 'seller' && (
        <p style={{ fontSize: 12, margin: 0, color: 'var(--text-secondary)' }}>Your payment for this order is on hold until the dispute is decided.</p>
      )}
      {d.status === 'RESOLVED' && d.outcome && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
          <strong>Decision: {OUTCOME_LABELS[d.outcome]}</strong>
          {d.refundAmount != null && <> · {formatPrice(d.refundAmount)} refunded{role === 'buyer' ? ' to your payment method' : ''}</>}
          {d.resolutionNote && <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{d.resolutionNote}</div>}
        </div>
      )}
    </div>
  );
}

/** The conversation, and a reply box while the dispute is open. */
export function DisputeThread({ d, role, onUpdated }: { d: Dispute; role: DisputeRole; onUpdated: (d: Dispute) => void }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    const r = await addDisputeMessage(d.id, text.trim(), files);
    setBusy(false);
    if (r) { setText(''); setFiles([]); onUpdated(r); }
  }

  const prompt = role === 'seller' && d.status === 'AWAITING_SELLER'
    ? 'Your response (what happened, and what you can offer)'
    : 'Add information';

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        {d.messages.map((m) => {
          const mine = (m.authorRole === 'BUYER' && role === 'buyer') || (m.authorRole === 'SELLER' && role === 'seller')
            || (m.authorRole === 'ADMIN' && role === 'admin');
          const system = m.authorRole === 'SYSTEM';
          return (
            <li key={m.id} style={{
              border: '1px solid var(--border-light)', borderRadius: 8, padding: '8px 10px',
              background: system ? 'transparent' : mine ? 'var(--primary-subtle)' : 'var(--surface)',
              fontStyle: system ? 'italic' : undefined,
            }}>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>
                <strong style={{ color: 'var(--text-secondary)' }}>{AUTHOR[m.authorRole][role]}</strong> · {shortDateTime(m.createdAt)}
              </div>
              <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.message}</div>
              <EvidenceList files={m.attachments} />
            </li>
          );
        })}
      </ol>
      {isOpenDispute(d.status) && (
        <div style={{ display: 'grid', gap: 6 }}>
          <label htmlFor={`reply-${d.id}`} style={{ fontSize: 12, fontWeight: 700 }}>{prompt}</label>
          <textarea id={`reply-${d.id}`} rows={3} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
          {role !== 'admin' && <small style={{ color: 'var(--muted)', fontSize: 11 }}>Phone numbers and emails are removed - keep the conversation here so AgroBaba can help.</small>}
          <EvidencePicker files={files} onChange={setFiles} disabled={busy} />
          <div>
            <button className="btn-primary btn-sm btn-inline" disabled={busy || !text.trim()} onClick={() => void send()}>
              {busy ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
