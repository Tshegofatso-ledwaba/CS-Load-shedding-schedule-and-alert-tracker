const { query, transaction } = require('./db');

async function listProvinces() {
  const result = await query('SELECT id::text AS id, name FROM province ORDER BY name');
  return result.rows;
}

async function listCities() {
  const result = await query(`
    SELECT c.id::text AS id, c.name, c.province_id::text AS "provinceId",
           json_build_object('id', p.id::text, 'name', p.name) AS province
    FROM city_municipality c
    JOIN province p ON p.id = c.province_id
    ORDER BY c.name
  `);
  return result.rows;
}

async function listAreas() {
  const result = await query(`
    SELECT a.id::text AS id, a.name, a.city_id::text AS "cityId",
           json_build_object('id', c.id::text, 'name', c.name) AS city,
           json_build_object('id', p.id::text, 'name', p.name) AS province
    FROM area a
    JOIN city_municipality c ON c.id = a.city_id
    JOIN province p ON p.id = c.province_id
    ORDER BY a.name
  `);
  return result.rows;
}

async function listZones() {
  const result = await query(`
    SELECT z.id::text AS id, z.name, s.name AS "suburbName", a.name AS "areaName",
      c.name AS "cityName", p.name AS "provinceName", z.latitude, z.longitude
    FROM zone_block z
    JOIN suburb s ON s.id = z.suburb_id
    JOIN area a ON a.id = s.area_id
    JOIN city_municipality c ON c.id = a.city_id
    JOIN province p ON p.id = c.province_id
    ORDER BY c.name, a.name, s.name, z.name
  `);
  return result.rows;
}

async function searchAreas(search) {
  const result = await query(`
    SELECT z.id::text AS "zoneBlockId", z.name AS "zoneBlockName",
           s.name AS "suburbName", a.id::text AS id, a.name,
           a.city_id::text AS "cityId",
           json_build_object('id', c.id::text, 'name', c.name) AS city,
           json_build_object('id', p.id::text, 'name', p.name) AS province
    FROM area a
    JOIN city_municipality c ON c.id = a.city_id
    JOIN province p ON p.id = c.province_id
    JOIN suburb s ON s.area_id = a.id
    JOIN zone_block z ON z.suburb_id = s.id
    WHERE p.name ILIKE $1 OR c.name ILIKE $1 OR a.name ILIKE $1 OR s.name ILIKE $1 OR z.name ILIKE $1
    ORDER BY a.name, s.name, z.name
  `, [`%${search}%`]);
  return result.rows;
}

async function listAdminLocations(search = '') {
  const result = await query(`
    SELECT z.id::text AS "zoneBlockId", z.name AS "zoneBlockName", z.official_name AS "zoneBlockOfficialName",
         z.geocoder_place_id AS "geocoderPlaceId", z.osm_type AS "osmType", z.osm_id AS "osmId",
           z.latitude, z.longitude, z.boundary_geojson AS "boundaryGeojson",
           s.id::text AS "suburbId", s.name AS "suburbName", a.id::text AS "areaId", a.name AS "areaName",
           c.id::text AS "cityId", c.name AS "cityName", p.id::text AS "provinceId", p.name AS "provinceName"
    FROM zone_block z
    JOIN suburb s ON s.id = z.suburb_id
    JOIN area a ON a.id = s.area_id
    JOIN city_municipality c ON c.id = a.city_id
    JOIN province p ON p.id = c.province_id
    WHERE $1 = '' OR concat_ws(' ', p.name, c.name, a.name, s.name, z.name) ILIKE $2
    ORDER BY p.name, c.name, a.name, s.name, z.name
  `, [search, `%${search}%`]);
  return result.rows;
}

async function getCounts() {
  const result = await query(`
    SELECT (SELECT count(*)::integer FROM area) AS "totalAreas",
           (SELECT count(*)::integer FROM zone_block) AS "totalZones"
  `);
  return result.rows[0];
}

