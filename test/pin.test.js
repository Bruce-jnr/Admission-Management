const test = require('node:test');
const assert = require('node:assert/strict');
const { generatePIN, hashPIN, verifyPIN } = require('../services/pin');

test('generatePIN creates a six-digit value', () => {
  for (let index = 0; index < 100; index += 1) {
    assert.match(generatePIN(), /^\d{6}$/);
  }
});

test('PIN hashes verify without storing plaintext', async () => {
  const hash = await hashPIN('123456');
  assert.doesNotMatch(hash, /123456/);
  assert.equal(await verifyPIN('123456', hash), true);
  assert.equal(await verifyPIN('654321', hash), false);
});
