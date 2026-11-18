import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StateCitySelect } from '../../components/StateCitySelect';
import { ListingImagePicker } from '../../components/ListingImagePicker';
import { useCategories } from '../../hooks/queries/useCategories';
import { useSaveServiceListing } from '../../hooks/mutations/useProductMutations';
import { hasChildren } from '../../lib/categories';
import { prefillFromUser, type LocationPrefill } from '../../lib/locationSelect';
import { MAX_LISTING_IMAGES } from '../../lib/products';
import type {
  FlexibleServiceValue, ServiceEngagementMethod, ServiceListing, ServiceListingInput, ServiceRequirement, ServiceRequirementType,
} from '../../lib/products';
import type { LocationSelection } from '../../lib/locations';
import { showToast } from '../../lib/toastBus';
import type { Category, SafeUser } from '../../types';

/** Service providers' listing form (create + edit, publish or save draft). Restored from the
 *  partner's QuickServiceListingPage (lost from main), adapted to main's location picker, photo
 *  picker and category cache. Essentials first; richer details are optional and collapsible. */

const COMMON_EQUIPMENT: [string, string][] = [['tractor', 'Tractor'], ['harrow', 'Harrow'], ['ridger', 'Ridger'], ['planter', 'Planter'], ['sprayer', 'Sprayer'], ['truck', 'Truck/Vehicle']];
const COMMON_INCLUSIONS: [string, string][] = [['labour', 'Labour'], ['equipment', 'Equipment'], ['fuel', 'Fuel'], ['transportation', 'Transportation'], ['materials', 'Materials']];
const UNITS = ['service', 'hour', 'day', 'session', 'animal', 'acre', 'hectare', 'trip', 'load', 'project', 'visit', 'other'];
const ENGAGEMENTS: [ServiceEngagementMethod, string, string][] = [
  ['standard_booking', 'Book at my listed price', 'Customer sends the details and you confirm availability.'],
  ['request_before_booking', 'Ask me before booking', 'You review each request before the customer pays.'],
  ['request_quote', 'Request a quote', 'Best when every job has a different scope or price.'],
];

function emptyForm(user: SafeUser): ServiceListingInput {
  return {
    title: '', categoryId: null, customCategoryName: '', serviceType: '', customServiceType: '', specialization: '',
    customSpecialization: '', price: null, pricingModel: 'fixed', customPricingModel: '', pricingUnit: 'service',
    customPricingUnit: '', engagementMethod: 'standard_booking', description: '', country: 'Nigeria',
    state: user.state || '', city: user.city || '', coverageType: 'my_state', customCoverage: '', radiusKm: null,
    onSite: true, remote: false, canTravel: false, availability: [], capacityValue: null, capacityUnit: '',
    customCapacityUnit: '', experienceYears: null, inclusions: [], equipment: [], extras: [], metadata: {},
    requirements: [], gallery: [], draftStep: 1, publish: true,
  };
}

function fromExisting(s: ServiceListing): ServiceListingInput {
  return {
    title: s.title || '', categoryId: s.categoryId ?? null, customCategoryName: s.customCategoryName || '',
    serviceType: s.serviceType || '', customServiceType: s.customServiceType || '', specialization: s.specialization || '',
    customSpecialization: s.customSpecialization || '', price: s.price, pricingModel: s.pricingModel || 'fixed',
    customPricingModel: s.customPricingModel || '', pricingUnit: s.pricingUnit || 'service', customPricingUnit: s.customPricingUnit || '',
    engagementMethod: s.engagementMethod || 'standard_booking', description: s.description || '', country: s.country || 'Nigeria',
    state: s.state || '', city: s.city || '', coverageType: s.coverageType || 'my_state', customCoverage: s.customCoverage || '',
    radiusKm: s.radiusKm ?? null, onSite: s.onSite ?? true, remote: s.remote ?? false, canTravel: s.canTravel ?? false,
    availability: s.availability || [], capacityValue: s.capacityValue ?? null, capacityUnit: s.capacityUnit || '',
    customCapacityUnit: s.customCapacityUnit || '', experienceYears: s.experienceYears ?? null, inclusions: s.inclusions || [],
    equipment: s.equipment || [], extras: s.extras || [], metadata: s.metadata || {},
    requirements: (s.requirements || []).map((r) => ({ ...r, options: r.options || [] })),
    gallery: s.gallery || [], draftStep: Math.max(1, s.draftStep || 1), publish: true,
  };
}

