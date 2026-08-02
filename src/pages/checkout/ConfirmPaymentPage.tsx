import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPayment, getOrderById } from '../../lib/orders';
import { showToast } from '../../lib/toastBus';

export default function ConfirmPaymentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId') || '';

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [transactionNumber, setTransactionNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState('');

  useEffect(() => {
    let active = true;
    if (!orderId) return undefined;
    void getOrderById(orderId).then((data) => {
      if (!active || !data) return;
      setInvoiceNumber(data.invoiceNumber);
      setAmount(String(data.total));
    });
    return () => { active = false; };
  }, [orderId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!orderId) {
      showToast('Missing order reference. Please start again from your order.', 'error');
      return;
    }
    const success = await confirmPayment(orderId, {
      paymentMode, paymentDate, transactionNumber, amount: Number(amount),
    });
    if (success) {
      navigate('/account/my-orders');
    }
  }

  return (
    <div className="section">
      <div className="container">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/account/my-orders">My Orders</Link></li>
            <li className="breadcrumb-item active">Confirm Payment</li>
          </ol>
        </nav>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Confirm Your Payment</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>Submit your transfer details so the seller can verify and release your order.</p>
        </div>

        <form onSubmit={handleSubmit} className="form-card">
          <h3><i className="fa-solid fa-receipt"></i> Payment Details</h3>
          <p className="sub">Fill in the details exactly as they appear on your bank transfer receipt.</p>

          <div className="escrow-hint">
            <i className="fa-solid fa-shield-halved"></i>
            <span>Funds are held in mock escrow until you confirm delivery. This keeps both buyer and seller protected.</span>
          </div>

          <div className="field">
            <label>Invoice / Order Number <span className="req">*</span></label>
            <input type="text" required placeholder="e.g. AGB-000123" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
          </div>

          <div className="field">
            <label>Amount Paid (₦) <span className="req">*</span></label>
            <input type="number" required min="0" step="0.01" placeholder="e.g. 25000" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="field">
            <label>Payment Mode <span className="req">*</span></label>
            <select required value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              <option value="">Select payment mode</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="USSD Transfer">USSD Transfer</option>
              <option value="Cash Deposit">Cash Deposit</option>
              <option value="Mobile Money">Mobile Money</option>
            </select>
          </div>

          <div className="field">
            <label>Transaction Reference <span className="req">*</span></label>
            <input type="text" required placeholder="Reference / session ID from your bank" value={transactionNumber} onChange={(e) => setTransactionNumber(e.target.value)} />
          </div>

          <div className="field">
            <label>Payment Date <span className="req">*</span></label>
            <input type="date" required value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>

          <button type="submit" className="btn-primary btn-inline" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
            <i className="fa-solid fa-paper-plane"></i> Submit Payment Confirmation
          </button>
        </form>
      </div>
    </div>
  );
}
