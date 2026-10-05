const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  : null;

function databaseEnabled() {
  return Boolean(pool);
}

async function query(text, values) {
  if (!pool) throw new Error('Database is not configured.');
  return pool.query(text, values);
}

async function transaction(operation) {
  if (!pool) throw new Error('Database is not configured.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { databaseEnabled, query, transaction };