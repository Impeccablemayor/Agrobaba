export const KEYS = {
  user: 'agrobaba_user',
  users: 'agrobaba_users',
  products: 'agrobaba_products',
  demands: 'agrobaba_demands',
  orders: 'agrobaba_orders',
  cart: 'agrobaba_cart',
  messages: 'agrobaba_messages',
  tickets: 'agrobaba_tickets',
  newsletter: 'agrobaba_newsletter',
  redirect: 'agrobaba_redirect',
  flashEnd: 'agrobaba_flash_end',
} as const;

export function getStore<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') || [];
  } catch {
    return [];
  }
}

export function setStore<T>(key: string, value: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

export function getItem<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
}
