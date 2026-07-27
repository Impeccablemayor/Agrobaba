import type { Role } from '../types';

export const CATEGORY_ICONS: Record<string, string> = {
  Vegetables: 'fa-apple-whole',
  Grains: 'fa-wheat-awn',
  Tubers: 'fa-leaf',
  Fish: 'fa-fish',
  Poultry: 'fa-egg',
  Fertilizers: 'fa-flask',
  Pesticides: 'fa-spray-can-sparkles',
  Irrigation: 'fa-droplet',
  'Animal Feed': 'fa-bone',
  'Equipment Hire': 'fa-tractor',
  Veterinary: 'fa-stethoscope',
  Consultancy: 'fa-user-tie',
  default: 'fa-box',
};

export const DEMAND_CATEGORY_ICONS: Record<string, string> = {
  Grains: 'fa-wheat-awn',
  Vegetables: 'fa-apple-whole',
  Tubers: 'fa-leaf',
  Fish: 'fa-fish',
  Fertilizers: 'fa-flask',
  Consultancy: 'fa-user-tie',
  Veterinary: 'fa-stethoscope',
  'Equipment Hire': 'fa-tractor',
  default: 'fa-clipboard-list',
};

export const BANK_DETAILS = {
  accountName: import.meta.env.VITE_BANK_ACCOUNT_NAME ,
  bankName: import.meta.env.VITE_BANK_NAME,
  accountNumber: import.meta.env.VITE_BANK_ACCOUNT_NUMBER ,
};

let quickLoginUsers: Record<string, {
  name: string; email: string; password: string; role: Role;
  city: string; country: string; contact: string; address: string;
}> | null = null;

try {
  const raw = import.meta.env.VITE_QUICK_LOGIN_USERS;
  if (raw) quickLoginUsers = JSON.parse(raw);
} catch { /* env var not set or malformed */ }

export { quickLoginUsers as QUICK_LOGIN_USERS };