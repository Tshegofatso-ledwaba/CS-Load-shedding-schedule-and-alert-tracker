require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const { Client } = require('pg');

async function migrate() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to run migrations.');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    const schema = await fs.readFile(path.resolve(__dirname, '../../database/schema.sql'), 'utf8');
    await client.query(schema);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migration (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const migrationDirectory = path.resolve(__dirname, '../../database/migrations');
    const migrations = (await fs.readdir(migrationDirectory)).filter((file) => file.endsWith('.sql')).sort();
    for (const file of migrations) {
      const applied = await client.query('SELECT 1 FROM schema_migration WHERE version = $1', [file]);
      if (applied.rowCount) continue;
      const migration = await fs.readFile(path.join(migrationDirectory, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(migration);
        await client.query('INSERT INTO schema_migration (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Applied ${file}.`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
    console.log('Database schema and migrations applied successfully.');
  } catch (error) {
    throw error;
  } finally {
    await client.end();
  }
}

migrate().catch((error) => {
  console.error(`Database migration failed: ${error.message}`);
  process.exitCode = 1;
});