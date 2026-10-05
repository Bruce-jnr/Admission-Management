const path = require('path');
require('dotenv').config();

const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];

function validateConfig() {
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length)
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  if (process.env.JWT_SECRET.length < 32)
    throw new Error('JWT_SECRET must contain at least 32 characters');
  if (process.env.PIN_ENCRYPTION_KEY && process.env.PIN_ENCRYPTION_KEY.length < 32)
    throw new Error('PIN_ENCRYPTION_KEY must contain at least 32 characters');
  const bootstrapPassword =
    process.env.SUPER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!bootstrapPassword) throw new Error('SUPER_ADMIN_PASSWORD is required');
  if (process.env.SUPER_ADMIN_PASSWORD && bootstrapPassword.length < 8)
    throw new Error('SUPER_ADMIN_PASSWORD must contain at least 8 characters');
  if (!process.env.SUPER_ADMIN_PASSWORD && bootstrapPassword.length < 8)
    console.warn(
      'Legacy ADMIN_PASSWORD is being used for bootstrap. Reset it from Manage Users immediately.',
    );
  for (const [name, value] of [
    ['REPORTING_DATE', process.env.REPORTING_DATE || '2026-11-11'],
    ['FEE_DEADLINE', process.env.FEE_DEADLINE || '2026-11-10'],
  ]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T12:00:00`).getTime()))
      throw new Error(`${name} must use YYYY-MM-DD format`);
  }
}

module.exports = {
  validateConfig,
  port: Number(process.env.PORT) || 3000,
  isProduction: process.env.NODE_ENV === 'production',
  jwtSecret: process.env.JWT_SECRET,
  pinEncryptionSecret: process.env.PIN_ENCRYPTION_KEY || process.env.JWT_SECRET,
  superAdminUsername: (process.env.SUPER_ADMIN_USERNAME || 'superadmin')
    .trim()
    .toLowerCase(),
  superAdminPassword:
    process.env.SUPER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD,
  database: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  },
  documentsDirectory: path.join(__dirname, 'documents'),
  admissionLetter: {
    academicYear: process.env.ACADEMIC_YEAR || '2026/2027',
    reportingDate: process.env.REPORTING_DATE || '2026-11-11',
    reportingTime: process.env.REPORTING_TIME || '6:00pm',
    feeDeadline: process.env.FEE_DEADLINE || '2026-11-10',
  },
};
