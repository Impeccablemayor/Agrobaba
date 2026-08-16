import type { Role } from '../../types';

export type StepId =
  | 'intro'
  | 'enterpriseSelect'
  | 'dealerTypeSelect'
  | 'providerTypeSelect'
  | 'specializationSelect'
  | 'activitiesSelect'
  | 'farmerNeedsSelect'
  | 'farmerNeedsDrillSelect'
  | 'buyerTypeSelect'
  | 'buyingPurposeSelect'
  | 'needsSectionSelect'
  | 'needsCategorySelect'
  | 'needsSubcategorySelect'
  | 'equipmentServiceIntent'
  | 'preferencesSelect'
  | 'farmScaleSelect'
  | 'farmerPreferencesSelect'
  | 'scaleFrequencySelect'
  | 'locationDeliverySelect'
  | 'dealerActivitiesSelect'
  | 'customerTypesSelect'
  | 'dealerNeedsSelect'
  | 'dealerNeedsDrillSelect'
  | 'salesModelSelect'
  | 'stockRestockingSelect'
  | 'dealerLocationSelect'
  | 'dealerPreferencesSelect'
  | 'equipmentResourcesSelect'
  | 'serviceDeliveryModeSelect'
  | 'providerCustomerTypesSelect'
  | 'serviceAreaSelect'
  | 'pricingModelSelect'
  | 'availabilitySelect'
  | 'serviceCapacitySelect'
  | 'providerNeedsSelect'
  | 'providerNeedsDrillSelect'
  | 'summary';

/** Live wizard state needed to decide which conditional steps apply (dynamic branching,
 *  per the Buyer/Farmer/Agro-dealer/Service-Provider personalization specs). Kept
 *  intentionally small - just enough to branch, not full form state. Unused fields per role
 *  are harmless. */
export interface OnboardingAnswers {
  /** Buyer: section-level codes picked in needsSectionSelect (e.g. 'equipment', 'services'). */
  needSectionCodes: string[];
  /** Buyer: whether any level-2 need category picked in needsCategorySelect has children. */
  hasSubcategoryOptions: boolean;
  /** Farmer: whether any level-2 need category picked in farmerNeedsSelect has children. */
  hasFarmerNeedsDrillOptions: boolean;
  /** Farmer: whether any selected need category's section is 'equipment' or 'services'. */
  farmerNeedsTouchesEquipOrService: boolean;
  /** Agro-dealer: whether any level-2 need category picked in dealerNeedsSelect has children. */
  hasDealerNeedsDrillOptions: boolean;
  /** Service-provider: whether any level-2 need category picked in providerNeedsSelect has children. */
  hasProviderNeedsDrillOptions: boolean;
}

/** The single place that decides step sequence per role - this is what makes the wizard one
 *  reusable flow instead of four separate forms; each step component itself is generic and
 *  reused across roles. Only buyer/farmer/agro-dealer/service-provider sequences react to
 *  live answers. */
export function getStepsForRole(role: Role, answers?: OnboardingAnswers): StepId[] {
  switch (role) {
    case 'farmer': {
      const steps: StepId[] = [
        'intro', 'enterpriseSelect', 'specializationSelect', 'activitiesSelect', 'farmerNeedsSelect',
      ];
      if (answers?.hasFarmerNeedsDrillOptions) steps.push('farmerNeedsDrillSelect');
      if (answers?.farmerNeedsTouchesEquipOrService) steps.push('equipmentServiceIntent');
      steps.push('farmScaleSelect', 'farmerPreferencesSelect', 'summary');
      return steps;
    }
    case 'agro-dealer': {
      const steps: StepId[] = [
        'intro', 'dealerTypeSelect', 'specializationSelect', 'dealerActivitiesSelect',
        'customerTypesSelect', 'dealerNeedsSelect',
      ];
      if (answers?.hasDealerNeedsDrillOptions) steps.push('dealerNeedsDrillSelect');
      steps.push('salesModelSelect', 'stockRestockingSelect', 'dealerLocationSelect', 'dealerPreferencesSelect', 'summary');
      return steps;
    }
    case 'service-provider': {
      const steps: StepId[] = [
        'intro', 'providerTypeSelect', 'specializationSelect', 'equipmentResourcesSelect',
        'serviceDeliveryModeSelect', 'providerCustomerTypesSelect', 'serviceAreaSelect',
        'pricingModelSelect', 'availabilitySelect', 'serviceCapacitySelect', 'providerNeedsSelect',
      ];
      if (answers?.hasProviderNeedsDrillOptions) steps.push('providerNeedsDrillSelect');
      steps.push('summary');
      return steps;
    }
    case 'buyer': {
      const steps: StepId[] = [
        'intro', 'buyerTypeSelect', 'buyingPurposeSelect', 'needsSectionSelect', 'needsCategorySelect',
      ];
      if (answers?.hasSubcategoryOptions) steps.push('needsSubcategorySelect');
      const sections = answers?.needSectionCodes ?? [];
      if (sections.includes('equipment') || sections.includes('services')) steps.push('equipmentServiceIntent');
      steps.push('preferencesSelect', 'scaleFrequencySelect', 'locationDeliverySelect', 'summary');
      return steps;
    }
    default:
      return ['intro', 'summary'];
  }
}
