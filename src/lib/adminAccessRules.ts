/** Batch 8: admin roles and permissions as the admin pages see them. The backend enforces every rule on
 *  every request; this only decides what to show. Pure, so it can be unit tested. */

export type AdminPermission =
  | 'ADMIN_BASIC' | 'SUPPORT_VIEW' | 'SUPPORT_MANAGE' | 'CATALOG_MANAGE' | 'ORDERS_MANAGE' | 'DISPUTES'
  | 'FINANCE_VIEW' | 'FINANCE_MANAGE' | 'REFUNDS' | 'PAYOUTS_MANAGE' | 'PAYOUT_SETTINGS' | 'BANK_REVEAL'
  | 'VERIFICATION_VIEW' | 'VERIFICATION_DECIDE' | 'AUDIT_VIEW' | 'ADMINS_MANAGE';

export type AdminRoleName = 'SUPER' | 'FINANCE' | 'SUPPORT' | 'VERIFICATION';

export const ADMIN_ROLES: { value: AdminRoleName; label: string; summary: string }[] = [
  { value: 'SUPER', label: 'Super administrator', summary: 'Everything, including adding admins and the two-person limit.' },
  { value: 'FINANCE', label: 'Finance administrator', summary: 'Payments, refunds, settlements, payouts, ledger, reports. Can’t approve ID or bank checks.' },
  { value: 'SUPPORT', label: 'Support administrator', summary: 'Users, orders, tickets, catalogue, disputes without refunds. No money.' },
  { value: 'VERIFICATION', label: 'Verification administrator', summary: 'ID verifications and payout bank account reviews. No money.' },
];

export interface AdminMe {
  id: number;
  email: string;
  name: string;
  adminRole: AdminRoleName | null;
  roleLabel: string | null;
  permissions: AdminPermission[];
}

/** Which permission each admin page needs (mirrors the backend's AdminPermissionRules). */
export const PAGE_PERMISSION: Record<string, AdminPermission> = {
  '/admin': 'ADMIN_BASIC',
  '/admin/finance': 'FINANCE_VIEW',
  '/admin/approvals': 'FINANCE_VIEW',
  '/admin/reconciliation': 'FINANCE_VIEW',
  '/admin/team': 'ADMINS_MANAGE',
  '/admin/users': 'SUPPORT_VIEW',
  '/admin/products': 'CATALOG_MANAGE',
  '/admin/demands': 'CATALOG_MANAGE',
  '/admin/orders': 'SUPPORT_VIEW',
  '/admin/payments': 'FINANCE_VIEW',
  '/admin/payouts': 'FINANCE_VIEW',
  '/admin/ledger': 'FINANCE_VIEW',
  '/admin/transactions': 'SUPPORT_VIEW',
  '/admin/disputes': 'DISPUTES',
  '/admin/inspection': 'FINANCE_VIEW',
  '/admin/logistics': 'CATALOG_MANAGE',
  '/admin/verifications': 'VERIFICATION_VIEW',
  '/admin/flash-sales': 'CATALOG_MANAGE',
  '/admin/coupons': 'FINANCE_VIEW',
  '/admin/influencers': 'FINANCE_VIEW',
  '/admin/tickets': 'SUPPORT_VIEW',
  '/admin/categories': 'CATALOG_MANAGE',
  '/admin/personalization': 'CATALOG_MANAGE',
  '/admin/activity': 'AUDIT_VIEW',
  '/admin/emails': 'SUPPORT_MANAGE',
};

/** Unknown pages are shown only to super administrators (as on the backend). */
export function canOpen(me: Pick<AdminMe, 'permissions'> | null | undefined, path: string): boolean {
  if (!me) return false;
  const needed = PAGE_PERMISSION[path] ?? 'ADMINS_MANAGE';
  return me.permissions.includes(needed);
}

export const can = (me: Pick<AdminMe, 'permissions'> | null | undefined, p: AdminPermission) => !!me && me.permissions.includes(p);

/** A money action above the two-person limit comes back as "waiting for a second admin" (HTTP 202). */
export interface ApprovalPending {
  approvalRequired: true;
  approvalId: number;
  message: string;
}

export function isApprovalPending(r: unknown): r is ApprovalPending {
  return !!r && typeof r === 'object' && (r as { approvalRequired?: unknown }).approvalRequired === true;
}
