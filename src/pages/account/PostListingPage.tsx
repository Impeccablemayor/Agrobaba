import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { StateCitySelect } from '../../components/StateCitySelect';
import { useAuth } from '../../contexts/AuthContext';
import { MAX_LISTING_IMAGES } from '../../lib/products';
import { UNIT_TYPES, unitLabel, type UnitType } from '../../lib/units';
import { getAllowedSectionCodesForRole, findCategory, hasChildren } from '../../lib/categories';
import { useCategories } from '../../hooks/queries/useCategories';
import { useProduct, useServiceListing } from '../../hooks/queries/useProducts';
import { useAddProduct, useUpdateProduct } from '../../hooks/mutations/useProductMutations';
import { ServiceListingForm } from './ServiceListingForm';
import { showToast } from '../../lib/toastBus';
import { CategoryPicker } from '../../components/CategoryPicker';
import { ListingImagePicker } from '../../components/ListingImagePicker';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { prefillFromUser, type LocationPrefill } from '../../lib/locationSelect';
import { locationLine, type LocationSelection } from '../../lib/locations';
import type { Product, ProductType, Role, SafeUser } from '../../types';

interface RoleConfig {
  type: ProductType;
  pageTitle: string;
  editTitle: string;
  subtitle: string;
  breadcrumb: string;
  nameLabel: string;
  namePlaceholder: string;
  priceLabel: string;
  descLabel: string;
  descPlaceholder: string;
  submitLabel: string;
  units: string[];
  showSize: boolean;
}

const CONFIG: Partial<Record<Role, RoleConfig>> = {
  farmer: {
    type: 'produce',
    pageTitle: 'Post Your Listing',
    editTitle: 'Edit Your Listing',
    subtitle: 'List your crops, livestock, fish or processed farm goods for buyers to find and purchase directly.',
    breadcrumb: 'Post Listing',
    nameLabel: 'Listing Name',
    namePlaceholder: 'e.g. Fresh Tomatoes — Grade A, 50kg bag',
    priceLabel: 'Price (₦)',
    descLabel: 'Description',
    descPlaceholder: 'Describe your listing — variety or breed, grade, age/weight, harvest date, delivery options...',
    submitLabel: 'Post Listing',
    units: ['bag', 'kg', 'tonne', 'crate', 'basket', 'bundle', 'piece', 'litre', 'head', 'bird'],
    showSize: true,
  },
  'agro-dealer': {
    type: 'product',
    pageTitle: 'Post Your Product',
    editTitle: 'Edit Your Product',
    subtitle: 'List your agro inputs, equipment, or supplies for farmers and buyers.',
    breadcrumb: 'Post Product',
    nameLabel: 'Product Name',
    namePlaceholder: 'e.g. NPK Fertilizer UREA 50kg — Premium Grade',
    priceLabel: 'Price (₦)',
    descLabel: 'Product Description',
    descPlaceholder: 'Describe your product — brand, specifications, usage, certification...',
    submitLabel: 'Post Product',
    units: ['bag', 'bottle', 'litre', 'kg', 'piece', 'unit', 'carton', 'set'],
    showSize: true,
  },
  admin: {
    type: 'product',
    pageTitle: 'Post a Listing',
    editTitle: 'Edit Listing',
    subtitle: 'Posted under the Agrobaba Official store — your admin account stays private, buyers won’t see it’s you.',
    breadcrumb: 'Post Listing',
    nameLabel: 'Listing Name',
    namePlaceholder: 'e.g. NPK Fertilizer UREA 50kg — Premium Grade',
    priceLabel: 'Price (₦)',
    descLabel: 'Description',
    descPlaceholder: 'Describe the listing — variety, specifications, usage, delivery options...',
    submitLabel: 'Post Listing',
    units: ['bag', 'bottle', 'litre', 'kg', 'piece', 'unit', 'carton', 'set', 'tonne', 'crate', 'basket', 'bundle', 'session', 'hour', 'day', 'acre', 'visit', 'project'],
    showSize: true,
  },
};

/** Saved product locations are "City, State" (see locationLine); split them back into a
 *  name-based prefill - StateCitySelect matches names to its catalogue. */
function prefillFromLocationText(text: string | null | undefined, fallback: LocationPrefill): LocationPrefill {
  const parts = (text || '').split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return fallback;
  return { stateId: null, stateName: parts[1], cityId: null, cityName: parts[0] };
}

export interface ListingEditTarget {
  product: Product;
}

