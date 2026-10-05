const test = require('node:test');
const assert = require('node:assert/strict');
const { safeEqual } = require('../middleware/csrf');

test('CSRF tokens use constant-time equality for matching lengths', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual(undefined, 'abc'), false);
});
