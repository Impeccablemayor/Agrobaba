import { test } from 'node:test';
import assert from 'node:assert/strict';
import { can, canOpen, isApprovalPending, type AdminPermission } from './adminAccessRules.ts';

const support = { permissions: ['ADMIN_BASIC', 'SUPPORT_VIEW', 'SUPPORT_MANAGE', 'CATALOG_MANAGE', 'ORDERS_MANAGE', 'DISPUTES'] as AdminPermission[] };
const finance = { permissions: ['ADMIN_BASIC', 'SUPPORT_VIEW', 'ORDERS_MANAGE', 'DISPUTES', 'FINANCE_VIEW', 'FINANCE_MANAGE', 'REFUNDS',
  'PAYOUTS_MANAGE', 'PAYOUT_SETTINGS', 'BANK_REVEAL', 'VERIFICATION_VIEW', 'AUDIT_VIEW'] as AdminPermission[] };

test('each admin sees only the pages their role allows', () => {
  assert.equal(canOpen(support, '/admin/orders'), true);
  assert.equal(canOpen(support, '/admin/payouts'), false);
  assert.equal(canOpen(support, '/admin/finance'), false);
  assert.equal(canOpen(finance, '/admin/finance'), true);
  assert.equal(canOpen(finance, '/admin/team'), false, 'only super manages admins');
  assert.equal(canOpen(finance, '/admin/some-new-page'), false, 'unknown pages are super-only');
  assert.equal(canOpen(null, '/admin'), false);
});

test('money actions need money permissions', () => {
  assert.equal(can(support, 'REFUNDS'), false);
  assert.equal(can(finance, 'REFUNDS'), true);
  assert.equal(can(finance, 'VERIFICATION_DECIDE'), false);
});

test('a "waiting for a second admin" answer is recognised', () => {
  assert.equal(isApprovalPending({ approvalRequired: true, approvalId: 3, message: 'x' }), true);
  assert.equal(isApprovalPending({ id: 3, status: 'SUCCESS' }), false);
  assert.equal(isApprovalPending(null), false);
});
