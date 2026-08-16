import { showToast } from './toastBus';
import { api } from './api';
import type { PersonalizationProfile, PersonalizationTaxonomy, ProfileStatus, Role, ListingKind } from '../types';

export interface SavePersonalizationInput {
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
}

interface ApiPersonalizationProfile {
  userId: number;
  primaryRole: string;
  status: string;
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
  updatedAt: string | null;
  defaults: { suggestedSectionCodes: string[]; suggestedListingKinds: string[] };
}

function mapProfile(r: ApiPersonalizationProfile): PersonalizationProfile {
  return {
    userId: String(r.userId),
    primaryRole: r.primaryRole as Role,
    status: r.status as ProfileStatus,
    offerGroups: r.offerGroups || [],
    offerCategoryCodes: r.offerCategoryCodes || [],
    offerOther: r.offerOther || [],
    buyerTypes: r.buyerTypes || [],
    buyerTypeOther: r.buyerTypeOther || [],
    buyingPurposes: r.buyingPurposes || [],
    buyingPurposeOther: r.buyingPurposeOther || [],
    needCategoryCodes: r.needCategoryCodes || [],
    needOther: r.needOther || [],
    preferredListingKinds: (r.preferredListingKinds || []) as ListingKind[],
    buyingPreferences: r.buyingPreferences || [],
    purchaseScale: r.purchaseScale,
    purchaseFrequency: r.purchaseFrequency,
    sourcingAreaPreference: r.sourcingAreaPreference,
    fulfillmentPreference: r.fulfillmentPreference,
    farmerActivities: r.farmerActivities || [],
    farmerActivityOther: r.farmerActivityOther || [],
    farmScale: r.farmScale,
    farmerPreferences: r.farmerPreferences || [],
    dealerActivities: r.dealerActivities || [],
    dealerActivityOther: r.dealerActivityOther || [],
    dealerCustomerTypes: r.dealerCustomerTypes || [],
    dealerCustomerTypeOther: r.dealerCustomerTypeOther || [],
    salesModel: r.salesModel,
    restockingFrequency: r.restockingFrequency,
    sourcingQuantity: r.sourcingQuantity,
    localSourcingPreference: r.localSourcingPreference,
    deliveryNeeded: r.deliveryNeeded,
    operatingArea: r.operatingArea,
    deliveryCoverage: r.deliveryCoverage,
    dealerPreferences: r.dealerPreferences || [],
    providerEquipment: r.providerEquipment || [],
    providerEquipmentOther: r.providerEquipmentOther || [],
    serviceDeliveryMode: r.serviceDeliveryMode || [],
    serviceDeliveryModeOther: r.serviceDeliveryModeOther || [],
    providerCustomerTypes: r.providerCustomerTypes || [],
    providerCustomerTypeOther: r.providerCustomerTypeOther || [],
    serviceOperatingArea: r.serviceOperatingArea,
    serviceAreaDetails: r.serviceAreaDetails || [],
    pricingModel: r.pricingModel || [],
    availability: r.availability || [],
    serviceCapacity: r.serviceCapacity,
    updatedAt: r.updatedAt,
    defaults: {
      suggestedSectionCodes: r.defaults?.suggestedSectionCodes || [],
      suggestedListingKinds: (r.defaults?.suggestedListingKinds || []) as ListingKind[],
    },
  };
}

export async function getMyPersonalizationProfile(): Promise<PersonalizationProfile | null> {
  try {
    return mapProfile(await api.get<ApiPersonalizationProfile>('/api/profile/personalization'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load your personalization profile';
    showToast(message, 'error');
    return null;
  }
}

export async function getPersonalizationTaxonomy(): Promise<PersonalizationTaxonomy | null> {
  try {
    return await api.get<PersonalizationTaxonomy>('/api/personalization/taxonomy');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load personalization options';
    showToast(message, 'error');
    return null;
  }
}

export async function savePersonalizationProfile(input: SavePersonalizationInput): Promise<PersonalizationProfile | false> {
  try {
    const result = await api.put<ApiPersonalizationProfile>('/api/profile/personalization', input);
    showToast('Your preferences have been saved.', 'success');
    return mapProfile(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save your preferences';
    showToast(message, 'error');
    return false;
  }
}

export async function skipPersonalization(): Promise<PersonalizationProfile | false> {
  try {
    const result = await api.post<ApiPersonalizationProfile>('/api/profile/personalization/skip');
    return mapProfile(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to skip for now';
    showToast(message, 'error');
    return false;
  }
}
