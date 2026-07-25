import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { addProduct } from '../../lib/products';
import { showToast } from '../../lib/toastBus';
import type { ProductType, Role } from '../../types';

interface RoleConfig {
  type: ProductType;
  pageTitle: string;
  subtitle: string;
  breadcrumb: string;
  nameLabel: string;
  namePlaceholder: string;
  priceLabel: string;
  descLabel: string;
  descPlaceholder: string;
  submitLabel: string;
  categories: string[];
  units: string[];
  showSize: boolean;
}

const CONFIG: Partial<Record<Role, RoleConfig>> = {
  farmer: {
    type: 'produce',
    pageTitle: 'Post Your Produce',
    subtitle: 'List your farm produce for buyers to find and purchase directly.',
    breadcrumb: 'Post Produce',
    nameLabel: 'Produce Name',
    namePlaceholder: 'e.g. Fresh Tomatoes — Grade A, 50kg bag',
    priceLabel: 'Price (₦)',
    descLabel: 'Description',
    descPlaceholder: 'Describe your produce — variety, grade, harvest date, freshness, delivery options...',
    submitLabel: 'Post Produce',
    categories: ['Vegetables', 'Grains', 'Tubers', 'Fruits', 'Fish', 'Poultry', 'Livestock', 'Dairy', 'Other'],
    units: ['bag', 'kg', 'tonne', 'crate', 'basket', 'bundle', 'piece', 'litre'],
    showSize: true,
  },
  'agro-dealer': {
    type: 'product',
    pageTitle: 'Post Your Product',
    subtitle: 'List your agro inputs, equipment, or supplies for farmers and buyers.',
    breadcrumb: 'Post Product',
    nameLabel: 'Product Name',
    namePlaceholder: 'e.g. NPK Fertilizer UREA 50kg — Premium Grade',
    priceLabel: 'Price (₦)',
    descLabel: 'Product Description',
    descPlaceholder: 'Describe your product — brand, specifications, usage, certification...',
    submitLabel: 'Post Product',
    categories: ['Fertilizers', 'Pesticides', 'Seeds', 'Animal Feed', 'Farm Equipment', 'Irrigation', 'Tools', 'Packaging', 'Other'],
    units: ['bag', 'bottle', 'litre', 'kg', 'piece', 'unit', 'carton', 'set'],
    showSize: true,
  },
  'service-provider': {
    type: 'service',
    pageTitle: 'Post Your Service',
    subtitle: 'Offer your agricultural services to farmers and buyers across Nigeria.',
    breadcrumb: 'Post Service',
    nameLabel: 'Service Title',
    namePlaceholder: 'e.g. Poultry Vet Consultation — 1 hour session',
    priceLabel: 'Price (₦)',
    descLabel: 'Service Description',
    descPlaceholder: 'Describe your service — what you offer, experience, coverage area, availability...',
    submitLabel: 'Post Service',
    categories: ['Veterinary', 'Consultancy', 'Equipment Hire', 'Logistics', 'Training', 'Soil Testing', 'Land Preparation', 'Storage', 'Other'],
    units: ['session', 'hour', 'day', 'acre', 'visit', 'project'],
    showSize: false,
  },
};

