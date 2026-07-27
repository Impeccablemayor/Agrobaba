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
  accountName: import.meta.env.VITE_BANK_ACCOUNT_NAME || 'Agrobaba Escrow Ltd',
  bankName: import.meta.env.VITE_BANK_NAME || 'Providus Bank',
  accountNumber: import.meta.env.VITE_BANK_ACCOUNT_NUMBER || '9901234567',
};

export const QUICK_LOGIN_USERS = import.meta.env.VITE_QUICK_LOGIN_USERS
  ? JSON.parse(import.meta.env.VITE_QUICK_LOGIN_USERS)
  : {
      farmer: {
        name: 'John Oluwaseun', email: 'farmer@agrobaba.test', password: 'test1234',
        role: 'farmer', city: 'Kaduna', country: 'Nigeria', contact: '+2348012345678', address: 'Farm Road, Kaduna State',
      },
      buyer: {
        name: 'Grace Okafor', email: 'buyer@agrobaba.test', password: 'test1234',
        role: 'buyer', city: 'Lagos', country: 'Nigeria', contact: '+2348098765432', address: 'Victoria Island, Lagos',
      },
      'agro-dealer': {
        name: 'Ahmed Hassan', email: 'dealer@agrobaba.test', password: 'test1234',
        role: 'agro-dealer', city: 'Kano', country: 'Nigeria', contact: '+2348055544433', address: 'Sabon Gari, Kano',
      },
      'service-provider': {
        name: 'Dr. Adaobi Nwachukwu', email: 'service@agrobaba.test', password: 'test1234',
        role: 'service-provider', city: 'Lagos', country: 'Nigeria', contact: '+2348011122233', address: 'Lekki, Lagos',
      },
    };