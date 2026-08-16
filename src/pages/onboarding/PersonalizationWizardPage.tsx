import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCategories, getChildren } from '../../lib/categories';
import { getMyPersonalizationProfile, getPersonalizationTaxonomy, savePersonalizationProfile, skipPersonalization } from '../../lib/personalization';
import { showToast } from '../../lib/toastBus';
import type { Category, PersonalizationTaxonomy, ProfileStatus, TaxonomyOption } from '../../types';
import { PageLoadingSpinner } from '../../components/LoadingSpinner';
import { getStepsForRole } from './onboardingSteps';
import { RoleIntroStep } from './components/RoleIntroStep';
import { GroupSelector } from './components/GroupSelector';
import { SpecializationSelector } from './components/SpecializationSelector';
import { NeedsSelector } from './components/NeedsSelector';
import { TileMultiSelectStep } from './components/TileMultiSelectStep';
import { ScaleFrequencyStep } from './components/ScaleFrequencyStep';
import { LocationDeliveryStep } from './components/LocationDeliveryStep';
import { SingleTileSelectStep } from './components/SingleTileSelectStep';
import { MultiSingleSelectStep } from './components/MultiSingleSelectStep';
import { ServiceAreaStep } from './components/ServiceAreaStep';
import { ProfileSummaryStep } from './components/ProfileSummaryStep';

/** Buckets a flat category-code list back into 1/2/3 by each code's real tree depth, so
 *  resuming an in-progress profile re-populates the right drill-down step. Shared between
 *  buyer needs and farmer needs - same shape, different consuming state. */
function bucketByLevel(codes: string[], categories: Category[]): Record<1 | 2 | 3, string[]> {
  const byLevel: Record<1 | 2 | 3, string[]> = { 1: [], 2: [], 3: [] };
  for (const code of codes) {
    const level = categories.find((c) => c.code === code)?.level;
    if (level === 1 || level === 2 || level === 3) byLevel[level].push(code);
  }
  return byLevel;
}