export default function PostListingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [size, setSize] = useState('Standard');
  const [location, setLocation] = useState(user ? [user.city, user.country].filter(Boolean).join(', ') : '');
  const [discount, setDiscount] = useState('0');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);

  if (!user) return null;

  if (!CONFIG[user.role]) {
    return (
      <div className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
              <li className="breadcrumb-item"><Link to="/">Home</Link></li>
              <li className="breadcrumb-item"><Link to="/account">My Account</Link></li>
              <li className="breadcrumb-item active">Post Listing</li>
            </ol>
          </nav>
          <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: 24, textAlign: 'center' }}>
            <i className="fa-solid fa-circle-info" style={{ fontSize: 32, color: 'var(--accent)', marginBottom: 12, display: 'block' }}></i>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>You're registered as a Buyer</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
              Buyers post demands, not listings. Would you like to post a demand instead, or browse the shop?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/demands/new" className="btn-primary btn-inline btn-sm"><i className="fa-solid fa-pen"></i> Post a Demand</Link>
              <Link to="/shop" className="btn-outline btn-inline btn-sm"><i className="fa-solid fa-store"></i> Browse Shop</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const c = CONFIG[user.role]!;
  const effectiveCategory = category || c.categories[0];
  const effectiveUnit = unit || c.units[0];

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image is too large. Max 5MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = await addProduct({
      name, category: effectiveCategory, price, quantity, unit: effectiveUnit,
      size: c.showSize ? size : 'Standard', location, discount, description,
      type: c.type, image,
    });
    if (result) {
      navigate('/account/my-listings');
    }
  }

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to="/account">My Account</Link></li>
            <li className="breadcrumb-item active">{c.breadcrumb}</li>
          </ol>
        </nav>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>{c.pageTitle}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>{c.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32 }}>
          <div className="form-group">
            <label>{c.type === 'service' ? 'Service Photo (optional)' : 'Listing Photo'}</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{ border: '2px dashed var(--border-mid)', borderRadius: 'var(--radius)', padding: 32, textAlign: 'center', cursor: 'pointer' }}
            >
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
              {image ? (
                <img src={image} style={{ maxHeight: 200, margin: '0 auto', borderRadius: 'var(--radius-sm)' }} alt="Preview" />
              ) : (
                <div>
                  <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 36, color: 'var(--muted)', marginBottom: 12 }}></i>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Click to upload a photo</p>
                  <p style={{ fontSize: 11, color: 'var(--muted)' }}>JPG, PNG up to 5MB. A good photo boosts sales!</p>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>{c.nameLabel} <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="text" placeholder={c.namePlaceholder} required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <div className="form-group">
                <label>Category <span style={{ color: 'var(--danger)' }}>*</span></label>
                <select required value={effectiveCategory} onChange={(e) => setCategory(e.target.value)}>
                  {c.categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label>{c.priceLabel} <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="number" placeholder="e.g. 8500" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <div className="form-group">
                <label>{c.showSize ? 'Quantity Available' : 'Slots Available'}</label>
                <input type="number" placeholder="e.g. 100" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label>Unit</label>
                <select value={effectiveUnit} onChange={(e) => setUnit(e.target.value)}>
                  {c.units.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="row g-3">
            {c.showSize && (
              <div className="col-md-6">
                <div className="form-group">
                  <label>Size / Package</label>
                  <input type="text" placeholder="e.g. 50kg bag" value={size} onChange={(e) => setSize(e.target.value)} />
                </div>
              </div>
            )}
            <div className={c.showSize ? 'col-md-6' : 'col-md-12'}>
              <div className="form-group">
                <label>Location <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="text" placeholder="e.g. Ibadan, Oyo State" required value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Discount % (optional)</label>
            <input type="number" placeholder="e.g. 10 for 10% off" min="0" max="90" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            <small style={{ fontSize: 11, color: 'var(--muted)' }}>Leave at 0 for no discount. Discounted items appear in Flash Deals.</small>
          </div>

          <div className="form-group">
            <label>{c.descLabel} <span style={{ color: 'var(--danger)' }}>*</span></label>
            <textarea rows={5} placeholder={c.descPlaceholder} required value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              <i className="fa-solid fa-check"></i> {c.submitLabel}
            </button>
            <Link to="/account" className="btn-outline btn-inline" style={{ padding: '11px 24px' }}>Cancel</Link>
          </div>
        </form>

        <div style={{ marginTop: 20, background: 'var(--primary-light)', border: '1px solid #c8e6d4', borderRadius: 'var(--radius)', padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 12 }}>
            <i className="fa-solid fa-lightbulb"></i> Tips for a great listing
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'Use a clear, well-lit photo of your actual product',
              'Write a detailed, honest description to build trust',
              'Price competitively — check similar listings in the shop',
              'Respond quickly to messages to close more deals',
            ].map((tip) => (
              <li key={tip} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <i className="fa-solid fa-check" style={{ color: 'var(--primary)', fontSize: 11 }}></i> {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