function ChoiceChips({ options, values, onChange }: { options: [string, string][]; values: FlexibleServiceValue[]; onChange: (v: FlexibleServiceValue[]) => void }) {
  return (
    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
      {options.map(([code, label]) => {
        const selected = values.some((v) => v.code === code);
        return (
          <button
            type="button" key={code} aria-pressed={selected}
            onClick={() => onChange(selected ? values.filter((v) => v.code !== code) : [...values, { code, customValue: null }])}
            className={selected ? 'btn-primary btn-sm btn-inline' : 'btn-outline btn-sm btn-inline'}
          >
            {selected && <i className="fa-solid fa-check"></i>} {label}
          </button>
        );
      })}
    </div>
  );
}

const customValues = (text: string): FlexibleServiceValue[] =>
  text.split(',').map((v) => v.trim()).filter(Boolean).map((customValue) => ({ code: null, customValue }));
const customText = (values: FlexibleServiceValue[]) =>
  values.filter((v) => !v.code && v.customValue).map((v) => v.customValue).join(', ');

export function ServiceListingForm({ user, existing }: { user: SafeUser; existing?: ServiceListing | null }) {
  const navigate = useNavigate();
  const { data: categories = [] } = useCategories();
  const saveMutation = useSaveServiceListing();
  const [productId, setProductId] = useState<string | undefined>(existing ? String(existing.productId) : undefined);
  const [form, setForm] = useState<ServiceListingInput>(() => (existing ? fromExisting(existing) : emptyForm(user)));
  const [priceText, setPriceText] = useState(existing?.price != null ? String(existing.price) : '');
  const [customEquipment, setCustomEquipment] = useState(() => customText(existing?.equipment || []));
  const [customInclusions, setCustomInclusions] = useState(() => customText(existing?.inclusions || []));
  const [initialLocation] = useState<LocationPrefill>(() => (existing
    ? { stateId: null, stateName: existing.state, cityId: null, cityName: existing.city }
    : prefillFromUser(user)));
  // Photos are edited with the shared picker; any video links are kept as they are.
  const [images, setImages] = useState<string[]>(() =>
    (existing?.gallery || []).filter((m) => m.type === 'image').map((m) => m.url).slice(0, MAX_LISTING_IMAGES));
  const videos = useMemo(() => (existing?.gallery || []).filter((m) => m.type === 'video'), [existing]);

  const isEdit = Boolean(existing);
  const isLive = existing?.status === 'active';
  const saving = saveMutation.isPending;

  const serviceLeaves = useMemo(
    () => categories.filter((c) => c.section === 'services' && !hasChildren(categories, c.id)),
    [categories],
  );
  const selectedCategory = categories.find((c) => Number(c.id) === form.categoryId);
  const needsCustomCategory = Boolean(selectedCategory && (selectedCategory.code.endsWith('.other') || selectedCategory.name.toLowerCase().includes('other')));
  const set = <K extends keyof ServiceListingInput>(key: K, value: ServiceListingInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  function categoryLabel(category: Category) {
    const parent = categories.find((c) => c.id === category.parentId);
    return parent && parent.level > 1 ? `${parent.name} — ${category.name}` : category.name;
  }

  function handleLocation(selection: LocationSelection) {
    setForm((current) => ({ ...current, state: selection.stateName || '', city: selection.cityName || '' }));
  }

  async function save(publish: boolean) {
    if (saving) return;
    if (!form.categoryId) { showToast('Choose the closest service category.', 'error'); return; }
    if (publish) {
      if (!form.title.trim() || !form.description.trim()) { showToast('Add a title and a short description.', 'error'); return; }
      if (needsCustomCategory && !form.customCategoryName.trim()) { showToast('Tell customers what your service category is called.', 'error'); return; }
      if (form.engagementMethod !== 'request_quote' && (priceText === '' || Number(priceText) < 0)) { showToast('Add your price, or choose Request a quote.', 'error'); return; }
      if (form.engagementMethod !== 'request_quote' && form.pricingUnit === 'other' && !form.customPricingUnit.trim()) { showToast('Enter the unit you charge for.', 'error'); return; }
      if (form.coverageType === 'custom' && !form.customCoverage.trim()) { showToast('Describe your coverage area.', 'error'); return; }
      if (!form.state || !form.city) { showToast('Select your state and city.', 'error'); return; }
    }
    const incomplete = form.requirements.find((r) => !r.question.trim() || (r.answerType === 'multiple_choice' && r.options.length < 2));
    if (incomplete) { showToast('Complete each customer question. Multiple-choice questions need at least two choices.', 'error'); return; }

    const quote = form.engagementMethod === 'request_quote';
    const input: ServiceListingInput = {
      ...form,
      price: !quote && priceText !== '' ? Number(priceText) : null,
      pricingModel: quote ? 'request_quote' : form.pricingUnit === 'service' ? 'fixed' : `per_${form.pricingUnit}`,
      equipment: [...form.equipment.filter((v) => v.code), ...customValues(customEquipment)],
      inclusions: [...form.inclusions.filter((v) => v.code), ...customValues(customInclusions)],
      gallery: [...images.map((url) => ({ url, caption: null, type: 'image' as const })), ...videos],
      // A live service can't be pulled back to draft from here (remove it from My Listings instead).
      publish: publish || isLive,
    };
    const result = await saveMutation.mutateAsync({ input, productId });
    if (!result) return;
    setProductId(String(result.productId));
    if (input.publish) navigate('/account/my-listings');
  }

  function addRequirement() {
    set('requirements', [...form.requirements, { question: '', answerType: 'short_text', required: true, options: [], allowOther: false }]);
  }
  function updateRequirement(index: number, changes: Partial<ServiceRequirement>) {
    set('requirements', form.requirements.map((r, i) => (i === index ? { ...r, ...changes } : r)));
  }

  return (
    <div className="section"><div className="container" style={{ maxWidth: 820 }}>
      <nav aria-label="breadcrumb"><ol className="breadcrumb">
        <li className="breadcrumb-item"><Link to="/">Home</Link></li>
        <li className="breadcrumb-item"><Link to={isEdit ? '/account/my-listings' : '/account'}>{isEdit ? 'My Listings' : 'My Account'}</Link></li>
        <li className="breadcrumb-item active">{isEdit ? 'Edit Service' : 'List a Service'}</li>
      </ol></nav>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }}>{isEdit ? 'Edit your service' : 'List your service'}</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Only the essentials are required. You can add more details now or later.</p>
      </div>

      <div className="service-listing-card">
        <ListingImagePicker images={images} onChange={setImages} max={MAX_LISTING_IMAGES} label="Photos of your work (optional)" />

        <div className="form-group">
          <label htmlFor="service-title">What service do you provide? <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input id="service-title" maxLength={200} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Tractor ploughing with operator" />
        </div>
        <div className="form-group">
          <label htmlFor="service-category">Service category <span style={{ color: 'var(--danger)' }}>*</span></label>
          <select id="service-category" value={form.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value ? Number(e.target.value) : null)}>
            <option value="">Choose the closest category…</option>
            {serviceLeaves.map((c) => <option key={c.id} value={c.id}>{categoryLabel(c)}</option>)}
          </select>
        </div>
        {needsCustomCategory && (
          <div className="form-group">
            <label htmlFor="service-custom-category">What should we call your service category? <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input id="service-custom-category" maxLength={120} value={form.customCategoryName} onChange={(e) => set('customCategoryName', e.target.value)} placeholder="e.g. Drone crop mapping" />
          </div>
        )}
        <div className="form-group">
          <label htmlFor="service-description">Describe the service <span style={{ color: 'var(--danger)' }}>*</span></label>
          <textarea id="service-description" rows={4} maxLength={5000} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What will you do, and what result should the customer expect?" />
        </div>

        <fieldset className="form-group" style={{ border: 0, padding: 0, margin: '0 0 16px' }}>
          <legend style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>How should customers engage you?</legend>
          <div style={{ display: 'grid', gap: 8 }}>
            {ENGAGEMENTS.map(([value, title, help]) => (
              <label key={value} className={`service-engagement-option${form.engagementMethod === value ? ' selected' : ''}`}>
                <input
                  type="radio" name="engagement" checked={form.engagementMethod === value}
                  onChange={() => setForm((c) => ({ ...c, engagementMethod: value, pricingUnit: value === 'request_quote' ? 'service' : c.pricingUnit }))}
                />
                <span><strong>{title}</strong><small>{help}</small></span>
              </label>
            ))}
          </div>
        </fieldset>

        {form.engagementMethod !== 'request_quote' && (
          <div className="row g-3">
            <div className="col-md-6"><div className="form-group">
              <label htmlFor="service-price">Price (₦) <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input id="service-price" type="number" min="0" inputMode="numeric" value={priceText} onChange={(e) => setPriceText(e.target.value)} placeholder="45000" />
            </div></div>
            <div className="col-md-6"><div className="form-group">
              <label htmlFor="service-pricing-unit">Charge per</label>
              <select id="service-pricing-unit" value={form.pricingUnit} onChange={(e) => set('pricingUnit', e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u === 'service' ? 'Complete service' : u === 'other' ? 'Other…' : u}</option>)}
              </select>
            </div></div>
          </div>
        )}
        {form.pricingUnit === 'other' && form.engagementMethod !== 'request_quote' && (
          <div className="form-group">
            <label htmlFor="service-custom-unit">Custom pricing unit</label>
            <input id="service-custom-unit" maxLength={80} value={form.customPricingUnit} onChange={(e) => set('customPricingUnit', e.target.value)} placeholder="e.g. pond" />
          </div>
        )}

        <div className="row g-3">
          <StateCitySelect
            idPrefix="service-listing" fieldClassName="form-group" wrapperClassName="col-md-6"
            initial={initialLocation} required cityLabel="City / LGA" onChange={handleLocation}
          />
        </div>

        <details className="service-more-details" open={isEdit && (form.requirements.length > 0 || form.inclusions.length > 0 || form.equipment.length > 0)}>
          <summary><i className="fa-solid fa-plus"></i> Add more details <span>(optional)</span></summary>
          <div style={{ paddingTop: 18 }}>
            <div className="row g-3">
              <div className="col-md-6"><div className="form-group"><label htmlFor="service-type">Service type</label><input id="service-type" maxLength={80} value={form.serviceType} onChange={(e) => set('serviceType', e.target.value)} placeholder="e.g. Ploughing" /></div></div>
              <div className="col-md-6"><div className="form-group"><label htmlFor="service-specialization">Specialization</label><input id="service-specialization" maxLength={120} value={form.specialization} onChange={(e) => set('specialization', e.target.value)} /></div></div>
            </div>
            <div className="form-group">
              <label>What is included?</label>
              <ChoiceChips options={COMMON_INCLUSIONS} values={form.inclusions} onChange={(v) => set('inclusions', v)} />
              <input style={{ marginTop: 8 }} value={customInclusions} onChange={(e) => setCustomInclusions(e.target.value)} placeholder="Anything else? Separate items with commas" />
            </div>
            <div className="form-group">
              <label>Equipment available</label>
              <ChoiceChips options={COMMON_EQUIPMENT} values={form.equipment} onChange={(v) => set('equipment', v)} />
              <input style={{ marginTop: 8 }} value={customEquipment} onChange={(e) => setCustomEquipment(e.target.value)} placeholder="Other equipment, separated by commas" />
            </div>
            <div className="row g-3">
              <div className="col-md-6"><div className="form-group"><label htmlFor="service-coverage">Coverage</label>
                <select id="service-coverage" value={form.coverageType} onChange={(e) => set('coverageType', e.target.value)}>
                  <option value="my_lga">My LGA</option><option value="my_state">My state</option><option value="selected_states">Selected states</option>
                  <option value="nationwide">Nationwide</option><option value="remote">Remote</option><option value="custom">Custom area</option>
                </select></div></div>
              <div className="col-md-6"><div className="form-group"><label htmlFor="service-experience">Years of experience</label>
                <input id="service-experience" type="number" min="0" max="100" value={form.experienceYears ?? ''} onChange={(e) => set('experienceYears', e.target.value ? Number(e.target.value) : null)} /></div></div>
            </div>
            {form.coverageType === 'custom' && (
              <div className="form-group"><label htmlFor="service-custom-coverage">Custom coverage area</label>
                <input id="service-custom-coverage" maxLength={240} value={form.customCoverage} onChange={(e) => set('customCoverage', e.target.value)} /></div>
            )}
            <div className="form-group">
              <label>Questions customers answer when booking</label>
              {form.requirements.map((r, index) => (
                <div key={index} className="service-requirement-builder">
                  <input aria-label={`Question ${index + 1}`} maxLength={240} value={r.question} onChange={(e) => updateRequirement(index, { question: e.target.value })} placeholder="e.g. What is the size of your farm?" />
                  <div className="service-requirement-controls">
                    <select aria-label={`Answer type for question ${index + 1}`} value={r.answerType} onChange={(e) => updateRequirement(index, { answerType: e.target.value as ServiceRequirementType })}>
                      <option value="short_text">Short answer</option><option value="long_text">Long answer</option><option value="number">Number</option>
                      <option value="multiple_choice">Multiple choice</option><option value="date">Date</option><option value="location">Location</option>
                    </select>
                    <label><input type="checkbox" checked={r.required} onChange={(e) => updateRequirement(index, { required: e.target.checked })} /> Required</label>
                    <button type="button" className="btn-outline btn-sm" onClick={() => set('requirements', form.requirements.filter((_, i) => i !== index))}>Remove</button>
                  </div>
                  {r.answerType === 'multiple_choice' && (
                    <input style={{ marginTop: 8 }} value={r.options.join(', ')} placeholder="At least two choices, separated by commas"
                      onChange={(e) => updateRequirement(index, { options: e.target.value.split(',').map((v) => v.trim()).filter(Boolean), allowOther: true })} />
                  )}
                </div>
              ))}
              <button type="button" className="btn-outline btn-sm btn-inline" onClick={addRequirement}><i className="fa-solid fa-plus"></i> Add a customer question</button>
            </div>
          </div>
        </details>

        <div className="service-listing-actions">
          {!isLive && (
            <button type="button" className="btn-outline btn-inline" disabled={saving} onClick={() => void save(false)}>
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
          )}
          <button type="button" className="btn-primary btn-inline" disabled={saving} onClick={() => void save(true)}>
            <i className="fa-solid fa-paper-plane"></i> {saving ? 'Saving…' : isLive ? 'Save Changes' : 'Publish Service'}
          </button>
          <Link to={isEdit ? '/account/my-listings' : '/account'} className="btn-outline btn-inline">Cancel</Link>
        </div>
      </div>
    </div></div>
  );
}
