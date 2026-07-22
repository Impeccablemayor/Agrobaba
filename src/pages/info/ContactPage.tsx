import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { saveTicket } from '../../lib/tickets';

const FAQS = [
  ['How does escrow payment work?', "When you place an order, your payment is held securely by Agrobaba. The seller delivers the goods. Once you confirm delivery and satisfaction, the funds are released to the seller. If there's a dispute, our team mediates."],
  ['How do I become a verified seller?', "After registering, complete your profile and contact our support team. We'll verify your identity and business details. Verified sellers get a badge and appear higher in search results."],
  ['Can anyone post a demand?', 'Yes! Any registered user can post a demand — whether you\'re a buyer, restaurant, supermarket or individual. Simply register, go to Post a Demand and describe what you need.'],
  ['Is registration free?', 'Yes! Registration is completely free for all user types — farmers, buyers, agro-dealers and service providers. We only charge a small 5% commission on completed transactions.'],
  ['What payment methods are accepted?', 'Currently we accept bank transfer (GTBank), Flutterwave, Paystack, and PayPal. More payment options coming soon.'],
];

export default function ContactPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General Inquiry');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ticket = await saveTicket({ name, email, subject, message });
    if (ticket) {
      setName('');
      setEmail('');
      setSubject('General Inquiry');
      setMessage('');
    }
  }

  return (
    <>
      <div style={{ background: 'linear-gradient(135deg, #1B6B3A, #0d4a24)', padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(244,161,29,0.15)', border: '1px solid rgba(244,161,29,0.3)', color: '#F4A11D', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 999, marginBottom: 16 }}>
            <i className="fa-solid fa-headset"></i> We're Here to Help
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', marginBottom: 10 }}>Get in Touch</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7 }}>
            Have a question, complaint or suggestion? Our team is available 24/7 to help you trade better on Agrobaba.
          </p>
        </div>
      </div>

      <div className="section">
        <div className="container">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><Link to="/">Home</Link></li>
              <li className="breadcrumb-item active">Contact Us</li>
            </ol>
          </nav>

          <div className="row g-4 mb-5">
            <div className="col-md-4">
              <div className="advantage-card" style={{ textAlign: 'center' }}>
                <div className="icon"><i className="fa-solid fa-location-dot"></i></div>
                <h3>Visit Us</h3>
                <p><strong>Agrobaba</strong><br />Adegbayi, Ibadan<br />Oyo State, Nigeria</p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="advantage-card" style={{ textAlign: 'center' }}>
                <div className="icon"><i className="fa-solid fa-phone"></i></div>
                <h3>Call / WhatsApp</h3>
                <p>
                  <strong><a href="tel:+2347041512742" style={{ color: 'var(--primary)' }}>+2347041512742</a></strong><br />
                  Monday – Saturday<br />8:00 AM – 8:00 PM
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="advantage-card" style={{ textAlign: 'center' }}>
                <div className="icon"><i className="fa-solid fa-envelope"></i></div>
                <h3>Email Us</h3>
                <p>
                  <strong><a href="mailto:Rsdofollybeefarms@gmail.com" style={{ color: 'var(--primary)' }}>Rsdofollybeefarms@gmail.com</a></strong><br />
                  We respond within<br />24 hours
                </p>
              </div>
            </div>
          </div>

          <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 6 }}>Send Us a Message</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
                Fill in the form below and we'll get back to you as soon as possible.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Your Full Name</label>
                  <input type="text" placeholder="Enter your full name" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Subject</label>
                  <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                    <option>General Inquiry</option>
                    <option>Order Issue</option>
                    <option>Payment Problem</option>
                    <option>Account Help</option>
                    <option>Report a User</option>
                    <option>Partnership</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Message</label>
                  <textarea rows={5} placeholder="Describe your issue or question in detail..." required value={message} onChange={(e) => setMessage(e.target.value)} />
                </div>
                <button type="submit" className="btn-primary">
                  <i className="fa-solid fa-paper-plane"></i> Send Message
                </button>
              </form>
            </div>

            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 6 }}>Frequently Asked Questions</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Quick answers to the most common questions.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {FAQS.map(([q, a], i) => (
                  <div
                    key={q}
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '16px 20px', cursor: 'pointer' }}
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: 13, color: 'var(--text)' }}>{q}</strong>
                      <i
                        className="fa-solid fa-chevron-down"
                        style={{ color: 'var(--muted)', fontSize: 12, transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      ></i>
                    </div>
                    {openFaq === i && (
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>{a}</p>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 28, padding: 20, background: 'var(--primary-light)', borderRadius: 'var(--radius)', border: '1px solid #c8e6d4' }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginBottom: 12 }}>
                  <i className="fa-solid fa-share-nodes"></i> Also reach us on social media
                </h4>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--primary)', color: '#fff', padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600 }}>
                    <i className="fa-brands fa-whatsapp"></i> WhatsApp
                  </a>
                  <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#1877f2', color: '#fff', padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600 }}>
                    <i className="fa-brands fa-facebook-f"></i> Facebook
                  </a>
                  <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#000', color: '#fff', padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600 }}>
                    <i className="fa-brands fa-twitter"></i> Twitter
                  </a>
                  <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', color: '#fff', padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 600 }}>
                    <i className="fa-brands fa-instagram"></i> Instagram
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
