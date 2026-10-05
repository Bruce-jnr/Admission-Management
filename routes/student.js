const express = require('express');
const jwt = require('jsonwebtoken');
const { jwtSecret, admissionLetter } = require('../config');
const { pool } = require('../db/connection');
const { cookieOptions, requireStudentAuth } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rate-limit');
const { hashPIN, verifyPIN } = require('../services/pin');
const { formatAdmissionDate, formatLongDate } = require('../services/date-format');

const router = express.Router();
const loginLimiter = createRateLimiter({ windowMs: 15 * 60_000, max: 10, message: 'Too many login attempts. Try again later.' });

router.get('/login', (req, res) => res.render('student_login', { error: null }));

router.post('/login', loginLimiter, async (req, res, next) => {
  const admissionNumber = String(req.body.admission_number || '').trim().toUpperCase();
  const pin = String(req.body.pin || '').trim();
  if (!/^[A-Z0-9/_-]{3,20}$/.test(admissionNumber) || !/^\d{6}$/.test(pin)) {
    return res.status(400).render('student_login', { error: 'Enter a valid admission number and six-digit PIN' });
  }
  try {
    const [students] = await pool.execute(
      `SELECT id, admission_number, pin_hash, pin_code
       FROM students WHERE admission_number = ? AND admitted = 1 LIMIT 1`,
      [admissionNumber]
    );
    const student = students[0];
    const validHash = student ? await verifyPIN(pin, student.pin_hash) : false;
    const validLegacyPIN = student && !student.pin_hash && student.pin_code === pin;
    if (!student || (!validHash && !validLegacyPIN)) {
      return res.status(401).render('student_login', { error: 'Invalid credentials' });
    }
    if (validLegacyPIN) {
      await pool.execute('UPDATE students SET pin_hash = ?, pin_code = NULL WHERE id = ?', [await hashPIN(pin), student.id]);
    }
    const token = jwt.sign({ studentId: student.id }, jwtSecret, { algorithm: 'HS256', expiresIn: '24h' });
    res.cookie('studentToken', token, cookieOptions);
    return res.redirect('/student/dashboard');
  } catch (error) {
    return next(error);
  }
});

router.get('/dashboard', requireStudentAuth, async (req, res, next) => {
  try {
    const [students] = await pool.execute(
      'SELECT id, admission_number, full_name, admitted FROM students WHERE id = ? AND admitted = 1',
      [req.studentId]
    );
    if (!students[0]) return res.redirect('/student/login');
    return res.render('student_dashboard', { student: students[0] });
  } catch (error) {
    return next(error);
  }
});

router.get('/admission-letter', requireStudentAuth, async (req, res, next) => {
  try {
    const [students] = await pool.execute(
      'SELECT admission_number, full_name, admitted_at FROM students WHERE id = ? AND admitted = 1',
      [req.studentId]
    );
    if (!students[0]) return res.redirect('/student/login');
    const student = students[0];
    return res.render('admission_letter', {
      student,
      admissionDate: formatAdmissionDate(student.admitted_at),
      academicYear: admissionLetter.academicYear,
      reportingDate: formatLongDate(admissionLetter.reportingDate, true),
      reportingTime: admissionLetter.reportingTime,
      feeDeadline: formatLongDate(admissionLetter.feeDeadline),
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
