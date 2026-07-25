import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { addDemand } from '../../lib/demands';
import { showToast } from '../../lib/toastBus';

const CATEGORIES = [
  'Grains', 'Vegetables', 'Tubers', 'Fruits', 'Fish', 'Poultry', 'Livestock', 'Fertilizers',
  'Pesticides', 'Seeds', 'Animal Feed', 'Farm Equipment', 'Equipment Hire', 'Irrigation',
  'Veterinary', 'Consultancy', 'Logistics', 'Other',
];

export default function PostDemandPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Grains');
  const [quantity, setQuantity] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState(user ? [user.city, user.country].filter(Boolean).join(', ') : '');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (parseFloat(budget) <= 0 || !budget) {
      showToast('Please enter a valid budget.', 'error');
      return;
    }

    const result = await addDemand({ title, category, quantity, budget, location, deadline, description });
    if (result) {
      setTitle('');
      setCategory('Grains');
      setQuantity('');
      setBudget('');
      setLocation(user ? [user.city, user.country].filter(Boolean).join(', ') : '');
      setDeadline('');
      setDescription('');
    }
  }

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/demands">Demand Board</Link></li>
            <li className="breadcrumb-item active">Post a Demand</li>
          </ol>
        </nav>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>Post a Demand</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            Tell sellers exactly what you need. Verified farmers and dealers will respond with their best offers.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32 }}>
          <div className="form-group">
            <label>What do you need? <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="text" placeholder="e.g. 50 bags of dried maize for delivery to Lagos" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <div className="form-group">
                <label>Category <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select required value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c === 'Fish' ? 'Fish & Aquaculture' : c === 'Veterinary' ? 'Veterinary Services' : c}</option>)}
                </select>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label>Quantity Needed</label>
                <input type="text" placeholder="e.g. 50 bags, 2 tonnes, 3 days" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <div className="form-group">
                <label>Your Budget (₦) <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="number" placeholder="e.g. 900000" min="0" required value={budget} onChange={(e) => setBudget(e.target.value)} />
                <small style={{ fontSize: 11, color: 'var(--muted)' }}>Total budget. Sellers will send offers within this range.</small>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label>Delivery Location <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="text" placeholder="e.g. Ikeja, Lagos" required value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Needed By (optional)</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Full Details <span style={{ color: 'var(--danger)' }}>*</span></label>
            <textarea
              rows={5} required
              placeholder="Describe exactly what you need — quality, grade, packaging, delivery terms, payment preference, any special requirements..."
              value={description} onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              <i className="fa-solid fa-bullhorn"></i> Post Demand
            </button>
            <Link to="/demands" className="btn-outline btn-inline" style={{ padding: '11px 24px' }}>Cancel</Link>
          </div>
        </form>

        <div style={{ marginTop: 20, background: 'var(--primary-light)', border: '1px solid #c8e6d4', borderRadius: 'var(--radius)', padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 12 }}>
            <i className="fa-solid fa-lightbulb"></i> How demands work
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['fa-1', 'Your demand appears on the public Demand Board'],
              ['fa-2', 'Farmers and dealers respond with offers'],
              ['fa-3', 'You review offers and chat directly with sellers'],
              ['fa-4', 'Agree on terms, pay via escrow, receive your goods'],
            ].map(([icon, text]) => (
              <li key={text} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className={`fa-solid ${icon}`} style={{ color: 'var(--primary)' }}></i> {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
