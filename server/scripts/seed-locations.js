require('dotenv').config();
const { Client } = require('pg');

async function seedLocations() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to seed locations.');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query('BEGIN');
    const province = await client.query(`
      INSERT INTO province (name) VALUES ('Gauteng')
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    const city = await client.query(`
      INSERT INTO city_municipality (province_id, name) VALUES ($1, 'City of Tshwane')
      ON CONFLICT (province_id, name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [province.rows[0].id]);
    const area = await client.query(`
      INSERT INTO area (city_id, name) VALUES ($1, 'Soshanguve')
      ON CONFLICT (city_id, name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [city.rows[0].id]);
    const suburb = await client.query(`
      INSERT INTO suburb (area_id, name) VALUES ($1, 'Soshanguve Block F')
      ON CONFLICT (area_id, name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [area.rows[0].id]);
    await client.query(`
      INSERT INTO zone_block (suburb_id, name) VALUES ($1, 'Zone 2')
      ON CONFLICT (suburb_id, name) DO UPDATE SET name = EXCLUDED.name
    `, [suburb.rows[0].id]);
    await client.query('COMMIT');
    console.log('Canonical location seed applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

seedLocations().catch((error) => {
  console.error(`Location seed failed: ${error.message}`);
  process.exitCode = 1;
});