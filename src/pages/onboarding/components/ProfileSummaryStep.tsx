import type { Category, PersonalizationTaxonomy, Role, TaxonomyOption } from '../../../types';

interface ProfileSummaryStepProps {
  role: Role;
  categories: Category[];
  taxonomy: PersonalizationTaxonomy | null;
  offerGroups: string[];
  offerCategoryCodes: string[];
  offerOther: string[];
  buyerTypes: string[];
  buyerTypeOther: string[];
  buyingPurposes: string[];
  buyingPurposeOther: string[];
  needCategoryCodes: string[];
  needOther: string[];
  preferredListingKinds: string[];
  buyingPreferences: string[];
  purchaseScale: string | null;
  purchaseFrequency: string | null;
  sourcingAreaPreference: string | null;
  fulfillmentPreference: string | null;
  farmerActivities: string[];
  farmerActivityOther: string[];
  farmScale: string | null;
  farmerPreferences: string[];
  dealerActivities: string[];
  dealerActivityOther: string[];
  dealerCustomerTypes: string[];
  dealerCustomerTypeOther: string[];
  salesModel: string | null;
  restockingFrequency: string | null;
  sourcingQuantity: string | null;
  localSourcingPreference: string | null;
  deliveryNeeded: string | null;
  operatingArea: string | null;
  deliveryCoverage: string | null;
  dealerPreferences: string[];
  providerEquipment: string[];
  providerEquipmentOther: string[];
  serviceDeliveryMode: string[];
  serviceDeliveryModeOther: string[];
  providerCustomerTypes: string[];
  providerCustomerTypeOther: string[];
  serviceOperatingArea: string | null;
  serviceAreaDetails: string[];
  pricingModel: string[];
  availability: string[];
  serviceCapacity: string | null;
  saving: boolean;
  onSave: () => void;
}

const LISTING_KIND_LABELS: Record<string, string> = {
  equipment_sale: 'Buy Equipment',
  equipment_hire: 'Hire Equipment',
  service_booking: 'Find / Book a Service',
};

function groupOptionsForRole(role: Role, taxonomy: PersonalizationTaxonomy | null): TaxonomyOption[] {
  if (!taxonomy) return [];
  if (role === 'farmer') return taxonomy.enterprises;
  if (role === 'agro-dealer') return taxonomy.dealerProductTypes;
  if (role === 'service-provider') return taxonomy.providerServiceTypes;
  return [];
}

function labelsFor(codes: string[], options: TaxonomyOption[]): string[] {
  return codes.map((code) => options.find((o) => o.code === code)?.label || code);
}

function Row({ icon, label, values }: { icon: string; label: string; values: string[] }) {
  if (values.length === 0) return null;
  return (
    <div className="onboard-summary-row">
      <div className="onboard-summary-row-label"><i className={`fa-solid ${icon}`}></i> {label}</div>
      <div className="onboard-summary-chips">
        {values.map((v) => (
          <span key={v} className="onboard-chip">{v}</span>
        ))}
      </div>
    </div>
  );
}

