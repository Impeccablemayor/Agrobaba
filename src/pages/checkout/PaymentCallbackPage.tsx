import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyPayment, type PaymentVerifyResponse } from '../../lib/payments';
import { formatPrice } from '../../lib/format';

type Phase = 'loading' | 'success' | 'processing' | 'failed' | 'no-reference';

function statusLabel(raw: string | null | undefined): string {
  switch (raw) {
    case 'SUCCESS':
      return 'Payment confirmed';
    case 'FAILED':
      return 'Payment failed';
    case 'ABANDONED':
      return 'Payment abandoned';
    case 'PENDING':
    case 'INITIATED':
      return 'Payment still processing';
    default:
      return raw || 'Checking…';
  }
}

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const [phase, setPhase] = useState<Phase>(reference ? 'loading' : 'no-reference');
  const [data, setData] = useState<PaymentVerifyResponse | null>(null);

  useEffect(() => {
    if (!reference) return;
    let cancelled = false;

    async function run() {
      // Give Paystack a short grace period before the first verify call — the redirect
      // sometimes arrives before the webhook has a chance to settle.
      await new Promise((r) => setTimeout(r, 1200));
      const result = await verifyPayment(reference!);
      if (cancelled) return;
      if (!result) {
        // Gateway unreachable — not a payment failure, just a transient issue.
        setPhase('processing');
        return;
      }
      setData(result);
      const status = (result.status || '').toUpperCase();
      if (status === 'SUCCESS') setPhase('success');
      else if (status === 'FAILED' || status === 'ABANDONED') setPhase('failed');
      else setPhase('processing');
    }

    run();
    return () => { cancelled = true; };
  }, [reference]);

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 520, margin: '0 auto' }}>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item active">Payment</li>
          </ol>
        </nav>

        <div style={{
          padding: 32,
          borderRadius: 'var(--radius, 8px)',
          border: '1px solid var(--border, #e5e7eb)',
          background: 'var(--bg, #fff)',
          textAlign: 'center',
        }}>

          {/* Loading */}
          {phase === 'loading' && (
            <>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, color: 'var(--primary)', marginBottom: 16 }}></i>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Confirming your payment…</h2>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Please wait while we verify your transaction with Paystack.</p>
            </>
          )}

          {/* Success */}
          {phase === 'success' && (
            <>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: 'var(--success-soft, #dcfce7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <i className="fa-solid fa-circle-check" style={{ fontSize: 32, color: 'var(--success, #16a34a)' }}></i>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Payment successful</h2>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
                {data?.amountNaira != null ? `You paid ${formatPrice(data.amountNaira)}` : 'Your payment was confirmed'}.
                {data?.orderStatus && <> Order status: <strong style={{ textTransform: 'capitalize' }}>{data.orderStatus}</strong>.</>}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/account/my-orders" className="btn-primary btn-inline btn-sm">
                  <i className="fa-solid fa-box"></i> View My Orders
                </Link>
                <Link to="/shop" className="btn-outline btn-inline btn-sm">
                  <i className="fa-solid fa-store"></i> Continue Shopping
                </Link>
              </div>
            </>
          )}

          {/* Still processing */}
          {phase === 'processing' && (
            <>
              <i className="fa-solid fa-hourglass-half" style={{ fontSize: 32, color: 'var(--accent, #d97706)', marginBottom: 16 }}></i>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{statusLabel(data?.status)}</h2>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
                {data?.message || 'Your payment is being processed by Paystack. This may take a few seconds.'}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/account/my-orders" className="btn-primary btn-inline btn-sm">
                  <i className="fa-solid fa-arrow-rotate-right"></i> Check My Orders
                </Link>
                <Link to="/" className="btn-outline btn-inline btn-sm">
                  <i className="fa-solid fa-house"></i> Back Home
                </Link>
              </div>
            </>
          )}

          {/* Failed / Abandoned */}
          {phase === 'failed' && (
            <>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: 'var(--danger-soft, #fee2e2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <i className="fa-solid fa-circle-xmark" style={{ fontSize: 32, color: 'var(--danger, #dc2626)' }}></i>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{statusLabel(data?.status)}</h2>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
                {data?.message || 'This payment was not completed. You can retry payment from your order.'}
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/account/my-orders" className="btn-primary btn-inline btn-sm">
                  <i className="fa-solid fa-arrow-right"></i> View Order &amp; Retry
                </Link>
                <Link to="/" className="btn-outline btn-inline btn-sm">
                  <i className="fa-solid fa-house"></i> Back Home
                </Link>
              </div>
            </>
          )}

          {/* No reference at all */}
          {phase === 'no-reference' && (
            <>
              <i className="fa-solid fa-circle-question" style={{ fontSize: 32, color: 'var(--muted, #9ca3af)', marginBottom: 16 }}></i>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>No payment reference found</h2>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
                We could not identify the payment you are looking for. If you just completed
                a checkout, check your email from Paystack or view your order status below.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/account/my-orders" className="btn-primary btn-inline btn-sm">
                  <i className="fa-solid fa-box"></i> My Orders
                </Link>
                <Link to="/" className="btn-outline btn-inline btn-sm">
                  <i className="fa-solid fa-house"></i> Back Home
                </Link>
              </div>
            </>
          )}

          {reference && (
            <p style={{ marginTop: 16, fontSize: 11, color: 'var(--muted)' }}>
              Reference: <code style={{ fontSize: 11 }}>{reference}</code>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
