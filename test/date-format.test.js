const test = require('node:test');
const assert = require('node:assert/strict');
const { formatAdmissionDate, formatLongDate, ordinal } = require('../services/date-format');

test('ordinal suffixes handle normal and teen dates', () => {
  assert.equal(ordinal(1), '1st');
  assert.equal(ordinal(2), '2nd');
  assert.equal(ordinal(3), '3rd');
  assert.equal(ordinal(11), '11th');
  assert.equal(ordinal(12), '12th');
  assert.equal(ordinal(13), '13th');
  assert.equal(ordinal(21), '21st');
});

test('admission dates use a readable letter format', () => {
  assert.equal(formatAdmissionDate(new Date(2026, 9, 12)), '12th October, 2026');
  assert.equal(formatAdmissionDate(null), '');
  assert.equal(formatLongDate('2026-11-11', true), 'Wednesday, 11th November, 2026');
});
