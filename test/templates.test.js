const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const templatePath = path.join(__dirname, '..', 'views', 'admin_dashboard.ejs');
const template = fs.readFileSync(templatePath, 'utf8');
const base = {
  csrfToken: 'a'.repeat(64),
  admin: { full_name: 'Super Administrator', role: 'super_admin' },
  admissionDate: '12th October, 2026',
  academicYear: '2026/2027',
  reportingDate: 'Wednesday, 11th November, 2026',
  reportingTime: '6:00pm',
  feeDeadline: '10th November, 2026',
};

test('admin dashboard renders an empty student list', () => {
  assert.doesNotThrow(() => ejs.render(template, { ...base, students: [] }));
});

test('admin dashboard renders student rows with admitted state', () => {
  const html = ejs.render(template, {
    ...base,
    students: [
      {
        id: 1,
        admission_number: 'NS/001',
        full_name: 'Test Student',
        phone_number: '0540000000',
        admitted: 1,
        sms_status: 'sent',
        sms_error: null,
        visible_pin: '123456',
      },
    ],
  });
  assert.match(html, /data-admitted="true"/);
  assert.match(html, /123456/);
  assert.match(html, /id="admitStudentModal"/);
  assert.doesNotMatch(html, /Are you sure you want to admit \$\{studentName\}/);
});

test('admission letter declares an exact A4 print page', () => {
  const letter = fs.readFileSync(
    path.join(__dirname, '..', 'views', 'admission_letter.ejs'),
    'utf8',
  );
  assert.match(letter, /@page\s*{[\s\S]*size:\s*A4 portrait/);
  assert.match(letter, /margin:\s*8mm 10mm/);
  assert.match(letter, /@media print[\s\S]*\.a4\s*{[\s\S]*height:\s*auto/);
  const printStyles = letter.match(/@media print[\s\S]*?<\/style>/)[0];
  assert.doesNotMatch(printStyles, /height:\s*29[67]mm/);
});
