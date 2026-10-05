const test = require('node:test');
const assert = require('node:assert/strict');
const { validateStudent, parsePositiveId } = require('../services/validation');
const { formatPhoneNumber } = require('../utils/sms');

test('student input is normalized and validated', () => {
  const result = validateStudent({
    admission_number: ' ns/001 ',
    full_name: '  Ama   Mensah ',
    phone_number: '054 123 4567',
  });
  assert.deepEqual(result.errors, []);
  assert.equal(result.student.admissionNumber, 'NS/001');
  assert.equal(result.student.fullName, 'Ama Mensah');
});

test('invalid student input is rejected', () => {
  assert.equal(validateStudent({}).errors.length, 3);
  assert.equal(parsePositiveId('12'), 12);
  assert.equal(parsePositiveId('-2'), null);
});

test('Ghana phone numbers are normalized for SMS', () => {
  assert.equal(formatPhoneNumber('054 123 4567'), '233541234567');
  assert.equal(formatPhoneNumber('+233 54 123 4567'), '233541234567');
});
