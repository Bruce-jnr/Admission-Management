const { pool } = require('../db/connection');
const { sendSMS } = require('../utils/sms');
const { generatePIN, hashPIN } = require('./pin');
const { encryptPIN } = require('./pin-encryption');

function smsMessage(student, pin) {
  return `Congratulations ${student.full_name}! You have been admitted to Nsawkaw College of Education (NSACoE). Your admission number is ${student.admission_number} and your PIN is ${pin}. Visit https://admissions.nsacoe.edu.gh/student/login to download your admission documents.`;
}

async function deliverPIN(student, pin) {
  const result = await sendSMS(student.phone_number, smsMessage(student, pin));
  await pool.execute(
    `UPDATE students
     SET sms_status = ?, sms_sent_at = ?, sms_error = ?
     WHERE id = ?`,
    [
      result.success ? 'sent' : 'failed',
      result.success ? new Date() : null,
      result.success
        ? null
        : String(result.error || 'Unknown SMS error').slice(0, 2000),
      student.id,
    ],
  );
  return result;
}

async function issueAdmission(studentId, { resend = false } = {}) {
  const connection = await pool.getConnection();
  let student;
  let pin;
  try {
    await connection.beginTransaction();
    const [students] = await connection.execute(
      'SELECT id, admission_number, full_name, phone_number, admitted FROM students WHERE id = ? FOR UPDATE',
      [studentId],
    );
    student = students[0];
    if (!student) {
      const error = new Error('Student not found');
      error.status = 404;
      throw error;
    }
    if (student.admitted && !resend) {
      const error = new Error('Student is already admitted');
      error.status = 409;
      throw error;
    }
    if (!student.admitted && resend) {
      const error = new Error('Admit the student before resending a PIN');
      error.status = 409;
      throw error;
    }

    pin = generatePIN();
    const pinHash = await hashPIN(pin);
    await connection.execute(
      `UPDATE students
       SET admitted = 1, admitted_at = COALESCE(admitted_at, CURRENT_TIMESTAMP),
           pin_hash = ?, pin_ciphertext = ?, pin_code = NULL,
           sms_status = 'pending', sms_sent_at = NULL, sms_error = NULL
       WHERE id = ?`,
      [pinHash, encryptPIN(pin), studentId],
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const sms = await deliverPIN(student, pin);
  return { student, sms };
}

async function admitPendingStudents(concurrency = 3) {
  const [students] = await pool.execute(
    'SELECT id FROM students WHERE admitted = 0 ORDER BY id',
  );
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < students.length) {
      const student = students[cursor++];
      try {
        const result = await issueAdmission(student.id);
        results.push({
          id: student.id,
          success: true,
          smsSent: result.sms.success,
        });
      } catch (error) {
        results.push({ id: student.id, success: false, error: error.message });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, students.length) }, worker),
  );
  return results;
}

module.exports = { issueAdmission, admitPendingStudents, smsMessage };
