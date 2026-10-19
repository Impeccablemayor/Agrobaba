import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consumeSessionEnded, markSessionEnded, type StorageLike } from './sessionNotice.ts';

function memoryStorage(): StorageLike & { dump(): Map<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
    dump: () => map,
  };
}

test('consumeSessionEnded is true exactly once after markSessionEnded', () => {
  const storage = memoryStorage();

  markSessionEnded(storage);

  assert.equal(consumeSessionEnded(storage), true, 'first read reports the ended session');
  assert.equal(consumeSessionEnded(storage), false, 'second read must not repeat the notice');
  assert.equal(storage.dump().size, 0, 'the marker is cleared after being consumed');
});

test('consumeSessionEnded is false with no marker (ordinary /login visits stay silent)', () => {
  const storage = memoryStorage();
  assert.equal(consumeSessionEnded(storage), false);
});

test('session-ended helpers never throw when storage is missing or hostile', () => {
  assert.doesNotThrow(() => markSessionEnded(null));
  assert.equal(consumeSessionEnded(null), false);

  const throwing: StorageLike = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
    removeItem() {
      throw new Error('blocked');
    },
  };
  assert.doesNotThrow(() => markSessionEnded(throwing));
  assert.equal(consumeSessionEnded(throwing), false);
});

test('a new ended session re-arms the notice after the previous one was consumed', () => {
  const storage = memoryStorage();

  markSessionEnded(storage);
  assert.equal(consumeSessionEnded(storage), true);

  markSessionEnded(storage);
  assert.equal(consumeSessionEnded(storage), true, 'a later expiry must notify again');
});
