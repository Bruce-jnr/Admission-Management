const { pool } = require('../db/connection');
const { hashPassword, validatePassword } = require('../services/password');

async function resetSuperAdmin() {
  const username = String(process.env.SUPER_ADMIN_USERNAME || 'superadmin')
    .trim()
    .toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const passwordError = validatePassword(password);

  if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
    throw new Error('SUPER_ADMIN_USERNAME is invalid');
  }
  if (passwordError) {
    throw new Error(`SUPER_ADMIN_PASSWORD: ${passwordError}`);
  }

  const [result] = await pool.execute(
    `UPDATE admin_users
     SET username = ?, password_hash = ?, active = 1,
         token_version = token_version + 1
     WHERE role = 'super_admin'`,
    [username, await hashPassword(password)],
  );

  if (result.affectedRows !== 1) {
    throw new Error(`Expected one super admin, updated ${result.affectedRows}`);
  }
  console.log(`Super admin credentials reset successfully for: ${username}`);
}

resetSuperAdmin()
  .catch((error) => {
    console.error(`Reset failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