/** /account/post-listing (create) and /account/listings/:id/edit (edit). Products use ListingForm;
 *  services use the dedicated ServiceListingForm (they publish through /api/services). */
export default function PostListingPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const editing = Boolean(id);
  const { data: product, isLoading: productLoading } = useProduct(id);
  const isServiceEdit = product?.type === 'service';
  const { data: service, isLoading: serviceLoading } = useServiceListing(id, editing && isServiceEdit);

  if (!user) return null;
  if (!editing) return user.role === 'service-provider' ? <ServiceListingForm user={user} /> : <ListingForm user={user} />;

  if (productLoading || (isServiceEdit && serviceLoading)) {
    return <PageLoadingSpinner message="Loading your listing…" />;
  }
  const canEdit = product && (String(product.sellerId) === String(user.id) || user.role === 'admin');
  if (!product || !canEdit || (isServiceEdit && !service)) {
    return (
      <div className="section"><div className="container" style={{ maxWidth: 760 }}>
        <div className="empty-cart">
          <i className="fa-solid fa-lock"></i>
          <p>{!product ? 'Listing not found.' : 'You can only edit your own listings.'}</p>
          <Link to="/account/my-listings" className="btn-secondary btn-inline btn-sm">Back to My Listings</Link>
        </div>
      </div></div>
    );
  }
  if (isServiceEdit) return <ServiceListingForm user={user} existing={service} />;
  return <ListingForm user={user} edit={{ product }} />;
}