export default function PersonalizationWizardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [taxonomy, setTaxonomy] = useState<PersonalizationTaxonomy | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);
  const [jumpedToSummary, setJumpedToSummary] = useState(false);

  // Seller ("offer") fields - unchanged from Phase 1.
  const [offerGroups, setOfferGroups] = useState<string[]>([]);
  const [offerCategoryCodes, setOfferCategoryCodes] = useState<string[]>([]);
  const [offerOther, setOfferOther] = useState<string[]>([]);

  // Buyer fields.
  const [buyerTypes, setBuyerTypes] = useState<string[]>([]);
  const [buyerTypeOther, setBuyerTypeOther] = useState<string[]>([]);
  const [buyingPurposes, setBuyingPurposes] = useState<string[]>([]);
  const [buyingPurposeOther, setBuyingPurposeOther] = useState<string[]>([]);
  const [needSectionCodes, setNeedSectionCodes] = useState<string[]>([]);
  const [needCategoryLevel2Codes, setNeedCategoryLevel2Codes] = useState<string[]>([]);
  const [needCategoryLevel3Codes, setNeedCategoryLevel3Codes] = useState<string[]>([]);
  const [needOther, setNeedOther] = useState<string[]>([]);
  const [preferredListingKinds, setPreferredListingKinds] = useState<string[]>([]);
  const [buyingPreferences, setBuyingPreferences] = useState<string[]>([]);
  const [purchaseScale, setPurchaseScale] = useState<string | null>(null);
  const [purchaseFrequency, setPurchaseFrequency] = useState<string | null>(null);
  const [sourcingAreaPreference, setSourcingAreaPreference] = useState<string | null>(null);
  const [fulfillmentPreference, setFulfillmentPreference] = useState<string | null>(null);

  // Farmer fields. Needs share the same needOther/preferredListingKinds state as buyers -
  // a given profile row belongs to exactly one role, so there's no cross-role collision.
  const [farmerActivities, setFarmerActivities] = useState<string[]>([]);
  const [farmerActivityOther, setFarmerActivityOther] = useState<string[]>([]);
  const [farmerNeedLevel2Codes, setFarmerNeedLevel2Codes] = useState<string[]>([]);
  const [farmerNeedLevel3Codes, setFarmerNeedLevel3Codes] = useState<string[]>([]);
  const [farmScale, setFarmScale] = useState<string | null>(null);
  const [farmerPreferences, setFarmerPreferences] = useState<string[]>([]);

  // Agro-dealer fields. Needs share needOther the same way farmer/buyer needs do.
  const [dealerActivities, setDealerActivities] = useState<string[]>([]);
  const [dealerActivityOther, setDealerActivityOther] = useState<string[]>([]);
  const [dealerCustomerTypes, setDealerCustomerTypes] = useState<string[]>([]);
  const [dealerCustomerTypeOther, setDealerCustomerTypeOther] = useState<string[]>([]);
  const [dealerNeedLevel2Codes, setDealerNeedLevel2Codes] = useState<string[]>([]);
  const [dealerNeedLevel3Codes, setDealerNeedLevel3Codes] = useState<string[]>([]);
  const [salesModel, setSalesModel] = useState<string | null>(null);
  const [restockingFrequency, setRestockingFrequency] = useState<string | null>(null);
  const [sourcingQuantity, setSourcingQuantity] = useState<string | null>(null);
  const [localSourcingPreference, setLocalSourcingPreference] = useState<string | null>(null);
  const [deliveryNeeded, setDeliveryNeeded] = useState<string | null>(null);
  const [operatingArea, setOperatingArea] = useState<string | null>(null);
  const [deliveryCoverage, setDeliveryCoverage] = useState<string | null>(null);
  const [dealerPreferences, setDealerPreferences] = useState<string[]>([]);

  // Service-provider fields. Needs share needOther the same way farmer/dealer needs do.
  const [providerEquipment, setProviderEquipment] = useState<string[]>([]);
  const [providerEquipmentOther, setProviderEquipmentOther] = useState<string[]>([]);
  const [serviceDeliveryMode, setServiceDeliveryMode] = useState<string[]>([]);
  const [serviceDeliveryModeOther, setServiceDeliveryModeOther] = useState<string[]>([]);
  const [providerCustomerTypes, setProviderCustomerTypes] = useState<string[]>([]);
  const [providerCustomerTypeOther, setProviderCustomerTypeOther] = useState<string[]>([]);
  const [serviceOperatingArea, setServiceOperatingArea] = useState<string | null>(null);
  const [serviceAreaDetails, setServiceAreaDetails] = useState<string[]>([]);
  const [pricingModel, setPricingModel] = useState<string[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [serviceCapacity, setServiceCapacity] = useState<string | null>(null);
  const [providerNeedLevel2Codes, setProviderNeedLevel2Codes] = useState<string[]>([]);
  const [providerNeedLevel3Codes, setProviderNeedLevel3Codes] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [cats, tax, profile] = await Promise.all([
        getCategories(),
        getPersonalizationTaxonomy(),
        getMyPersonalizationProfile(),
      ]);
      if (!active) return;
      setCategories(cats);
      setTaxonomy(tax);
      setProfileStatus(profile?.status ?? null);
      if (profile) {
        setOfferGroups(profile.offerGroups);
        setOfferCategoryCodes(profile.offerCategoryCodes);
        setOfferOther(profile.offerOther);
        setBuyerTypes(profile.buyerTypes);
        setBuyerTypeOther(profile.buyerTypeOther);
        setBuyingPurposes(profile.buyingPurposes);
        setBuyingPurposeOther(profile.buyingPurposeOther);
        // Bucket the flat persisted need-list back into section/category/subcategory by each
        // code's real tree depth, so resuming later re-populates the right drill-down step.
        // Role-conditional: buyers have a user-picked section level, farmers/dealers/providers don't.
        const byLevel = bucketByLevel(profile.needCategoryCodes, cats);
        if (profile.primaryRole === 'farmer') {
          setFarmerNeedLevel2Codes(byLevel[2]);
          setFarmerNeedLevel3Codes(byLevel[3]);
        } else if (profile.primaryRole === 'agro-dealer') {
          setDealerNeedLevel2Codes(byLevel[2]);
          setDealerNeedLevel3Codes(byLevel[3]);
        } else if (profile.primaryRole === 'service-provider') {
          setProviderNeedLevel2Codes(byLevel[2]);
          setProviderNeedLevel3Codes(byLevel[3]);
        } else {
          setNeedSectionCodes(byLevel[1]);
          setNeedCategoryLevel2Codes(byLevel[2]);
          setNeedCategoryLevel3Codes(byLevel[3]);
        }
        setNeedOther(profile.needOther);
        setPreferredListingKinds(profile.preferredListingKinds);
        setBuyingPreferences(profile.buyingPreferences);
        setPurchaseScale(profile.purchaseScale);
        setPurchaseFrequency(profile.purchaseFrequency);
        setSourcingAreaPreference(profile.sourcingAreaPreference);
        setFulfillmentPreference(profile.fulfillmentPreference);
        setFarmerActivities(profile.farmerActivities);
        setFarmerActivityOther(profile.farmerActivityOther);
        setFarmScale(profile.farmScale);
        setFarmerPreferences(profile.farmerPreferences);
        setDealerActivities(profile.dealerActivities);
        setDealerActivityOther(profile.dealerActivityOther);
        setDealerCustomerTypes(profile.dealerCustomerTypes);
        setDealerCustomerTypeOther(profile.dealerCustomerTypeOther);
        setSalesModel(profile.salesModel);
        setRestockingFrequency(profile.restockingFrequency);
        setSourcingQuantity(profile.sourcingQuantity);
        setLocalSourcingPreference(profile.localSourcingPreference);
        setDeliveryNeeded(profile.deliveryNeeded);
        setOperatingArea(profile.operatingArea);
        setDeliveryCoverage(profile.deliveryCoverage);
        setDealerPreferences(profile.dealerPreferences);
        setProviderEquipment(profile.providerEquipment);
        setProviderEquipmentOther(profile.providerEquipmentOther);
        setServiceDeliveryMode(profile.serviceDeliveryMode);
        setServiceDeliveryModeOther(profile.serviceDeliveryModeOther);
        setProviderCustomerTypes(profile.providerCustomerTypes);
        setProviderCustomerTypeOther(profile.providerCustomerTypeOther);
        setServiceOperatingArea(profile.serviceOperatingArea);
        setServiceAreaDetails(profile.serviceAreaDetails);
        setPricingModel(profile.pricingModel);
        setAvailability(profile.availability);
        setServiceCapacity(profile.serviceCapacity);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const groupOptions: TaxonomyOption[] = useMemo(() => {
    if (!user || !taxonomy) return [];
    if (user.role === 'farmer') return taxonomy.enterprises;
    if (user.role === 'agro-dealer') return taxonomy.dealerProductTypes;
    if (user.role === 'service-provider') return taxonomy.providerServiceTypes;
    return [];
  }, [user, taxonomy]);
  const groupCategoryCodes = useMemo(
    () => groupOptions.filter((o) => offerGroups.includes(o.code)).flatMap((o) => o.categoryCodes),
    [groupOptions, offerGroups]
  );

  const sortedPurposeOptions: TaxonomyOption[] = useMemo(() => {
    if (!taxonomy) return [];
    const relevant = new Set<string>();
    for (const bt of buyerTypes) {
      (taxonomy.purposesByBuyerType[bt] || []).forEach((p) => relevant.add(p));
    }
    const first = taxonomy.buyingPurposes.filter((o) => relevant.has(o.code));
    const rest = taxonomy.buyingPurposes.filter((o) => !relevant.has(o.code));
    return [...first, ...rest];
  }, [taxonomy, buyerTypes]);

  const hasSubcategoryOptions = useMemo(
    () => categories.some((c) => needCategoryLevel2Codes.includes(c.code) && getChildren(categories, c.id).length > 0),
    [categories, needCategoryLevel2Codes]
  );

  const hasFarmerNeedsDrillOptions = useMemo(
    () => categories.some((c) => farmerNeedLevel2Codes.includes(c.code) && getChildren(categories, c.id).length > 0),
    [categories, farmerNeedLevel2Codes]
  );

  const farmerNeedsTouchesEquipOrService = useMemo(() => {
    const allFarmerNeeds = [...farmerNeedLevel2Codes, ...farmerNeedLevel3Codes];
    return categories.some((c) => allFarmerNeeds.includes(c.code) && (c.section === 'equipment' || c.section === 'services'));
  }, [categories, farmerNeedLevel2Codes, farmerNeedLevel3Codes]);

  const hasDealerNeedsDrillOptions = useMemo(
    () => categories.some((c) => dealerNeedLevel2Codes.includes(c.code) && getChildren(categories, c.id).length > 0),
    [categories, dealerNeedLevel2Codes]
  );

  const hasProviderNeedsDrillOptions = useMemo(
    () => categories.some((c) => providerNeedLevel2Codes.includes(c.code) && getChildren(categories, c.id).length > 0),
    [categories, providerNeedLevel2Codes]
  );

  const steps = useMemo(
    () => (user ? getStepsForRole(user.role, {
      needSectionCodes, hasSubcategoryOptions, hasFarmerNeedsDrillOptions, farmerNeedsTouchesEquipOrService,
      hasDealerNeedsDrillOptions, hasProviderNeedsDrillOptions,
    }) : []),
    [user, needSectionCodes, hasSubcategoryOptions, hasFarmerNeedsDrillOptions, farmerNeedsTouchesEquipOrService, hasDealerNeedsDrillOptions, hasProviderNeedsDrillOptions]
  );

  useEffect(() => {
    if (stepIndex >= steps.length && steps.length > 0) {
      setStepIndex(steps.length - 1);
    }
  }, [steps, stepIndex]);

  // A completed profile means there's something to review - land on the summary instead of
  // forcing a full click-through from the intro. One-shot (jumpedToSummary) so navigating back
  // off summary afterward isn't immediately overridden back to it by this same effect.
  // steps is a useMemo derived from the profile data loaded above, so it isn't ready
  // synchronously within that load effect - this has to be a separate effect that reacts to it.
  useEffect(() => {
    if (!jumpedToSummary && profileStatus === 'completed' && steps.length > 0) {
      setStepIndex(steps.length - 1);
      setJumpedToSummary(true);
    }
  }, [profileStatus, steps, jumpedToSummary]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="onboard-page">
        <PageLoadingSpinner message="Loading personalization…" />
      </div>
    );
  }

  async function handleSkip() {
    await skipPersonalization();
    navigate('/account');
  }

  async function handleSave() {
    setSaving(true);
    // Only one role's arrays are ever populated at a time (load bucketing and each step's
    // own state setters are role-scoped), so concatenating all of them is safe.
    const needCategoryCodes = [
      ...needSectionCodes, ...needCategoryLevel2Codes, ...needCategoryLevel3Codes,
      ...farmerNeedLevel2Codes, ...farmerNeedLevel3Codes,
      ...dealerNeedLevel2Codes, ...dealerNeedLevel3Codes,
      ...providerNeedLevel2Codes, ...providerNeedLevel3Codes,
    ];
    const result = await savePersonalizationProfile({
      offerGroups, offerCategoryCodes, offerOther,
      buyerTypes, buyerTypeOther,
      buyingPurposes, buyingPurposeOther,
      needCategoryCodes, needOther,
      preferredListingKinds,
      buyingPreferences,
      purchaseScale, purchaseFrequency,
      sourcingAreaPreference, fulfillmentPreference,
      farmerActivities, farmerActivityOther,
      farmScale, farmerPreferences,
      dealerActivities, dealerActivityOther,
      dealerCustomerTypes, dealerCustomerTypeOther,
      salesModel, restockingFrequency, sourcingQuantity, localSourcingPreference,
      deliveryNeeded, operatingArea, deliveryCoverage, dealerPreferences,
      providerEquipment, providerEquipmentOther,
      serviceDeliveryMode, serviceDeliveryModeOther,
      providerCustomerTypes, providerCustomerTypeOther,
      serviceOperatingArea, serviceAreaDetails,
      pricingModel, availability, serviceCapacity,
    });
    setSaving(false);
    if (result) navigate('/account');
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  }
  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  const step = steps[stepIndex];

  function requireSelection(value: string[] | string | null, message: string): boolean {
    const empty = Array.isArray(value) ? value.length === 0 : !value;
    if (empty) {
      showToast(message, 'error');
      return false;
    }
    return true;
  }

  function renderStep() {
    switch (step) {
      case 'intro':
        return <RoleIntroStep role={user!.role} onNext={goNext} onSkip={handleSkip} />;
      case 'enterpriseSelect':
        return (
          <GroupSelector
            title="What kind of farming do you do?"
            subtitle="Select everything that applies — many farmers run more than one."
            options={groupOptions}
            selected={offerGroups}
            onChange={setOfferGroups}
            otherValues={offerOther}
            onOtherChange={setOfferOther}
            otherPlaceholder="e.g. Beekeeping"
          />
        );
      case 'dealerTypeSelect':
        return (
          <GroupSelector
            title="What type of agricultural products do you deal in?"
            subtitle="Select everything that applies."
            options={groupOptions}
            selected={offerGroups}
            onChange={setOfferGroups}
            otherValues={offerOther}
            onOtherChange={setOfferOther}
          />
        );
      case 'providerTypeSelect':
        return (
          <GroupSelector
            title="What agricultural services do you provide?"
            subtitle="Select everything that applies."
            options={groupOptions}
            selected={offerGroups}
            onChange={setOfferGroups}
            otherValues={offerOther}
            onOtherChange={setOfferOther}
            otherPlaceholder="e.g. Drone spraying"
          />
        );
      case 'specializationSelect':
        return (
          <SpecializationSelector
            categories={categories}
            groupCategoryCodes={groupCategoryCodes}
            selected={offerCategoryCodes}
            onChange={setOfferCategoryCodes}
            otherValues={offerOther}
            onOtherChange={setOfferOther}
          />
        );
      case 'activitiesSelect':
        return (
          <GroupSelector
            title="What do you use AgroBaba for?"
            subtitle="Select everything that applies — buying, selling, or both. A Farmer isn't automatically a seller."
            options={taxonomy?.farmerActivities || []}
            selected={farmerActivities}
            onChange={setFarmerActivities}
            otherValues={farmerActivityOther}
            onOtherChange={setFarmerActivityOther}
          />
        );
      case 'farmerNeedsSelect':
        return (
          <SpecializationSelector
            categories={categories}
            groupCategoryCodes={taxonomy?.farmerNeedSectionCodes || []}
            selected={farmerNeedLevel2Codes}
            onChange={setFarmerNeedLevel2Codes}
            otherValues={needOther}
            onOtherChange={setNeedOther}
          />
        );
      case 'farmerNeedsDrillSelect':
        return (
          <SpecializationSelector
            categories={categories}
            groupCategoryCodes={farmerNeedLevel2Codes}
            selected={farmerNeedLevel3Codes}
            onChange={setFarmerNeedLevel3Codes}
            otherValues={needOther}
            onOtherChange={setNeedOther}
          />
        );
      case 'farmScaleSelect':
        return (
          <SingleTileSelectStep
            title="What's the scale of your farm?"
            subtitle="This helps us match you with the right suppliers and buyers."
            options={taxonomy?.farmScaleOptions || []}
            selected={farmScale}
            onChange={setFarmScale}
          />
        );
      case 'farmerPreferencesSelect':
        return (
          <TileMultiSelectStep
            title="What matters most to you?"
            subtitle="Select everything that applies."
            options={taxonomy?.farmerPreferences || []}
            selected={farmerPreferences}
            onChange={setFarmerPreferences}
          />
        );
      case 'dealerActivitiesSelect':
        return (
          <GroupSelector
            title="What do you use AgroBaba for?"
            subtitle="Select everything that applies — an Agro-dealer isn't only a seller."
            options={taxonomy?.dealerActivities || []}
            selected={dealerActivities}
            onChange={setDealerActivities}
            otherValues={dealerActivityOther}
            onOtherChange={setDealerActivityOther}
          />
        );
      case 'customerTypesSelect':
        return (
          <GroupSelector
            title="Who are your main customers?"
            subtitle="Select everything that applies."
            options={taxonomy?.dealerCustomerTypes || []}
            selected={dealerCustomerTypes}
            onChange={setDealerCustomerTypes}
            otherValues={dealerCustomerTypeOther}
            onOtherChange={setDealerCustomerTypeOther}
          />
        );
      case 'dealerNeedsSelect':
        return (
          <SpecializationSelector
            categories={categories}
            groupCategoryCodes={taxonomy?.dealerNeedSectionCodes || []}
            selected={dealerNeedLevel2Codes}
            onChange={setDealerNeedLevel2Codes}
            otherValues={needOther}
            onOtherChange={setNeedOther}
          />
        );
      case 'dealerNeedsDrillSelect':
        return (
          <SpecializationSelector
            categories={categories}
            groupCategoryCodes={dealerNeedLevel2Codes}
            selected={dealerNeedLevel3Codes}
            onChange={setDealerNeedLevel3Codes}
            otherValues={needOther}
            onOtherChange={setNeedOther}
          />
        );
      case 'salesModelSelect':
        return (
          <SingleTileSelectStep
            title="How do you sell?"
            subtitle="Pick the one that fits best."
            options={taxonomy?.salesModelOptions || []}
            selected={salesModel}
            onChange={setSalesModel}
          />
        );
      case 'stockRestockingSelect':
        return (
          <MultiSingleSelectStep
            title="Stock & restocking preferences"
            subtitle="This helps us match you with the right supply opportunities."
            questions={[
              { label: 'How often do you restock?', options: taxonomy?.restockingFrequencyOptions || [], selected: restockingFrequency, onChange: setRestockingFrequency },
              { label: 'Typical sourcing quantity', options: taxonomy?.sourcingQuantityOptions || [], selected: sourcingQuantity, onChange: setSourcingQuantity },
              { label: 'Local sourcing preference', options: taxonomy?.localSourcingPreferenceOptions || [], selected: localSourcingPreference, onChange: setLocalSourcingPreference },
              { label: 'Delivery needed?', options: taxonomy?.deliveryNeededOptions || [], selected: deliveryNeeded, onChange: setDeliveryNeeded },
            ]}
          />
        );
      case 'dealerLocationSelect':
        return (
          <MultiSingleSelectStep
            title="Location & service area"
            subtitle="This influences ranking and recommendations — it never restricts your marketplace access."
            questions={[
              { label: 'Operating area', options: taxonomy?.operatingAreaOptions || [], selected: operatingArea, onChange: setOperatingArea },
              { label: 'Delivery coverage', options: taxonomy?.deliveryCoverageOptions || [], selected: deliveryCoverage, onChange: setDeliveryCoverage },
            ]}
          />
        );
      case 'dealerPreferencesSelect':
        return (
          <TileMultiSelectStep
            title="What matters most to you?"
            subtitle="Select everything that applies."
            options={taxonomy?.dealerPreferences || []}
            selected={dealerPreferences}
            onChange={setDealerPreferences}
          />
        );
      case 'equipmentResourcesSelect':
        return (
          <GroupSelector
            title="What equipment or resources do you have?"
            subtitle="Select everything that applies."
            options={taxonomy?.providerEquipmentOptions || []}
            selected={providerEquipment}
            onChange={setProviderEquipment}
            otherValues={providerEquipmentOther}
            onOtherChange={setProviderEquipmentOther}
          />
        );
      case 'serviceDeliveryModeSelect':
        return (
          <GroupSelector
            title="How do you provide your services?"
            subtitle="Select everything that applies."
            options={taxonomy?.serviceDeliveryModeOptions || []}
            selected={serviceDeliveryMode}
            onChange={setServiceDeliveryMode}
            otherValues={serviceDeliveryModeOther}
            onOtherChange={setServiceDeliveryModeOther}
          />
        );
      case 'providerCustomerTypesSelect':
        return (
          <GroupSelector
            title="Who do you provide services to?"
            subtitle="Select everything that applies."
            options={taxonomy?.providerCustomerTypes || []}
            selected={providerCustomerTypes}
            onChange={setProviderCustomerTypes}
            otherValues={providerCustomerTypeOther}
            onOtherChange={setProviderCustomerTypeOther}
          />
        );
      case 'serviceAreaSelect':
        return (
          <ServiceAreaStep
            operatingAreaOptions={taxonomy?.serviceOperatingAreaOptions || []}
            operatingArea={serviceOperatingArea}
            onOperatingAreaChange={setServiceOperatingArea}
            areaDetails={serviceAreaDetails}
            onAreaDetailsChange={setServiceAreaDetails}
          />
        );
      case 'pricingModelSelect':
        return (
          <TileMultiSelectStep
            title="Pricing model"
            subtitle="Select everything that applies."
            options={taxonomy?.pricingModelOptions || []}
            selected={pricingModel}
            onChange={setPricingModel}
            showIcons={false}
          />
        );
      case 'availabilitySelect':
        return (
          <TileMultiSelectStep
            title="Availability"
            subtitle="Select everything that applies."
            options={taxonomy?.availabilityOptions || []}
            selected={availability}
            onChange={setAvailability}
            showIcons={false}
          />
        );
      case 'serviceCapacitySelect':
        return (
          <SingleTileSelectStep
            title="What's your service capacity?"
            subtitle="This helps us match you with the right jobs."
            options={taxonomy?.serviceCapacityOptions || []}
            selected={serviceCapacity}
            onChange={setServiceCapacity}
          />
        );
      case 'providerNeedsSelect':
        return (
          <SpecializationSelector
            categories={categories}
            groupCategoryCodes={taxonomy?.providerNeedSectionCodes || []}
            selected={providerNeedLevel2Codes}
            onChange={setProviderNeedLevel2Codes}
            otherValues={needOther}
            onOtherChange={setNeedOther}
          />
        );
      case 'providerNeedsDrillSelect':
        return (
          <SpecializationSelector
            categories={categories}
            groupCategoryCodes={providerNeedLevel2Codes}
            selected={providerNeedLevel3Codes}
            onChange={setProviderNeedLevel3Codes}
            otherValues={needOther}
            onOtherChange={setNeedOther}
          />
        );
      case 'buyerTypeSelect':
        return (
          <GroupSelector
            title="What type of buyer are you?"
            subtitle="Select everything that applies — a person can be more than one."
            options={taxonomy?.buyerTypes || []}
            selected={buyerTypes}
            onChange={setBuyerTypes}
            otherValues={buyerTypeOther}
            onOtherChange={setBuyerTypeOther}
          />
        );
      case 'buyingPurposeSelect':
        return (
          <GroupSelector
            title="What are you mainly buying for?"
            subtitle="The most relevant options for your buyer type are shown first."
            options={sortedPurposeOptions}
            selected={buyingPurposes}
            onChange={setBuyingPurposes}
            otherValues={buyingPurposeOther}
            onOtherChange={setBuyingPurposeOther}
          />
        );
      case 'needsSectionSelect':
        return (
          <NeedsSelector
            categories={categories}
            selected={needSectionCodes}
            onChange={setNeedSectionCodes}
            otherValues={needOther}
            onOtherChange={setNeedOther}
          />
        );
      case 'needsCategorySelect':
        return (
          <SpecializationSelector
            categories={categories}
            groupCategoryCodes={needSectionCodes}
            selected={needCategoryLevel2Codes}
            onChange={setNeedCategoryLevel2Codes}
            otherValues={needOther}
            onOtherChange={setNeedOther}
          />
        );
      case 'needsSubcategorySelect':
        return (
          <SpecializationSelector
            categories={categories}
            groupCategoryCodes={needCategoryLevel2Codes}
            selected={needCategoryLevel3Codes}
            onChange={setNeedCategoryLevel3Codes}
            otherValues={needOther}
            onOtherChange={setNeedOther}
          />
        );
      case 'equipmentServiceIntent':
        return (
          <TileMultiSelectStep
            title="Buying equipment or booking a service?"
            subtitle="Select everything that applies."
            options={taxonomy?.equipmentServiceIntentOptions || []}
            selected={preferredListingKinds}
            onChange={setPreferredListingKinds}
            showIcons={false}
          />
        );
      case 'preferencesSelect':
        return (
          <TileMultiSelectStep
            title="What matters most when you buy?"
            subtitle="Select everything that applies."
            options={taxonomy?.buyingPreferences || []}
            selected={buyingPreferences}
            onChange={setBuyingPreferences}
          />
        );
      case 'scaleFrequencySelect':
        return (
          <ScaleFrequencyStep
            scaleOptions={taxonomy?.purchaseScaleOptions || []}
            scale={purchaseScale}
            onScaleChange={setPurchaseScale}
            frequencyOptions={taxonomy?.purchaseFrequencyOptions || []}
            frequency={purchaseFrequency}
            onFrequencyChange={setPurchaseFrequency}
          />
        );
      case 'locationDeliverySelect':
        return (
          <LocationDeliveryStep
            sourcingOptions={taxonomy?.sourcingAreaOptions || []}
            sourcingArea={sourcingAreaPreference}
            onSourcingChange={setSourcingAreaPreference}
            fulfillmentOptions={taxonomy?.fulfillmentOptions || []}
            fulfillment={fulfillmentPreference}
            onFulfillmentChange={setFulfillmentPreference}
          />
        );
      case 'summary':
        return (
          <ProfileSummaryStep
            role={user!.role}
            categories={categories}
            taxonomy={taxonomy}
            offerGroups={offerGroups}
            offerCategoryCodes={offerCategoryCodes}
            offerOther={offerOther}
            buyerTypes={buyerTypes}
            buyerTypeOther={buyerTypeOther}
            buyingPurposes={buyingPurposes}
            buyingPurposeOther={buyingPurposeOther}
            needCategoryCodes={[
              ...needSectionCodes, ...needCategoryLevel2Codes, ...needCategoryLevel3Codes,
              ...farmerNeedLevel2Codes, ...farmerNeedLevel3Codes,
              ...dealerNeedLevel2Codes, ...dealerNeedLevel3Codes,
              ...providerNeedLevel2Codes, ...providerNeedLevel3Codes,
            ]}
            needOther={needOther}
            preferredListingKinds={preferredListingKinds}
            buyingPreferences={buyingPreferences}
            purchaseScale={purchaseScale}
            purchaseFrequency={purchaseFrequency}
            sourcingAreaPreference={sourcingAreaPreference}
            fulfillmentPreference={fulfillmentPreference}
            farmerActivities={farmerActivities}
            farmerActivityOther={farmerActivityOther}
            farmScale={farmScale}
            farmerPreferences={farmerPreferences}
            dealerActivities={dealerActivities}
            dealerActivityOther={dealerActivityOther}
            dealerCustomerTypes={dealerCustomerTypes}
            dealerCustomerTypeOther={dealerCustomerTypeOther}
            salesModel={salesModel}
            restockingFrequency={restockingFrequency}
            sourcingQuantity={sourcingQuantity}
            localSourcingPreference={localSourcingPreference}
            deliveryNeeded={deliveryNeeded}
            operatingArea={operatingArea}
            deliveryCoverage={deliveryCoverage}
            dealerPreferences={dealerPreferences}
            providerEquipment={providerEquipment}
            providerEquipmentOther={providerEquipmentOther}
            serviceDeliveryMode={serviceDeliveryMode}
            serviceDeliveryModeOther={serviceDeliveryModeOther}
            providerCustomerTypes={providerCustomerTypes}
            providerCustomerTypeOther={providerCustomerTypeOther}
            serviceOperatingArea={serviceOperatingArea}
            serviceAreaDetails={serviceAreaDetails}
            pricingModel={pricingModel}
            availability={availability}
            serviceCapacity={serviceCapacity}
            saving={saving}
            onSave={handleSave}
          />
        );
      default:
        return null;
    }
  }

  function handleContinue() {
    if (step === 'buyerTypeSelect' && !requireSelection(buyerTypes, 'Please select at least one option to continue.')) return;
    goNext();
  }

  const showBack = step !== 'intro';
  const showContinue = step !== 'intro' && step !== 'summary';

  return (
    <div className="onboard-page">
      <div className="onboard-topline">
        <span className="onboard-steplabel">Step {stepIndex + 1} of {steps.length}</span>
        {step !== 'intro' && (
          <button type="button" className="onboard-skip" onClick={handleSkip}>
            Skip for now
          </button>
        )}
      </div>

      <div className="onboard-progress">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`onboard-progress-seg ${i < stepIndex ? 'done' : ''} ${i === stepIndex ? 'current' : ''}`}
          />
        ))}
      </div>

      <div className="onboard-card">
        {renderStep()}

        {showBack && (
          <div className="onboard-nav">
            <button type="button" className="btn-outline" onClick={goBack} disabled={stepIndex === 0}>
              <i className="fa-solid fa-arrow-left"></i> Back
            </button>
            {showContinue && (
              <button type="button" className="btn-primary" onClick={handleContinue}>
                Continue <i className="fa-solid fa-arrow-right"></i>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