async function nearbyZones(latitude, longitude, radiusMeters = 250) {
  const result = await query(`
    SELECT z.id::text AS "zoneBlockId", z.name AS "zoneBlockName", z.latitude, z.longitude,
           s.name AS "suburbName", a.name AS "areaName", c.name AS "cityName", p.name AS "provinceName",
           (6371000 * 2 * asin(sqrt(
             power(sin(radians(z.latitude - $1) / 2), 2)
             + cos(radians($1)) * cos(radians(z.latitude)) * power(sin(radians(z.longitude - $2) / 2), 2)
           ))) AS "distanceMeters"
    FROM zone_block z
    JOIN suburb s ON s.id = z.suburb_id
    JOIN area a ON a.id = s.area_id
    JOIN city_municipality c ON c.id = a.city_id
    JOIN province p ON p.id = c.province_id
    WHERE z.latitude IS NOT NULL AND z.longitude IS NOT NULL
      AND z.latitude BETWEEN $1 - 0.01 AND $1 + 0.01
      AND z.longitude BETWEEN $2 - 0.015 AND $2 + 0.015
      AND (6371000 * 2 * asin(sqrt(
      power(sin(radians(z.latitude - $1) / 2), 2)
      + cos(radians($1)) * cos(radians(z.latitude)) * power(sin(radians(z.longitude - $2) / 2), 2)
    ))) <= $3
    ORDER BY "distanceMeters", p.name, c.name, a.name, s.name, z.name
    LIMIT 5
  `, [latitude, longitude, radiusMeters]);
  return result.rows;
}

async function listChildren(id) {
  const province = await query('SELECT id FROM province WHERE id::text = $1', [id]);
  if (province.rows[0]) return (await query(`
    SELECT c.id::text AS id, c.name, 'CITY' AS level, p.name AS "parentName"
    FROM city_municipality c JOIN province p ON p.id = c.province_id
    WHERE c.province_id = $1 ORDER BY c.name
  `, [province.rows[0].id])).rows;
  const city = await query('SELECT id FROM city_municipality WHERE id::text = $1', [id]);
  if (city.rows[0]) return (await query(`
    SELECT a.id::text AS id, a.name, 'AREA' AS level, c.name AS "parentName"
    FROM area a JOIN city_municipality c ON c.id = a.city_id
    WHERE a.city_id = $1 ORDER BY a.name
  `, [city.rows[0].id])).rows;
  const area = await query('SELECT id FROM area WHERE id::text = $1', [id]);
  if (area.rows[0]) return (await query(`
    SELECT s.id::text AS id, s.name, 'SUBURB' AS level, a.name AS "parentName"
    FROM suburb s JOIN area a ON a.id = s.area_id
    WHERE s.area_id = $1 ORDER BY s.name
  `, [area.rows[0].id])).rows;
  const suburb = await query('SELECT id FROM suburb WHERE id::text = $1', [id]);
  if (suburb.rows[0]) return (await query(`
    SELECT z.id::text AS id, z.name, 'ZONE_BLOCK' AS level, s.name AS "parentName"
    FROM zone_block z JOIN suburb s ON s.id = z.suburb_id
    WHERE z.suburb_id = $1 ORDER BY z.name
  `, [suburb.rows[0].id])).rows;
  return [];
}

const nodeConfig = {
  province: { table: 'province', parent: null },
  city: { table: 'city_municipality', parent: 'province_id' },
  area: { table: 'area', parent: 'city_id' },
  suburb: { table: 'suburb', parent: 'area_id' },
  zoneBlock: { table: 'zone_block', parent: 'suburb_id' },
};