function ListingForm({ user, edit }: { user: SafeUser; edit?: ListingEditTarget }) {
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();
  const addProductMutation = useAddProduct();
  const updateProductMutation = useUpdateProduct();

  const existing = edit?.product;
  // An admin editing someone's listing must use the listing's flow, not the admin config.
  const roleForForm: Role = existing
    ? (existing.type === 'produce' ? 'farmer' : user.role)
    : user.role;

  const initialLocation: LocationPrefill = existing
      ? prefillFromLocationText(existing.location, prefillFromUser(user))
      : prefillFromUser(user);

  const [name, setName] = useState(existing?.name ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId != null ? String(existing.categoryId) : null);
  const [price, setPrice] = useState(existing?.price != null ? String(existing.price) : '');
  const [quantity, setQuantity] = useState(existing ? String(existing.quantity ?? 1) : '1');
  const [unit, setUnit] = useState(existing?.unit ?? '');
  const [unitType, setUnitType] = useState('');
  const [minOrderQuantity, setMinOrderQuantity] = useState('');
  const [maxOrderQuantity, setMaxOrderQuantity] = useState('');
  const [incrementQuantity, setIncrementQuantity] = useState('');
  const [priceTiers, setPriceTiers] = useState<{ minQuantity: string; pricePerUnit: string }[]>([]);
  const [negotiated, setNegotiated] = useState(existing?.negotiated ?? false);
  const [size, setSize] = useState(existing?.size || 'Standard');
  const [location, setLocation] = useState<LocationSelection>({
    stateId: initialLocation.stateId ?? null,
    stateName: initialLocation.stateName ?? null,
    cityId: initialLocation.cityId ?? null,
    cityName: initialLocation.cityName ?? null,
  });
  const [discount, setDiscount] = useState(existing ? String(existing.discount ?? 0) : '0');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [images, setImages] = useState<string[]>(() => {
    if (existing) return (existing.images?.length ? existing.images : existing.image ? [existing.image] : []).slice(0, MAX_LISTING_IMAGES);
    return [];
  });
  const [submitting, setSubmitting] = useState(false);

  if (!CONFIG[roleForForm]) {
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

  const c = CONFIG[roleForForm]!;
  const isEdit = Boolean(existing);
  // Category and negotiated-vs-fixed pricing are locked after publishing (the backend edit
  // contract excludes them to protect quotes, carts and checkout).
  const categoryLocked = isEdit;
  const effectiveUnit = unit || c.units[0];
  const unitOptions = c.units.includes(effectiveUnit) ? c.units : [effectiveUnit, ...c.units];
  const allowedSections = getAllowedSectionCodesForRole(roleForForm);
  const existingCategoryName = existing?.category;

  function addPriceTierRow() {
    setPriceTiers((rows) => [...rows, { minQuantity: '', pricePerUnit: '' }]);
  }

  function updatePriceTierRow(index: number, field: 'minQuantity' | 'pricePerUnit', value: string) {
    setPriceTiers((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function removePriceTierRow(index: number) {
    setPriceTiers((rows) => rows.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!categoryLocked) {
      if (!categoryId) {
        showToast('Please select a category.', 'error');
        return;
      }
      const selected = findCategory(categories, categoryId);
      if (!selected || hasChildren(categories, categoryId)) {
        showToast('Please pick a specific subcategory, not a broader category.', 'error');
        return;
      }
    }
    if (!negotiated && !price) {
      showToast('Please set a price, or mark this listing as negotiated.', 'error');
      return;
    }
    if (!location.cityName || !location.stateName) {
      showToast('Please select your state and city.', 'error');
      return;
    }
    const locationText = locationLine(location.cityName, location.stateName);
    setSubmitting(true);

    let ok = false;
    if (isEdit) {
      ok = Boolean(await updateProductMutation.mutateAsync({
        id: existing!.id,
        data: {
          name: name.trim(),
          description,
          price: existing!.negotiated ? (price ? Number(price) : null) : Number(price),
          quantity: Number(quantity) || 1,
          unit: effectiveUnit,
          location: locationText,
          size: c.showSize ? size : 'Standard',
          discount: Number(discount) || 0,
          images,
        },
      }));
    } else {
      const selected = findCategory(categories, categoryId!)!;
      ok = Boolean(await addProductMutation.mutateAsync({
        name, categoryId, listingKind: selected.allowedListingKinds[0], price: price || undefined, quantity, unit: effectiveUnit,
        size: c.showSize ? size : 'Standard', location: locationText, discount, description,
        type: c.type, images,
        unitType: unitType || null,
        minOrderQuantity: minOrderQuantity || null,
        maxOrderQuantity: maxOrderQuantity || null,
        incrementQuantity: incrementQuantity || null,
        priceTiers: negotiated ? [] : priceTiers.filter((t) => t.minQuantity && t.pricePerUnit),
        negotiated,
      }));
    }
    if (ok) {
      navigate('/account/my-listings');
      return;
    }
    setSubmitting(false);
  }

  const crumb = isEdit ? 'Edit Listing' : c.breadcrumb;

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link to="/">Home</Link></li>
            <li className="breadcrumb-item"><Link to={isEdit ? '/account/my-listings' : '/account'}>{isEdit ? 'My Listings' : 'My Account'}</Link></li>
            <li className="breadcrumb-item active">{crumb}</li>
          </ol>
        </nav>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>{isEdit ? c.editTitle : c.pageTitle}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>{isEdit ? `Update the details buyers see for "${existing!.name}".` : c.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="listing-form" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32 }}>
          <ListingImagePicker
            images={images}
            onChange={setImages}
            max={MAX_LISTING_IMAGES}
            label="Listing Photos"
          />

          <div className="form-group">
            <label>{c.nameLabel} <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="text" placeholder={c.namePlaceholder} required maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {categoryLocked ? (
            <div className="form-group">
              <label>Category</label>
              <input type="text" value={existingCategoryName || '—'} disabled />
              <small style={{ fontSize: 11, color: 'var(--muted)' }}>
                The category can't be changed after publishing. To list under a different category, post a new listing.
              </small>
            </div>
          ) : (
            <CategoryPicker allowedSections={allowedSections} value={categoryId} onChange={setCategoryId} />
          )}

          <div className="row g-3">
            <div className="col-md-6">
              <div className="form-group">
                <label>
                  {c.priceLabel} {!negotiated && <span style={{ color: 'var(--danger)' }}>*</span>}
                </label>
                <input
                  type="number" placeholder={negotiated ? 'Optional starting reference price' : 'e.g. 8500'} min="0"
                  required={!negotiated} value={price} onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>
          </div>

          {!isEdit && (
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <input
                type="checkbox" id="negotiated-check" checked={negotiated}
                onChange={(e) => setNegotiated(e.target.checked)}
                style={{ width: 16, height: 16, marginTop: 3, flexShrink: 0 }}
              />
              <label htmlFor="negotiated-check" style={{ cursor: 'pointer', marginBottom: 0 }}>
                This listing requires negotiation <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(no fixed price — buyers request a quote instead of buying directly)</span>
              </label>
            </div>
          )}
          {isEdit && negotiated && (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -4 }}>
              <i className="fa-solid fa-comments-dollar"></i> Negotiated listing — buyers request a quote. This can't be switched to a fixed-price listing after publishing.
            </p>
          )}

            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-group">
                  <label>Quantity Available</label>
                  <input type="number" placeholder="e.g. 100" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-group">
                  <label>Unit</label>
                  <select value={effectiveUnit} onChange={(e) => setUnit(e.target.value)}>
                    {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>

          {!isEdit && (
          <div className="form-group">
            <label>Order Rules <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -4, marginBottom: 10 }}>
              For products sold in bulk with a minimum order size (e.g. fingerlings sold 1,000 at a time) — leave blank for a simple listing.
            </p>
            <div className="row g-3">
              <div className="col-md-3">
                <select value={unitType} onChange={(e) => setUnitType(e.target.value)}>
                  <option value="">No unit type</option>
                  {UNIT_TYPES.map((u: UnitType) => <option key={u} value={u}>{unitLabel(u)}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <input type="number" placeholder="Min order" min="1" value={minOrderQuantity} onChange={(e) => setMinOrderQuantity(e.target.value)} />
              </div>
              <div className="col-md-3">
                <input type="number" placeholder="Max order" min="1" value={maxOrderQuantity} onChange={(e) => setMaxOrderQuantity(e.target.value)} />
              </div>
              <div className="col-md-3">
                <input type="number" placeholder="Increment" min="1" value={incrementQuantity} onChange={(e) => setIncrementQuantity(e.target.value)} />
              </div>
            </div>
          </div>
          )}

          {!isEdit && !negotiated && (
          <div className="form-group">
            <label>Price Tiers <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -4, marginBottom: 10 }}>
              Offer a lower price per unit at higher order quantities — each tier must be cheaper than the base price and the tier before it.
            </p>
            {priceTiers.map((tier, i) => (
              <div className="row g-3" key={i} style={{ marginBottom: 8, alignItems: 'center' }}>
                <div className="col-md-5">
                  <input
                    type="number" placeholder="At quantity" min="1"
                    value={tier.minQuantity}
                    onChange={(e) => updatePriceTierRow(i, 'minQuantity', e.target.value)}
                  />
                </div>
                <div className="col-md-5">
                  <input
                    type="number" placeholder="Price per unit (₦)" min="0" step="0.01"
                    value={tier.pricePerUnit}
                    onChange={(e) => updatePriceTierRow(i, 'pricePerUnit', e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <button type="button" className="btn-outline btn-inline btn-sm" onClick={() => removePriceTierRow(i)} style={{ width: '100%' }}>
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn-outline btn-inline btn-sm" onClick={addPriceTierRow}>
              <i className="fa-solid fa-plus"></i> Add price tier
            </button>
          </div>
          )}

          {c.showSize && (
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-group">
                  <label>Size / Package</label>
                  <input type="text" placeholder="e.g. 50kg bag" maxLength={80} value={size} onChange={(e) => setSize(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <div className="row g-3">
            <StateCitySelect
              idPrefix="post-listing"
              fieldClassName="form-group"
              wrapperClassName="col-md-6"
              initial={initialLocation}
              required
              cityLabel="City"
              onChange={setLocation}
            />
          </div>

            <div className="form-group">
              <label>Discount % (optional)</label>
              <input type="number" placeholder="e.g. 10 for 10% off" min="0" max="90" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              <small style={{ fontSize: 11, color: 'var(--muted)' }}>Leave at 0 for no discount. Discounted items appear in Flash Deals.</small>
            </div>

          <div className="form-group">
            <label>{c.descLabel} <span style={{ color: 'var(--danger)' }}>*</span></label>
            <textarea rows={5} placeholder={c.descPlaceholder} required maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 1 }}>
              {submitting && <i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>}
              {submitting
                ? (isEdit ? 'Saving…' : 'Publishing…')
                : (<><i className="fa-solid fa-check"></i> {isEdit ? 'Save Changes' : c.submitLabel}</>)}
            </button>
            <Link to={isEdit ? '/account/my-listings' : '/account'} className="btn-outline btn-inline" style={{ padding: '11px 24px' }}>Cancel</Link>
          </div>
        </form>

        {!isEdit && (
        <div style={{ marginTop: 20, background: 'var(--primary-light)', border: '1px solid #c8e6d4', borderRadius: 'var(--radius)', padding: 20 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 12 }}>
            <i className="fa-solid fa-lightbulb"></i> Tips for a great listing
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              `Add up to ${MAX_LISTING_IMAGES} clear, well-lit photos of the actual item - different angles help buyers decide`,
              'Pick the most specific category so buyers can find you in search and filters',
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
        )}
      </div>
    </div>
  );
}
