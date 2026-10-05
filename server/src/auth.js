const bcrypt = require('bcryptjs');
const { query } = require('./db');

async function findAdministrator(email) {
  const result = await query('SELECT email, password_hash AS "passwordHash", role FROM administrator WHERE lower(email) = lower($1)', [email]);
  return result.rows[0] || null;
}

async function createAdministrator(email, password) {
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const result = await query(`
      INSERT INTO administrator (email, password_hash, role)
      VALUES ($1, $2, 'ADMIN')
      RETURNING email, role
    `, [email, passwordHash]);
    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') return null;
    throw error;
  }
}

module.exports = { bcrypt, findAdministrator, createAdministrator };