import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getOrderById } from '../../lib/orders';
import { formatPrice } from '../../lib/format';

export default function PayOfflinePage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') || '';
  const [copied, setCopied] = useState(false);

  const order = orderId ? getOrderById(orderId) : null;
  const total = order ? order.total : 0;

  function handleCopy() {
    const num = '9901234567';
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(num).then(done).catch(done);
    } else {
      done();
    }
  }

  return (
    <div className="section">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/cart">Cart</Link></li>
            <li className="breadcrumb-item active">Payment</li>
          </ol>
        </nav>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Complete Your Payment</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Transfer to the Agrobaba escrow account below, then confirm your payment.</p>
        </div>

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="pay-card">
              <h3><i className="fa-solid fa-building-columns"></i> Escrow Bank Transfer</h3>

              <div className="pay-amount-box">
                <div>
                  <div className="lbl">Amount to Pay</div>
                  <div className="amt">{formatPrice(total)}</div>
                </div>
                <div className="ref">Order Ref:<br /><strong>{orderId || '—'}</strong></div>
              </div>

              <div>
                <div className="bank-row">
                  <span className="k">Bank Name</span>
                  <span className="v">Providus Bank</span>
                </div>
                <div className="bank-row">
                  <span className="k">Account Name</span>
                  <span className="v">Agrobaba Escrow Ltd</span>
                </div>
                <div className="bank-row">
                  <span className="k">Account Number</span>
                  <span className="v">
                    <span>9901234567</span>
                    <button className="copy-btn" onClick={handleCopy}>
                      {copied ? <><i className="fa-solid fa-check"></i> Copied</> : <><i className="fa-regular fa-copy"></i> Copy</>}
                    </button>
                  </span>
                </div>
              </div>

              <ol className="steps">
                <li>Transfer the <strong>exact amount</strong> above to the escrow account.</li>
                <li>Use your <strong>Order Ref</strong> as the transfer narration/description.</li>
                <li>Click <strong>"I've Made the Transfer"</strong> and enter your payment details.</li>
                <li>The seller ships once escrow confirms — funds release when you confirm delivery.</li>
              </ol>

              <Link
                to={orderId ? `/confirm-payment?orderId=${encodeURIComponent(orderId)}` : '/confirm-payment'}
                className="btn-primary btn-inline"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              >
                <i className="fa-solid fa-circle-check"></i> I've Made the Transfer
              </Link>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="summary-side">
              <h3>Order Summary</h3>
              <div>
                {order?.items.map((item) => (
                  <div className="summary-line" key={item.id}>
                    <span className="nm">{item.name} <span style={{ color: 'var(--muted)' }}>&times;{item.quantity}</span></span>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="summary-total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14 }}>
                <i className="fa-solid fa-shield-halved" style={{ color: 'var(--primary)' }}></i>
                Protected by Agrobaba mock escrow.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
