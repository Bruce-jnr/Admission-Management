const ADMISSION_NUMBER = /^[A-Z0-9][A-Z0-9/_-]{2,19}$/;
const PHONE_NUMBER = /^\+?[0-9][0-9\s()-]{7,19}$/;

function normalizeStudentInput(input = {}) {
  return {
    admissionNumber: String(input.admission_number || '').trim().toUpperCase(),
    fullName: String(input.full_name || '').trim().replace(/\s+/g, ' '),
    phoneNumber: String(input.phone_number || '').trim(),
  };
}

function validateStudent(input) {
  const student = normalizeStudentInput(input);
  const errors = [];
  if (!ADMISSION_NUMBER.test(student.admissionNumber)) errors.push('Admission number must be 3-20 valid characters');
  if (student.fullName.length < 2 || student.fullName.length > 100) errors.push('Full name must be 2-100 characters');
  if (!PHONE_NUMBER.test(student.phoneNumber)) errors.push('Enter a valid phone number');
  return { student, errors };
}

function parsePositiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

module.exports = { normalizeStudentInput, validateStudent, parsePositiveId };
