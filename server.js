const express = require('express');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const { pool, initializeDatabase } = require('./db/connection');
const { sendSMS } = require('./utils/sms');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Initialize database on startup
initializeDatabase();

// Helper function to generate 6-digit PIN
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper function to check admin authentication
function requireAdminAuth(req, res, next) {
  if (req.session.isAdmin) {
    next();
  } else {
    res.redirect('/admin/login');
  }
}

// Helper function to check student authentication
function requireStudentAuth(req, res, next) {
  if (req.session.studentId) {
    next();
  } else {
    res.redirect('/student/login');
  }
}

// Routes

// Home page - redirect to admin
app.get('/', (req, res) => {
  res.redirect('/admin');
});

// Admin Login
app.get('/admin/login', (req, res) => {
  res.render('admin_login', { error: null });
});

app.post('/admin/login', async (req, res) => {
  const { password } = req.body;

  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    res.redirect('/admin');
  } else {
    res.render('admin_login', { error: 'Invalid password' });
  }
});

// Admin Dashboard
app.get('/admin', requireAdminAuth, async (req, res) => {
  try {
    const [students] = await pool.execute(
      'SELECT * FROM students ORDER BY created_at DESC'
    );
    res.render('admin_dashboard', { students });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).send('Error fetching students');
  }
});

// Add Student
app.post('/admin/add-student', requireAdminAuth, async (req, res) => {
  try {
    const { admission_number, full_name, phone_number } = req.body;

    // Check if admission number already exists
    const [existing] = await pool.execute(
      'SELECT id FROM students WHERE admission_number = ?',
      [admission_number]
    );

    if (existing.length > 0) {
      return res.json({
        success: false,
        message: 'Admission number already exists',
      });
    }

    // Insert new student
    await pool.execute(
      'INSERT INTO students (admission_number, full_name, phone_number) VALUES (?, ?, ?)',
      [admission_number, full_name, phone_number]
    );

    res.json({ success: true, message: 'Student added successfully' });
  } catch (error) {
    console.error('Error adding student:', error);
    res.status(500).json({ success: false, message: 'Error adding student' });
  }
});

// Admit Student
app.post('/admit/:id', requireAdminAuth, async (req, res) => {
  try {
    const studentId = req.params.id;
    const pin = generatePIN();

    // Update student status and add PIN
    await pool.execute(
      'UPDATE students SET admitted = 1, pin_code = ? WHERE id = ?',
      [pin, studentId]
    );

    // Get student details
    const [students] = await pool.execute(
      'SELECT * FROM students WHERE id = ?',
      [studentId]
    );

    if (students.length > 0) {
      const student = students[0];
      const baseURL = `${req.protocol}://${req.get('host')}`;

      // Send SMS
      const message = `Congratulations ${student.full_name}! You have been admitted to our institution. Your admission number is ${student.admission_number} and your PIN is ${pin}. Visit ${baseURL}/student/login to access your admission documents.`;

      await sendSMS(student.phone_number, message);

      res.json({
        success: true,
        message: 'Student admitted and SMS sent successfully',
      });
    } else {
      res.status(404).json({ success: false, message: 'Student not found' });
    }
  } catch (error) {
    console.error('Error admitting student:', error);
    res
      .status(500)
      .json({ success: false, message: 'Error admitting student' });
  }
});

// Bulk Admit All Pending Students
app.post('/admin/bulk-admit', requireAdminAuth, async (req, res) => {
  try {
    // Get all pending students
    const [pendingStudents] = await pool.execute(
      'SELECT * FROM students WHERE admitted = 0'
    );

    if (pendingStudents.length === 0) {
      return res.json({
        success: false,
        message: 'No pending students to admit',
      });
    }

    const baseURL = `${req.protocol}://${req.get('host')}`;
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each pending student
    for (const student of pendingStudents) {
      try {
        const pin = generatePIN();

        // Update student status and add PIN
        await pool.execute(
          'UPDATE students SET admitted = 1, pin_code = ? WHERE id = ?',
          [pin, student.id]
        );

        // Send SMS
        const message = `Congratulations ${student.full_name}! You have been admitted to our institution. Your admission number is ${student.admission_number} and your PIN is ${pin}. Visit ${baseURL}/student/login to access your admission documents.`;

        const smsResult = await sendSMS(student.phone_number, message);

        if (smsResult.success) {
          successCount++;
        } else {
          errorCount++;
          errors.push(`${student.full_name}: SMS failed`);
        }
      } catch (error) {
        errorCount++;
        errors.push(`${student.full_name}: ${error.message}`);
        console.error(`Error admitting student ${student.full_name}:`, error);
      }
    }

    let message = `Successfully admitted ${successCount} students`;
    if (errorCount > 0) {
      message += `, ${errorCount} errors occurred`;
    }

    res.json({
      success: true,
      message: message,
      details: {
        total: pendingStudents.length,
        success: successCount,
        errors: errorCount,
        errorList: errors,
      },
    });
  } catch (error) {
    console.error('Error in bulk admit:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing bulk admission',
    });
  }
});

