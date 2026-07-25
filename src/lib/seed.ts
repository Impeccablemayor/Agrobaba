import { KEYS, getStore, setStore } from './storage';
import type { Demand, Product } from '../types';

export function seedData(): void {
  const products = getStore<Product>(KEYS.products);
  if (products.length > 0) return;

  const now = new Date().toISOString();

  const seedProducts: Product[] = [
    {
      id: 'seed-1', name: 'Fresh Tomatoes — Grade A, 50kg bag',
      description: 'Premium grade A tomatoes freshly harvested from our farm in Plateau State. Perfect for restaurants, supermarkets and households.',
      price: 8500, category: 'Vegetables', type: 'produce',
      size: '50kg bag', quantity: 100, unit: 'bag', location: 'Plateau State',
      sellerId: 'seed', sellerName: 'Chidi Farms', sellerRole: 'seed',
      verified: true, rating: 4.8, reviews: 42, sold: 156, discount: 30,
      image: null, tags: ['tomatoes', 'fresh', 'grade-a'], createdAt: now, status: 'active',
    },
    {
      id: 'seed-2', name: 'NPK Fertilizer UREA 50kg — Premium Grade',
      description: 'High-quality NPK fertilizer for all crop types. Boosts yield and improves soil health. Certified and tested.',
      price: 6400, category: 'Fertilizers', type: 'product',
      size: '50kg bag', quantity: 500, unit: 'bag', location: 'Kano',
      sellerId: 'seed', sellerName: 'Ahmed Agro Inputs', sellerRole: 'seed',
      verified: true, rating: 4.5, reviews: 18, sold: 234, discount: 20,
      image: null, tags: ['fertilizer', 'npk', 'urea'], createdAt: now, status: 'active',
    },
    {
      id: 'seed-3', name: 'Sweet Maize — Dried, 100kg',
      description: 'Sun-dried premium maize from Kaduna farms. Ready for milling or animal feed. Properly stored and pest-free.',
      price: 18000, category: 'Grains', type: 'produce',
      size: '100kg bag', quantity: 50, unit: 'bag', location: 'Kaduna',
      sellerId: 'seed', sellerName: 'John Oluwaseun', sellerRole: 'seed',
      verified: true, rating: 5.0, reviews: 24, sold: 89, discount: 0,
      image: null, tags: ['maize', 'corn', 'dried'], createdAt: now, status: 'active',
    },
    {
      id: 'seed-4', name: 'Poultry Vet Consultation — 1 hour session',
      description: 'Professional veterinary consultation for poultry farms. Diagnosis, treatment plans, and vaccination schedules included.',
      price: 5000, category: 'Veterinary', type: 'service',
      size: '1 session', quantity: 999, unit: 'session', location: 'Lagos',
      sellerId: 'seed', sellerName: 'Dr. Adaobi Nwachukwu', sellerRole: 'seed',
      verified: true, rating: 5.0, reviews: 31, sold: 67, discount: 0,
      image: null, tags: ['vet', 'poultry', 'consultation'], createdAt: now, status: 'active',
    },
    {
      id: 'seed-5', name: 'Drip Irrigation Kit — 1 Acre Coverage',
      description: 'Complete drip irrigation system for 1 acre of farmland. Includes pipes, emitters, filters and installation guide.',
      price: 45000, category: 'Irrigation', type: 'product',
      size: '1 acre kit', quantity: 30, unit: 'kit', location: 'Ibadan',
      sellerId: 'seed', sellerName: 'FarmEquip Nigeria', sellerRole: 'seed',
      verified: false, rating: 4.7, reviews: 7, sold: 12, discount: 25,
      image: null, tags: ['irrigation', 'drip', 'equipment'], createdAt: now, status: 'active',
    },
    {
      id: 'seed-6', name: 'Farm Fresh Eggs — Crate of 30',
      description: 'Fresh farm eggs from free-range hens. Collected daily. Rich in protein and nutrients. Delivery available in Lagos.',
      price: 2200, category: 'Poultry', type: 'produce',
      size: 'Crate of 30', quantity: 200, unit: 'crate', location: 'Lagos',
      sellerId: 'seed', sellerName: 'Fatima Farms', sellerRole: 'seed',
      verified: false, rating: 4.3, reviews: 12, sold: 445, discount: 0,
      image: null, tags: ['eggs', 'poultry', 'fresh'], createdAt: now, status: 'active',
    },
    {
      id: 'seed-7', name: 'Organic Cassava — 50kg freshly harvested',
      description: 'Organically grown cassava from Ogun State. No chemicals used. Perfect for garri, fufu, and starch production.',
      price: 7500, category: 'Tubers', type: 'produce',
      size: '50kg bag', quantity: 80, unit: 'bag', location: 'Ogun State',
      sellerId: 'seed', sellerName: 'Grace Agro', sellerRole: 'seed',
      verified: false, rating: 4.9, reviews: 5, sold: 23, discount: 0,
      image: null, tags: ['cassava', 'organic', 'tubers'], createdAt: now, status: 'active',
    },
    {
      id: 'seed-8', name: 'Catfish — Live, 5kg bundle',
      description: 'Fresh live catfish from certified fish farm. Healthy, well-fed, and ready for delivery. Sold in 5kg bundles.',
      price: 4800, category: 'Fish', type: 'produce',
      size: '5kg bundle', quantity: 150, unit: 'bundle', location: 'Oyo State',
      sellerId: 'seed', sellerName: 'AquaFarm Nigeria', sellerRole: 'seed',
      verified: true, rating: 4.9, reviews: 19, sold: 201, discount: 0,
      image: null, tags: ['catfish', 'fish', 'aquaculture'], createdAt: now, status: 'active',
    },
    {
      id: 'seed-9', name: 'Pesticide — Cypermethrin 1L bottle',
      description: 'Effective broad-spectrum insecticide for crop protection. Controls aphids, beetles, caterpillars, and more.',
      price: 3500, category: 'Pesticides', type: 'product',
      size: '1 litre', quantity: 300, unit: 'bottle', location: 'Lagos',
      sellerId: 'seed', sellerName: 'AgroShield Supplies', sellerRole: 'seed',
      verified: true, rating: 4.4, reviews: 9, sold: 78, discount: 10,
      image: null, tags: ['pesticide', 'insecticide', 'crop-protection'], createdAt: now, status: 'active',
    },
    {
      id: 'seed-10', name: 'Farm Consultant — Crop Planning (2 Days)',
      description: 'Expert agricultural consultant for crop selection, soil analysis, and farm layout planning. 2-day on-site visit.',
      price: 35000, category: 'Consultancy', type: 'service',
      size: '2 day visit', quantity: 999, unit: 'session', location: 'Nationwide',
      sellerId: 'seed', sellerName: 'AgroExpert NG', sellerRole: 'seed',
      verified: true, rating: 4.8, reviews: 14, sold: 29, discount: 0,
      image: null, tags: ['consultant', 'farming', 'planning'], createdAt: now, status: 'active',
    },
    {
      id: 'seed-11', name: 'Poultry Feed — Premium Broiler Starter 25kg',
      description: 'High-protein broiler starter feed for 0-4 week old chicks. Boosts growth rate and reduces mortality.',
      price: 6000, category: 'Animal Feed', type: 'product',
      size: '25kg bag', quantity: 400, unit: 'bag', location: 'Ibadan',
      sellerId: 'seed', sellerName: 'PoultryPlus Feeds', sellerRole: 'seed',
      verified: false, rating: 4.6, reviews: 22, sold: 312, discount: 0,
      image: null, tags: ['poultry-feed', 'broiler', 'animal-feed'], createdAt: now, status: 'active',
    },
    {
      id: 'seed-12', name: 'Tractor Hire — Land Clearing per Acre',
      description: 'Tractor hire service for land clearing, plowing, and harrowing. Available for 1–50 acres. Operator included.',
      price: 25000, category: 'Equipment Hire', type: 'service',
      size: 'per acre', quantity: 999, unit: 'acre', location: 'Oyo State',
      sellerId: 'seed', sellerName: 'FarmMech Services', sellerRole: 'seed',
      verified: true, rating: 4.7, reviews: 8, sold: 45, discount: 0,
      image: null, tags: ['tractor', 'land-clearing', 'hire'], createdAt: now, status: 'active',
    },
  ];

  setStore(KEYS.products, seedProducts);

  const seedDemands: Demand[] = [
    {
      id: 'dem-1', title: '50 bags of dried maize — Kaduna delivery',
      description: 'Need by end of month. Prefer verified farmer with delivery option. Open to negotiation on price.',
      category: 'Grains', quantity: '50 bags', budget: 900000,
      location: 'Kaduna', deadline: '', buyerId: 'seed-buyer', buyerName: 'Emeka Supermarket', buyerRole: 'buyer',
      responses: [], status: 'open', createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'dem-2', title: 'Farm consultant needed — poultry setup in Oyo State',
      description: 'Setting up 500-bird poultry farm. Need experienced consultant for 2 days on-site.',
      category: 'Consultancy', quantity: '2 days', budget: 80000,
      location: 'Oyo', deadline: '', buyerId: 'seed-buyer2', buyerName: 'Tunde Ayinde', buyerRole: 'farmer',
      responses: [], status: 'open', createdAt: new Date(Date.now() - 18000000).toISOString(),
    },
    {
      id: 'dem-3', title: 'Organic fertilizer — 20 bags, Lagos mainland',
      description: 'Looking for certified organic fertilizer with NAFDAC documentation. Bulk deal preferred.',
      category: 'Fertilizers', quantity: '20 bags', budget: 120000,
      location: 'Lagos', deadline: '', buyerId: 'seed-buyer3', buyerName: 'GreenFarm Lagos', buyerRole: 'agro-dealer',
      responses: [], status: 'open', createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'dem-4', title: 'Tractor hire for 3 days — Ibadan farmland',
      description: 'Need tractor with operator for land clearing on 5 acres. Must have insurance coverage.',
      category: 'Equipment Hire', quantity: '3 days', budget: 150000,
      location: 'Ibadan', deadline: '', buyerId: 'seed-buyer4', buyerName: 'Bola Adewale', buyerRole: 'buyer',
      responses: [], status: 'open', createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  setStore(KEYS.demands, seedDemands);
}
