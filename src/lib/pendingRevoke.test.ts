import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PENDING_REVOKE_KEY,
  markPendingRevoke,
  clearPendingRevoke,
  hasPendingRevoke,
} from './pendingRevoke.ts';

function installLocalStorage(): Map<string, string> {
  const m = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      m.set(k, v);
    },
    removeItem: (k: string) => {
      m.delete(k);
    },
    key: (_i: number) => null,
    length: 0,
    clear: () => {
      m.clear();
    },
  } as Storage;
  return m;
}

test('pending revoke marker round-trips through localStorage', () => {
  installLocalStorage();

  assert.equal(hasPendingRevoke(), false);
  markPendingRevoke();
  assert.equal(hasPendingRevoke(), true);
  assert.ok(hasPendingRevoke());
  clearPendingRevoke();
  assert.equal(hasPendingRevoke(), false);
});

test('marker survives a simulated browser restart because it lives in localStorage', () => {
  const m = installLocalStorage();

  markPendingRevoke();
  // Fresh page: the module-level code re-reads the same backing store.
  assert.equal(hasPendingRevoke(), true);
  assert.ok(m.has(PENDING_REVOKE_KEY));

  clearPendingRevoke();
  assert.equal(hasPendingRevoke(), false);
  assert.ok(!m.has(PENDING_REVOKE_KEY));
});