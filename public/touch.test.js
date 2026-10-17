import test from 'node:test';
import assert from 'node:assert/strict';
import { wordRangeAt } from './touch.js';
import { arrowSequence } from './toolbar.js';

test('wordRangeAt returns the whitespace-delimited word under the column', () => {
  assert.deepEqual(wordRangeAt('git status now', 5), { start: 4, end: 10 });
  assert.deepEqual(wordRangeAt('git status now', 0), { start: 0, end: 3 });
  assert.deepEqual(wordRangeAt('git status now', 13), { start: 11, end: 14 });
});

test('wordRangeAt returns null on whitespace or past the end of the line', () => {
  assert.equal(wordRangeAt('git status', 3), null);
  assert.equal(wordRangeAt('git', 9), null);
  assert.equal(wordRangeAt('', 0), null);
});

test('arrowSequence follows the application-cursor mode', () => {
  assert.equal(arrowSequence('A', false), '\x1b[A');
  assert.equal(arrowSequence('D', true), '\x1bOD');
  assert.equal(arrowSequence('B', undefined), '\x1b[B');
});
