import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reorderArray } from '../js/reorder.js';

test('reorderArray moves an item from an earlier index to a later index', () => {
  const result = reorderArray(['a', 'b', 'c', 'd'], 0, 2);
  assert.deepEqual(result, ['b', 'c', 'a', 'd']);
});

test('reorderArray moves an item from a later index to an earlier index', () => {
  const result = reorderArray(['a', 'b', 'c', 'd'], 3, 0);
  assert.deepEqual(result, ['d', 'a', 'b', 'c']);
});

test('reorderArray does not mutate the original array', () => {
  const original = ['a', 'b', 'c'];
  reorderArray(original, 0, 2);
  assert.deepEqual(original, ['a', 'b', 'c']);
});

test('reorderArray returns an equivalent copy when indexes are identical', () => {
  const original = ['a', 'b', 'c'];
  const result = reorderArray(original, 1, 1);
  assert.deepEqual(result, original);
  assert.notEqual(result, original);
});

test('reorderArray returns an unmodified copy for out-of-range indexes', () => {
  const original = ['a', 'b', 'c'];
  assert.deepEqual(reorderArray(original, -1, 1), original);
  assert.deepEqual(reorderArray(original, 0, 5), original);
});