// Student Login
app.get('/student/login', (req, res) => {
  res.render('student_login', { error: null });
});

app.post('/student/login', async (req, res) => {
  const { admission_number, pin } = req.body;

  try {
    const [students] = await pool.execute(
      'SELECT * FROM students WHERE admission_number = ? AND pin_code = ? AND admitted = 1',
      [admission_number, pin]
    );

    if (students.length > 0) {
      req.session.studentId = students[0].id;
      res.redirect('/student/dashboard');
    } else {
      res.render('student_login', { error: 'Invalid admission number or PIN' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.render('student_login', { error: 'Login failed' });
  }
});

// Student Dashboard
app.get('/student/dashboard', requireStudentAuth, async (req, res) => {
  try {
    const [students] = await pool.execute(
      'SELECT * FROM students WHERE id = ?',
      [req.session.studentId]
    );

    if (students.length > 0) {
      const student = students[0];
      res.render('student_dashboard', { student });
    } else {
      res.redirect('/student/login');
    }
  } catch (error) {
    console.error('Error fetching student data:', error);
    res.redirect('/student/login');
  }
});

// Download Admission Letter
app.get('/student/admission-letter', requireStudentAuth, async (req, res) => {
  try {
    const [students] = await pool.execute(
      'SELECT * FROM students WHERE id = ?',
      [req.session.studentId]
    );

    if (students.length > 0) {
      const student = students[0];
      res.render('admission_letter', { student });
    } else {
      res.status(404).send('Student not found');
    }
  } catch (error) {
    console.error('Error generating admission letter:', error);
    res.status(500).send('Error generating admission letter');
  }
});

// Static PDF downloads (no authentication required for direct access)
app.get('/documents/prospectus.pdf', (req, res) => {
  const filePath =
    'D:\\Admission Management\\public\\css\\documents\\Prospectus.pdf';
  console.log('Prospectus download requested, file path:', filePath);
  console.log('File exists:', require('fs').existsSync(filePath));
  res.download(filePath, 'Prospectus.pdf');
});

app.get('/documents/acceptance-letter.pdf', (req, res) => {
  const filePath = 'public/css/documents/Acceptance Letter.pdf';
  res.download(filePath, 'Acceptance Letter.pdf');
});

// Download PDF (kept for backward compatibility)
app.get('/student/download/:type', requireStudentAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const [students] = await pool.execute(
      'SELECT * FROM students WHERE id = ?',
      [req.session.studentId]
    );

    if (students.length > 0) {
      const student = students[0];
      const path = require('path');

      if (type === 'prospectus') {
        const filePath = 'public/css/documents/Prospectus.pdf';
        console.log('Prospectus download requested, file path:', filePath);
        console.log('File exists:', require('fs').existsSync(filePath));
        res.download(filePath, 'Prospectus.pdf');
      } else if (type === 'acceptance') {
        const filePath = path.join(
          __dirname,
          'public',
          'css',
          'documents',
          'Acceptance Letter.pdf'
        );
        res.download(filePath, 'Acceptance Letter.pdf');
      } else {
        res.status(400).send('Invalid download type');
      }
    } else {
      res.status(404).send('Student not found');
    }
  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).send('Error downloading PDF');
  }
});

// Logout
app.post('/logout', (req, res) => {
  const wasStudent = req.session.studentId;
  req.session.destroy();

  if (wasStudent) {
    res.redirect('/student/login');
  } else {
    res.redirect('/admin/login');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