async function findOrCreateNode(client, level, name, parentId, metadata = {}) {
  const config = nodeConfig[level];
  const providerColumn = level === 'zoneBlock' ? 'geocoder_place_id' : 'map_provider_id';
  if (!config || !name?.trim()) throw new Error(`${level} name is required.`);
  const parentClause = config.parent ? ` AND ${config.parent} = $2` : '';
  const params = config.parent ? [name.trim(), parentId] : [name.trim()];
  let existing;
  if (metadata.geocoderPlaceId && level === 'zoneBlock') {
    existing = await client.query('SELECT id FROM zone_block WHERE geocoder_place_id = $1 LIMIT 1', [metadata.geocoderPlaceId]);
  }
  if (!existing?.rows[0]) {
    existing = await client.query(`SELECT id FROM ${config.table} WHERE lower(name) = lower($1)${parentClause} LIMIT 1`, params);
  }
  const coordinates = [metadata.latitude ?? null, metadata.longitude ?? null];
  if (existing.rows[0]) {
    const updated = await client.query(`
      UPDATE ${config.table}
      SET official_name = coalesce(official_name, $2),
          ${providerColumn} = coalesce(${providerColumn}, $3),
          latitude = coalesce(latitude, $4), longitude = coalesce(longitude, $5), updated_at = now()
      WHERE id = $1 RETURNING id
    `, [existing.rows[0].id, metadata.officialName || name.trim(), metadata.geocoderPlaceId || null, ...coordinates]);
    return updated.rows[0].id;
  }
  const columns = [config.parent, 'name', 'official_name', providerColumn, 'latitude', 'longitude'].filter(Boolean);
  const values = [...(config.parent ? [parentId] : []), name.trim(), metadata.officialName || name.trim(), metadata.geocoderPlaceId || null, ...coordinates];
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
  const inserted = await client.query(`INSERT INTO ${config.table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`, values);
  return inserted.rows[0].id;
}

async function createLocation(location) {
  return transaction(async (client) => {
    const provinceId = await findOrCreateNode(client, 'province', location.province.name, null, location.province);
    const cityId = await findOrCreateNode(client, 'city', location.city.name, provinceId, location.city);
    const areaId = await findOrCreateNode(client, 'area', location.area.name, cityId, location.area);
    const suburbId = await findOrCreateNode(client, 'suburb', location.suburb.name, areaId, location.suburb);
    const zoneBlockId = await findOrCreateNode(client, 'zoneBlock', location.zoneBlock.name, suburbId, {
      ...location.zoneBlock,
      geocoderPlaceId: location.geocoderPlaceId,
      osmType: location.osmType,
      osmId: location.osmId,
      latitude: location.latitude,
      longitude: location.longitude,
      officialName: location.officialName,
    });
    await client.query(`
      UPDATE zone_block SET osm_type = coalesce($2, osm_type), osm_id = coalesce($3, osm_id)
      WHERE id = $1
    `, [zoneBlockId, location.osmType || null, location.osmId || null]);
    const result = await client.query(`
            SELECT z.id::text AS "zoneBlockId", z.name AS "zoneBlockName", z.official_name AS "officialName",
              z.geocoder_place_id AS "geocoderPlaceId", z.osm_type AS "osmType", z.osm_id AS "osmId", z.latitude, z.longitude, s.name AS "suburbName",
             a.name AS "areaName", c.name AS "cityName", p.name AS "provinceName"
      FROM zone_block z JOIN suburb s ON s.id = z.suburb_id JOIN area a ON a.id = s.area_id
      JOIN city_municipality c ON c.id = a.city_id JOIN province p ON p.id = c.province_id
      WHERE z.id = $1
    `, [zoneBlockId]);
    return result.rows[0];
  });
}

