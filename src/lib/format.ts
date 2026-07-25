export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

export function formatPrice(amount: number): string {
  return '₦' + Number(amount).toLocaleString('en-NG');
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

export function starString(rating: number): string {
  const rounded = Math.round(rating || 0);
  return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
}

const ROLE_LABELS: Record<string, string> = {
  farmer: 'Farmer',
  buyer: 'Buyer',
  'agro-dealer': 'Dealer',
  'service-provider': 'Service Provider',
  admin: 'Admin',
};

export function roleLabel(role?: string | null): string {
  if (!role) return '';
  return ROLE_LABELS[role] || role;
}
