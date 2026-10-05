const test = require('node:test');
const assert = require('node:assert/strict');
const { encryptPIN, decryptPIN } = require('../services/pin-encryption');

test('PIN encryption is authenticated and recoverable', () => {
  const encrypted = encryptPIN('123456');
  assert.doesNotMatch(encrypted, /123456/);
  assert.equal(decryptPIN(encrypted), '123456');
});

test('tampered PIN ciphertext is rejected', () => {
  const encrypted = encryptPIN('123456');
  const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith('0') ? '1' : '0'}`;
  assert.equal(decryptPIN(tampered), null);
  assert.equal(decryptPIN(null), null);
});
