require('dotenv').config();
const { Client } = require('pg');

const schedules = [
  [-2, '05:00', '07:30', 3],
  [-1, '18:00', '20:30', 4],
  [0, '12:00', '14:30', 4],
  [0, '20:00', '22:30', 3],
  [1, '06:00', '08:30', 4],
  [1, '16:00', '18:30', 2],
  [2, '10:00', '12:30', 4],
];

async function seedSchedules() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to seed schedules.');
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('BEGIN');
    const zone = await client.query(`
      SELECT z.id FROM zone_block z
      JOIN suburb s ON s.id = z.suburb_id
      JOIN area a ON a.id = s.area_id
      WHERE a.name = 'Soshanguve' AND z.name = 'Zone 2'
      LIMIT 1
    `);
    if (!zone.rows[0]) throw new Error('Canonical Zone 2 location is missing. Run db:seed:locations first.');

    for (const [offset, start, end, stage] of schedules) {
      await client.query(`
        INSERT INTO schedule (zone_block_id, stage, date, start_time, end_time, source)
        SELECT $1, $2, CURRENT_DATE + $3::integer, $4::time, $5::time, 'ADMIN'
        WHERE NOT EXISTS (
          SELECT 1 FROM schedule
          WHERE zone_block_id = $1 AND date = CURRENT_DATE + $3::integer
            AND start_time = $4::time AND end_time = $5::time
        )
      `, [zone.rows[0].id, stage, offset, start, end]);
    }
    await client.query('COMMIT');
    console.log('Canonical schedule seed applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

seedSchedules().catch((error) => {
  console.error(`Schedule seed failed: ${error.message}`);
  process.exitCode = 1;
});