export function ProfileSummaryStep({
  role, categories, taxonomy, offerGroups, offerCategoryCodes, offerOther,
  buyerTypes, buyerTypeOther, buyingPurposes, buyingPurposeOther,
  needCategoryCodes, needOther, preferredListingKinds, buyingPreferences,
  purchaseScale, purchaseFrequency, sourcingAreaPreference, fulfillmentPreference,
  farmerActivities, farmerActivityOther, farmScale, farmerPreferences,
  dealerActivities, dealerActivityOther, dealerCustomerTypes, dealerCustomerTypeOther,
  salesModel, restockingFrequency, sourcingQuantity, localSourcingPreference,
  deliveryNeeded, operatingArea, deliveryCoverage, dealerPreferences,
  providerEquipment, providerEquipmentOther, serviceDeliveryMode, serviceDeliveryModeOther,
  providerCustomerTypes, providerCustomerTypeOther, serviceOperatingArea, serviceAreaDetails,
  pricingModel, availability, serviceCapacity,
  saving, onSave,
}: ProfileSummaryStepProps) {
  const groupOptions = groupOptionsForRole(role, taxonomy);
  const groupLabels = labelsFor(offerGroups, groupOptions);
  const offerCategoryNames = offerCategoryCodes.map((code) => categories.find((c) => c.code === code)?.name || code);
  const needCategoryNames = needCategoryCodes.map((code) => categories.find((c) => c.code === code)?.name || code);
  const buyerTypeLabels = labelsFor(buyerTypes, taxonomy?.buyerTypes || []);
  const buyingPurposeLabels = labelsFor(buyingPurposes, taxonomy?.buyingPurposes || []);
  const listingKindLabels = preferredListingKinds.map((k) => LISTING_KIND_LABELS[k] || k);
  const preferenceLabels = labelsFor(buyingPreferences, taxonomy?.buyingPreferences || []);
  const scaleLabel = taxonomy?.purchaseScaleOptions.find((o) => o.code === purchaseScale)?.label;
  const frequencyLabel = taxonomy?.purchaseFrequencyOptions.find((o) => o.code === purchaseFrequency)?.label;
  const sourcingLabel = taxonomy?.sourcingAreaOptions.find((o) => o.code === sourcingAreaPreference)?.label;
  const fulfillmentLabel = taxonomy?.fulfillmentOptions.find((o) => o.code === fulfillmentPreference)?.label;
  const scaleFrequency = [scaleLabel, frequencyLabel].filter(Boolean) as string[];
  const sourcingFulfillment = [sourcingLabel, fulfillmentLabel].filter(Boolean) as string[];
  const activityLabels = labelsFor(farmerActivities, taxonomy?.farmerActivities || []);
  const farmScaleLabel = taxonomy?.farmScaleOptions.find((o) => o.code === farmScale)?.label;
  const farmScaleValues = farmScaleLabel ? [farmScaleLabel] : [];
  const farmerPreferenceLabels = labelsFor(farmerPreferences, taxonomy?.farmerPreferences || []);
  const dealerActivityLabels = labelsFor(dealerActivities, taxonomy?.dealerActivities || []);
  const dealerCustomerTypeLabels = labelsFor(dealerCustomerTypes, taxonomy?.dealerCustomerTypes || []);
  const salesModelLabel = taxonomy?.salesModelOptions.find((o) => o.code === salesModel)?.label;
  const restockingLabel = taxonomy?.restockingFrequencyOptions.find((o) => o.code === restockingFrequency)?.label;
  const sourcingQtyLabel = taxonomy?.sourcingQuantityOptions.find((o) => o.code === sourcingQuantity)?.label;
  const localSourcingLabel = taxonomy?.localSourcingPreferenceOptions.find((o) => o.code === localSourcingPreference)?.label;
  const deliveryNeededLabel = taxonomy?.deliveryNeededOptions.find((o) => o.code === deliveryNeeded)?.label;
  const operatingAreaLabel = taxonomy?.operatingAreaOptions.find((o) => o.code === operatingArea)?.label;
  const deliveryCoverageLabel = taxonomy?.deliveryCoverageOptions.find((o) => o.code === deliveryCoverage)?.label;
  const restockingPrefsValues = [restockingLabel, sourcingQtyLabel, localSourcingLabel, deliveryNeededLabel].filter(Boolean) as string[];
  const dealerLocationValues = [operatingAreaLabel, deliveryCoverageLabel].filter(Boolean) as string[];
  const dealerPreferenceLabels = labelsFor(dealerPreferences, taxonomy?.dealerPreferences || []);
  const providerEquipmentLabels = labelsFor(providerEquipment, taxonomy?.providerEquipmentOptions || []);
  const serviceDeliveryModeLabels = labelsFor(serviceDeliveryMode, taxonomy?.serviceDeliveryModeOptions || []);
  const providerCustomerTypeLabels = labelsFor(providerCustomerTypes, taxonomy?.providerCustomerTypes || []);
  const serviceOperatingAreaLabel = taxonomy?.serviceOperatingAreaOptions.find((o) => o.code === serviceOperatingArea)?.label;
  const serviceAreaValues = [serviceOperatingAreaLabel, ...serviceAreaDetails].filter(Boolean) as string[];
  const pricingModelLabels = labelsFor(pricingModel, taxonomy?.pricingModelOptions || []);
  const availabilityLabels = labelsFor(availability, taxonomy?.availabilityOptions || []);
  const serviceCapacityLabel = taxonomy?.serviceCapacityOptions.find((o) => o.code === serviceCapacity)?.label;
  const serviceCapacityValues = serviceCapacityLabel ? [serviceCapacityLabel] : [];

  const isEmpty = groupLabels.length === 0 && offerCategoryNames.length === 0 && offerOther.length === 0
    && buyerTypeLabels.length === 0 && buyingPurposeLabels.length === 0
    && needCategoryNames.length === 0 && needOther.length === 0 && listingKindLabels.length === 0
    && preferenceLabels.length === 0 && scaleFrequency.length === 0 && sourcingFulfillment.length === 0
    && activityLabels.length === 0 && farmerActivityOther.length === 0 && farmScaleValues.length === 0
    && farmerPreferenceLabels.length === 0 && dealerActivityLabels.length === 0
    && dealerCustomerTypeLabels.length === 0 && !salesModelLabel && restockingPrefsValues.length === 0
    && dealerLocationValues.length === 0 && dealerPreferenceLabels.length === 0
    && providerEquipmentLabels.length === 0 && providerEquipmentOther.length === 0
    && serviceDeliveryModeLabels.length === 0 && providerCustomerTypeLabels.length === 0
    && serviceAreaValues.length === 0 && pricingModelLabels.length === 0
    && availabilityLabels.length === 0 && serviceCapacityValues.length === 0;

  return (
    <div>
      <h2 className="onboard-heading">You're all set</h2>
      <p className="onboard-subheading">
        Here's what we'll use to personalize your experience. You can change any of this anytime from your
        profile.
      </p>

      {isEmpty ? (
        <div className="onboard-summary-empty">
          <i className="fa-regular fa-face-smile" style={{ fontSize: 22, display: 'block', marginBottom: 8, color: 'var(--border-mid)' }}></i>
          Nothing selected yet — that's okay, you can always fill this in later.
        </div>
      ) : (
        <div className="onboard-summary-group">
          <Row icon="fa-layer-group" label="Focus areas" values={groupLabels} />
          <Row icon="fa-tags" label="Specializations" values={offerCategoryNames} />
          <Row icon="fa-pen" label="Other specializations" values={offerOther} />
          <Row icon="fa-bullseye" label="Use AgroBaba for" values={activityLabels} />
          <Row icon="fa-pen" label="Other activity" values={farmerActivityOther} />
          <Row icon="fa-user-tag" label="Buyer types" values={buyerTypeLabels} />
          <Row icon="fa-pen" label="Other buyer type" values={buyerTypeOther} />
          <Row icon="fa-bullseye" label="Buying for" values={buyingPurposeLabels} />
          <Row icon="fa-pen" label="Other purpose" values={buyingPurposeOther} />
          <Row icon="fa-basket-shopping" label="Interested in" values={needCategoryNames} />
          <Row icon="fa-pen" label="Other interests" values={needOther} />
          <Row icon="fa-tractor" label="Equipment / service intent" values={listingKindLabels} />
          <Row icon="fa-star" label="What matters most" values={preferenceLabels} />
          <Row icon="fa-scale-balanced" label="Purchase scale & frequency" values={scaleFrequency} />
          <Row icon="fa-truck" label="Sourcing & fulfillment" values={sourcingFulfillment} />
          <Row icon="fa-ruler-combined" label="Farm scale" values={farmScaleValues} />
          <Row icon="fa-star" label="What matters most to you" values={farmerPreferenceLabels} />
          <Row icon="fa-bullseye" label="Use AgroBaba for" values={dealerActivityLabels} />
          <Row icon="fa-pen" label="Other activity" values={dealerActivityOther} />
          <Row icon="fa-users" label="Main customers" values={dealerCustomerTypeLabels} />
          <Row icon="fa-pen" label="Other customer type" values={dealerCustomerTypeOther} />
          <Row icon="fa-store" label="Sales model" values={salesModelLabel ? [salesModelLabel] : []} />
          <Row icon="fa-boxes-stacked" label="Stock & restocking" values={restockingPrefsValues} />
          <Row icon="fa-truck" label="Location & delivery" values={dealerLocationValues} />
          <Row icon="fa-star" label="What matters most to you" values={dealerPreferenceLabels} />
          <Row icon="fa-toolbox" label="Equipment / resources" values={providerEquipmentLabels} />
          <Row icon="fa-pen" label="Other equipment" values={providerEquipmentOther} />
          <Row icon="fa-truck-fast" label="Service delivery mode" values={serviceDeliveryModeLabels} />
          <Row icon="fa-pen" label="Other delivery mode" values={serviceDeliveryModeOther} />
          <Row icon="fa-users" label="Who you serve" values={providerCustomerTypeLabels} />
          <Row icon="fa-pen" label="Other customer type" values={providerCustomerTypeOther} />
          <Row icon="fa-map-location-dot" label="Service area" values={serviceAreaValues} />
          <Row icon="fa-tag" label="Pricing model" values={pricingModelLabels} />
          <Row icon="fa-calendar-check" label="Availability" values={availabilityLabels} />
          <Row icon="fa-ruler-combined" label="Service capacity" values={serviceCapacityValues} />
        </div>
      )}

      <button type="button" className="btn-primary w-100" disabled={saving} onClick={onSave}>
        <i className="fa-solid fa-check"></i> {saving ? 'Saving…' : 'Save & Finish'}
      </button>
    </div>
  );
}
