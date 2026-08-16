/** FontAwesome icon per known taxonomy/section code, purely cosmetic (frontend-only) - falls
 *  back to a generic icon for anything not in this list (including free-text "Other" groups
 *  added later, or taxonomy codes this map hasn't been updated for). */
const ICONS: Record<string, string> = {
  // Farmer enterprises
  crop_farming: 'fa-wheat-awn',
  livestock_farming: 'fa-cow',
  mixed_farming: 'fa-layer-group',
  horticulture: 'fa-seedling',
  agroforestry: 'fa-tree',
  aquaculture: 'fa-fish',

  // Agro-dealer product types
  farm_inputs: 'fa-flask',
  seeds_planting_materials: 'fa-seedling',
  fertilizers_soil_inputs: 'fa-flask',
  crop_protection_agrochemicals: 'fa-spray-can-sparkles',
  livestock_animal_health: 'fa-cow',
  animal_feed_nutrition: 'fa-bowl-food',
  farm_equipment_machinery: 'fa-tractor',
  farm_tools_implements: 'fa-toolbox',
  irrigation_water_systems: 'fa-droplet',
  farm_produce_packaging: 'fa-box',
  processing_equipment_supplies: 'fa-industry',
  specialized_agricultural_supplies: 'fa-briefcase',
  general_agro_dealer: 'fa-store',
  aquaculture_supplies: 'fa-fish',
  agricultural_supplies_accessories: 'fa-toolbox',

  // Agro-dealer activities ("what do you use AgroBaba for")
  sell_agricultural_products: 'fa-store',
  buy_restock_inventory: 'fa-boxes-stacked',
  source_from_producers: 'fa-tractor',
  source_from_manufacturers: 'fa-industry',
  find_farmers_customers: 'fa-user-tag',
  find_wholesale_suppliers: 'fa-warehouse',
  find_logistics_dealer: 'fa-truck',
  find_processors_dealer: 'fa-industry',
  source_for_wholesale: 'fa-boxes-stacked',
  expand_customer_reach: 'fa-bullhorn',

  // Agro-dealer customer types
  smallholder_farmers: 'fa-tractor',
  commercial_farmers: 'fa-tractor',
  crop_farmers_customers: 'fa-wheat-awn',
  livestock_farmers_customers: 'fa-cow',
  fish_farmers_customers: 'fa-fish',
  plantation_agroforestry_farmers: 'fa-tree',
  other_agro_dealers: 'fa-store',
  food_processors_customers: 'fa-industry',
  retailers_customers: 'fa-store',
  exporters_customers: 'fa-ship',
  institutions_customers: 'fa-building-columns',

  // Agro-dealer preferences
  competitive_wholesale_prices: 'fa-tag',
  reliable_stock_availability: 'fa-boxes-stacked',
  verified_suppliers: 'fa-circle-check',
  product_quality: 'fa-award',
  fast_delivery: 'fa-truck-fast',
  nearby_suppliers_dealer: 'fa-location-dot',
  bulk_availability_dealer: 'fa-boxes-stacked',
  consistent_supply_dealer: 'fa-repeat',
  good_resale_margins: 'fa-sack-dollar',
  reliable_customers: 'fa-handshake',

  // Service-provider service types
  farm_machinery_equipment_services: 'fa-tractor',
  farm_machinery_tractor_services: 'fa-tractor',
  land_preparation_farm_development: 'fa-hammer',
  planting_crop_establishment: 'fa-seedling',
  crop_spraying_crop_care: 'fa-spray-can-sparkles',
  agricultural_logistics_transportation: 'fa-truck',
  crop_production_services: 'fa-wheat-awn',
  livestock_services: 'fa-stethoscope',
  aquaculture_services: 'fa-fish',
  soil_testing_agricultural_consultancy: 'fa-vial',
  soil_testing_farm_analysis: 'fa-vial',
  irrigation_water_services: 'fa-droplet',
  irrigation_water_management: 'fa-droplet',
  harvesting_post_harvest_services: 'fa-warehouse',
  storage_warehousing: 'fa-warehouse',
  farm_development_installation: 'fa-hammer',
  agricultural_processing: 'fa-industry',
  forestry_agroforestry_services: 'fa-tree',
  farm_labour_field_services: 'fa-people-group',
  agricultural_consulting: 'fa-comments',
  greenhouse_construction: 'fa-hammer',

  // Provider equipment/resources
  tractors_implements_equip: 'fa-tractor',
  harvesters_planters_equip: 'fa-tractor',
  sprayers_equip: 'fa-spray-can-sparkles',
  vehicle_equip: 'fa-truck',
  water_pumps_irrigation_equip: 'fa-droplet',
  processing_equip: 'fa-industry',
  greenhouse_construction_equip: 'fa-hammer',

  // Service delivery mode
  service_only: 'fa-hand-holding-medical',
  equipment_hire_mode: 'fa-tractor',
  equipment_operator: 'fa-user-gear',
  full_service_package: 'fa-box-open',
  consulting_mode: 'fa-comments',
  installation_mode: 'fa-screwdriver-wrench',
  maintenance_repair: 'fa-wrench',

  // Provider customer types
  crop_farmers_provider: 'fa-wheat-awn',
  livestock_farmers_provider: 'fa-cow',
  aquaculture_farmers_provider: 'fa-fish',
  horticulture_farmers_provider: 'fa-seedling',
  agroforestry_farmers_provider: 'fa-tree',
  commercial_farms_provider: 'fa-tractor',
  farmer_cooperatives: 'fa-people-group',
  agro_processors_provider: 'fa-industry',
  agro_dealers_provider: 'fa-store',
  agribusinesses: 'fa-briefcase',

  // Buyer types
  farmer: 'fa-tractor',
  caterer_chef: 'fa-utensils',
  restaurant: 'fa-utensils',
  hotel_hospitality: 'fa-hotel',
  household_direct_consumer: 'fa-house',
  retailer_supermarket: 'fa-store',
  food_processor: 'fa-industry',
  manufacturer: 'fa-industry',
  wholesaler_distributor: 'fa-boxes-stacked',
  exporter: 'fa-ship',
  institution_organization: 'fa-building-columns',
  agro_dealer: 'fa-store',
  agro_service_provider: 'fa-stethoscope',

  // Buying purposes
  farm_production: 'fa-tractor',
  household_consumption: 'fa-house',
  cooking_catering: 'fa-utensils',
  restaurant_operations: 'fa-utensils',
  reselling: 'fa-store',
  food_processing: 'fa-industry',
  manufacturing: 'fa-industry',
  wholesale_distribution: 'fa-boxes-stacked',
  export: 'fa-ship',
  institutional_use: 'fa-building-columns',
  livestock_production: 'fa-cow',

  // Buying preferences
  competitive_price: 'fa-tag',
  freshness: 'fa-leaf',
  quality: 'fa-award',
  verified_seller: 'fa-circle-check',
  nearby_supplier: 'fa-location-dot',
  delivery_available: 'fa-truck',
  bulk_availability: 'fa-boxes-stacked',
  consistent_supply: 'fa-repeat',
  farm_direct_sourcing: 'fa-seedling',
  wholesale_pricing: 'fa-tags',

  // Top-level category sections (NeedsSelector), matching the category bar's own icons
  produce: 'fa-wheat-awn',
  value_added: 'fa-box',
  livestock: 'fa-cow',
  inputs: 'fa-flask',
  equipment: 'fa-tractor',
  services: 'fa-hand-holding-medical',
  land: 'fa-map-location-dot',

  // Farmer activities ("what do you use AgroBaba for")
  buy_farm_inputs: 'fa-flask',
  buy_equipment: 'fa-tractor',
  hire_agricultural_services: 'fa-hand-holding-medical',
  sell_produce: 'fa-store',
  find_buyers: 'fa-user-tag',
  find_logistics: 'fa-truck',
  find_storage: 'fa-warehouse',
  find_processors: 'fa-industry',
  find_farmland: 'fa-map-location-dot',

  // Farmer preferences
  affordable_prices: 'fa-tag',
  quality_inputs: 'fa-award',
  nearby_services: 'fa-location-dot',
  reliable_logistics: 'fa-truck',
  verified_providers: 'fa-circle-check',
  good_produce_prices: 'fa-sack-dollar',
  reliable_buyers: 'fa-handshake',
  nearby_buyers: 'fa-location-dot',

  // Farm scale
  small: 'fa-seedling',
  medium: 'fa-tractor',
  large: 'fa-warehouse',
  commercial: 'fa-industry',

  other: 'fa-ellipsis',
};

const FALLBACK = 'fa-circle-check';

export function iconForCode(code: string): string {
  return ICONS[code] || FALLBACK;
}
