const test = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword, validatePassword } = require('../services/password');

test('admin passwords are salted and verified securely', async () => {
  const first = await hashPassword('SecurePassword123');
  const second = await hashPassword('SecurePassword123');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('SecurePassword123', first), true);
  assert.equal(await verifyPassword('WrongPassword123', first), false);
});

test('admin password policy requires length, letters, and numbers', () => {
  assert.equal(validatePassword('SecurePassword123'), null);
  assert.match(validatePassword('short1'), /8/);
  assert.equal(validatePassword('Secure12'), null);
  assert.match(validatePassword('onlyletterslong'), /letter and one number/);
});
