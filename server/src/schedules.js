const { query, transaction } = require('./db');

const scheduleFields = `
  id::text AS id,
  zone_block_id::text AS "zoneBlockId",
  stage,
  date::text AS date,
  to_char(start_time, 'HH24:MI') AS "startTime",
  to_char(end_time, 'HH24:MI') AS "endTime",
  source,
  updated_at AS "updatedAt"
`;

function zoneFilter(zoneBlockId) {
  return zoneBlockId
    ? { clause: " AND (zone_block_id::text = $1 OR zone_block_id IN (SELECT id FROM zone_block WHERE name = $1 OR lower(replace(name, ' ', '-')) = lower($1)))", values: [zoneBlockId] }
    : { clause: '', values: [] };
}

async function listSchedules(zoneBlockId) {
  const filter = zoneFilter(zoneBlockId);
  const result = await query(`SELECT ${scheduleFields} FROM schedule WHERE TRUE${filter.clause} ORDER BY date, start_time, id`, filter.values);
  return result.rows;
}

async function createSchedule(schedule) {
  return transaction(async (client) => {
    const zone = await client.query(`SELECT id FROM zone_block WHERE id::text = $1 OR lower(replace(name, ' ', '-')) = lower($1) ORDER BY CASE WHEN id::text = $1 THEN 0 ELSE 1 END LIMIT 1`, [schedule.zoneBlockId]);
    if (!zone.rows[0]) return null;
    const zoneId = zone.rows[0].id;
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [zoneId.toString()]);
    const overlap = await client.query(`
      SELECT 1 FROM schedule
      WHERE zone_block_id = $1 AND date = $2::date
        AND start_time < $4::time AND end_time > $3::time
      LIMIT 1
    `, [zoneId, schedule.date, schedule.startTime, schedule.endTime]);
    if (overlap.rowCount) {
      const error = new Error('This outage overlaps an existing schedule for the selected Zone/Block.');
      error.code = 'SCHEDULE_OVERLAP';
      throw error;
    }
    const result = await client.query(`
      INSERT INTO schedule (zone_block_id, stage, date, start_time, end_time, source)
      VALUES ($1, $2, $3::date, $4::time, $5::time, $6)
      RETURNING ${scheduleFields}
    `, [zoneId, schedule.stage, schedule.date, schedule.startTime, schedule.endTime, schedule.source]);
    return result.rows[0];
  });
}

async function updateSchedule(id, schedule) {
  return transaction(async (client) => {
    const current = await client.query('SELECT id, zone_block_id FROM schedule WHERE id::text = $1 FOR UPDATE', [id]);
    if (!current.rows[0]) return null;
    const zone = await client.query(`SELECT id FROM zone_block WHERE id::text = $1 OR lower(replace(name, ' ', '-')) = lower($1) ORDER BY CASE WHEN id::text = $1 THEN 0 ELSE 1 END LIMIT 1`, [schedule.zoneBlockId]);
    if (!zone.rows[0]) return false;
    const zoneId = zone.rows[0].id;
    const lockIds = [current.rows[0].zone_block_id.toString(), zoneId.toString()].sort();
    for (const lockId of lockIds) await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [lockId]);
    const overlap = await client.query(`
      SELECT 1 FROM schedule
      WHERE zone_block_id = $1 AND date = $2::date AND id <> $5
        AND start_time < $4::time AND end_time > $3::time
      LIMIT 1
    `, [zoneId, schedule.date, schedule.startTime, schedule.endTime, current.rows[0].id]);
    if (overlap.rowCount) {
      const error = new Error('This outage overlaps an existing schedule for the selected Zone/Block.');
      error.code = 'SCHEDULE_OVERLAP';
      throw error;
    }
    const result = await client.query(`
      UPDATE schedule SET zone_block_id = $2, stage = $3, date = $4::date, start_time = $5::time,
        end_time = $6::time, source = $7, updated_at = now()
      WHERE id = $1 RETURNING ${scheduleFields}
    `, [current.rows[0].id, zoneId, schedule.stage, schedule.date, schedule.startTime, schedule.endTime, schedule.source]);
    return result.rows[0];
  });
}

async function deleteSchedule(id) {
  const result = await query('DELETE FROM schedule WHERE id::text = $1 RETURNING id::text AS id', [id]);
  return result.rows[0] || null;
}

async function listUpcoming(zoneBlockId) {
  const filter = zoneFilter(zoneBlockId);
  const result = await query(`
    SELECT ${scheduleFields}
    FROM schedule
    WHERE (date + start_time) > (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')${filter.clause}
    ORDER BY date, start_time, id
  `, filter.values);
  return result.rows;
}

async function listHistory(zoneBlockId) {
  const filter = zoneFilter(zoneBlockId);
  const result = await query(`
    SELECT ${scheduleFields}
    FROM schedule
    WHERE (date + end_time) < (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')${filter.clause}
    ORDER BY date DESC, start_time DESC, id DESC
  `, filter.values);
  return result.rows;
}

async function findSchedule(id) {
  const result = await query(`SELECT ${scheduleFields} FROM schedule WHERE id::text = $1`, [id]);
  return result.rows[0] || null;
}

async function adminDashboard() {
  const result = await query(`
    SELECT
      count(*)::integer AS "totalSchedules",
      count(*) FILTER (WHERE (date + start_time) > (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg'))::integer AS "upcomingSchedules"
    FROM schedule
  `);
  const recent = await query(`
    SELECT id::text AS id, zone_block_id::text AS "zoneBlockId", date::text AS date,
           to_char(start_time, 'HH24:MI') AS "startTime", to_char(end_time, 'HH24:MI') AS "endTime", stage, source
    FROM schedule ORDER BY updated_at DESC, date DESC, start_time DESC LIMIT 4
  `);
  return { stats: result.rows[0], recentUpdates: recent.rows };
}

module.exports = { createSchedule, updateSchedule, deleteSchedule, listSchedules, listUpcoming, listHistory, findSchedule, adminDashboard };