async function updateZoneBlock(id, changes) {
  return transaction(async (client) => {
    const current = await client.query(`
      SELECT z.id AS zone_id, s.id AS suburb_id, a.id AS area_id, c.id AS city_id, p.id AS province_id
      FROM zone_block z JOIN suburb s ON s.id = z.suburb_id JOIN area a ON a.id = s.area_id
      JOIN city_municipality c ON c.id = a.city_id JOIN province p ON p.id = c.province_id
      WHERE z.id::text = $1 FOR UPDATE OF z, s, a, c, p
    `, [id]);
    if (!current.rows[0]) return null;
    const row = current.rows[0];
    await client.query('UPDATE province SET name = $2, updated_at = now() WHERE id = $1', [row.province_id, changes.province]);
    await client.query('UPDATE city_municipality SET name = $2, updated_at = now() WHERE id = $1', [row.city_id, changes.city]);
    await client.query('UPDATE area SET name = $2, updated_at = now() WHERE id = $1', [row.area_id, changes.area]);
    await client.query('UPDATE suburb SET name = $2, updated_at = now() WHERE id = $1', [row.suburb_id, changes.suburb]);
    const result = await client.query(`
      UPDATE zone_block SET name = $2, official_name = $3,
        latitude = coalesce($4, latitude), longitude = coalesce($5, longitude),
        geocoder_place_id = coalesce($6, geocoder_place_id),
        osm_type = coalesce($7, osm_type), osm_id = coalesce($8, osm_id), updated_at = now()
      WHERE id = $1
      RETURNING id::text AS "zoneBlockId", name AS "zoneBlockName", official_name AS "officialName",
                geocoder_place_id AS "geocoderPlaceId", osm_type AS "osmType", osm_id AS "osmId", latitude, longitude
    `, [row.zone_id, changes.zoneBlock, changes.officialName || changes.zoneBlock, changes.latitude, changes.longitude, changes.geocoderPlaceId || null, changes.osmType || null, changes.osmId || null]);
    return result.rows[0];
  });
}

async function deleteZoneBlock(id) {
  return transaction(async (client) => {
    const zone = await client.query('SELECT id FROM zone_block WHERE id::text = $1 FOR UPDATE', [id]);
    if (!zone.rows[0]) return null;
    const dependent = await client.query('SELECT 1 FROM schedule WHERE zone_block_id::text = $1 LIMIT 1', [id]);
    if (dependent.rowCount) return { deleted: false, reason: 'Schedules are attached to this Zone/Block.' };
    const result = await client.query('DELETE FROM zone_block WHERE id = $1 RETURNING id', [zone.rows[0].id]);
    return result.rowCount ? { deleted: true } : null;
  });
}

async function findLocation(id) {
  const result = await query(`
        SELECT z.id::text AS id, z.name, z.official_name AS "officialName",
          z.geocoder_place_id AS "geocoderPlaceId", z.osm_type AS "osmType", z.osm_id AS "osmId",
          z.latitude, z.longitude, z.boundary_geojson AS "boundaryGeojson",
           json_build_object('id', s.id::text, 'name', s.name) AS suburb,
           json_build_object('id', a.id::text, 'name', a.name) AS area,
           json_build_object('id', c.id::text, 'name', c.name) AS city,
           json_build_object('id', p.id::text, 'name', p.name) AS province
    FROM zone_block z
    JOIN suburb s ON s.id = z.suburb_id
    JOIN area a ON a.id = s.area_id
    JOIN city_municipality c ON c.id = a.city_id
    JOIN province p ON p.id = c.province_id
    WHERE z.id::text = $1 OR z.name ILIKE $2 OR lower(replace(z.name, ' ', '-')) = lower($1)
      OR a.id::text = $1 OR a.name ILIKE $2
    ORDER BY CASE WHEN z.id::text = $1 OR lower(replace(z.name, ' ', '-')) = lower($1) THEN 0 WHEN a.id::text = $1 THEN 1 ELSE 2 END
    LIMIT 1
  `, [id, id]);
  return result.rows[0] || null;
}

module.exports = {
  listProvinces,
  listCities,
  listAreas,
  listZones,
  searchAreas,
  findLocation,
  listAdminLocations,
  getCounts,
  nearbyZones,
  createLocation,
  updateZoneBlock,
  deleteZoneBlock,
};