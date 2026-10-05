const assert = require('assert');
const jwt = require('jsonwebtoken');
const app = require('../src/index');
const { databaseEnabled, query } = require('../src/db');

(async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const token = jwt.sign({ email: 'admin@powertrack.local', role: 'ADMIN' }, process.env.JWT_SECRET || 'local-development-secret-change-me');
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const provinceName = `Location Test Province ${suffix}`;
  let zoneBlockId;
  let scheduleId;

  try {
    const unauthorized = await fetch(`${base}/api/admin/locations`);
    assert.strictEqual(unauthorized.status, 401);
    const publicGeocoderHasNoMinimumQuery = await fetch(`${base}/api/location/search?q=ZA`);
    assert.strictEqual(publicGeocoderHasNoMinimumQuery.status, 400);
    const invalidReverseCoordinates = await fetch(`${base}/api/location/reverse?lat=0&lon=0`);
    assert.strictEqual(invalidReverseCoordinates.status, 400);
    const unauthorizedCreate = await fetch(`${base}/api/admin/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.strictEqual(unauthorizedCreate.status, 401);
    if (!databaseEnabled()) {
      const localHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      const localList = await fetch(`${base}/api/admin/locations?q=`, { headers: localHeaders }).then((response) => response.json());
      assert.ok(Array.isArray(localList) && localList.length > 0, 'Local admin location list should be available without a database.');
      const payload = {
        geocoderPlaceId: `local/zone/${suffix}`,
        osmType: 'node',
        osmId: `local-${suffix}`,
        officialName: `Local created place ${suffix}`,
        latitude: -25.75,
        longitude: 28.25,
        province: { name: 'Gauteng' },
        city: { name: 'City of Tshwane' },
        area: { name: 'Local Area' },
        suburb: { name: `Local Suburb ${suffix}` },
        zoneBlock: { name: `Local Zone ${suffix}` },
      };
      const createResponse = await fetch(`${base}/api/admin/locations`, { method: 'POST', headers: localHeaders, body: JSON.stringify(payload) });
      const created = await createResponse.json();
      assert.strictEqual(createResponse.status, 201, JSON.stringify(created));
      assert.strictEqual(created.zoneBlockName, payload.zoneBlock.name);
      const editResponse = await fetch(`${base}/api/admin/locations/${created.zoneBlockId}`, {
        method: 'PUT',
        headers: localHeaders,
        body: JSON.stringify({
          province: payload.province.name,
          city: payload.city.name,
          area: payload.area.name,
          suburb: payload.suburb.name,
          zoneBlock: `${payload.zoneBlock.name} Updated`,
          officialName: payload.officialName,
          geocoderPlaceId: payload.geocoderPlaceId,
          osmType: payload.osmType,
          osmId: payload.osmId,
          latitude: payload.latitude,
          longitude: payload.longitude,
        }),
      });
      assert.strictEqual(editResponse.status, 200, await editResponse.text());
      const deleteResponse = await fetch(`${base}/api/admin/locations/${created.zoneBlockId}`, { method: 'DELETE', headers: localHeaders });
      assert.strictEqual(deleteResponse.status, 200, await deleteResponse.text());
      console.log('Local admin location CRUD tests passed.');
      return;
    }

    const payload = {
      geocoderPlaceId: `node/way/${suffix}`,
      osmType: 'way',
      osmId: suffix,
      officialName: `Test place ${suffix}`,
      latitude: -26.2,
      longitude: 28.0,
      province: { name: provinceName },
      city: { name: `Test City ${suffix}` },
      area: { name: `Test Area ${suffix}` },
      suburb: { name: `Test Suburb ${suffix}` },
      zoneBlock: { name: `Test Zone ${suffix}` },
    };
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
    const createdResponse = await fetch(`${base}/api/admin/locations`, { method: 'POST', headers, body: JSON.stringify(payload) });
    const created = await createdResponse.json();
    assert.strictEqual(createdResponse.status, 201, JSON.stringify(created));
    zoneBlockId = created.zoneBlockId;
    assert.strictEqual(created.geocoderPlaceId, payload.geocoderPlaceId);

    const duplicateResponse = await fetch(`${base}/api/admin/locations`, { method: 'POST', headers, body: JSON.stringify(payload) });
    const duplicate = await duplicateResponse.json();
    assert.strictEqual(duplicateResponse.status, 201);
    assert.strictEqual(duplicate.zoneBlockId, zoneBlockId);

    const publicResults = await fetch(`${base}/api/locations/search?q=${encodeURIComponent(payload.zoneBlock.name)}`).then((response) => response.json());
    assert.ok(publicResults.some((item) => item.zoneBlockId === zoneBlockId));
    const coordinateMatches = await fetch(`${base}/api/location/match?lat=${payload.latitude}&lon=${payload.longitude}`).then((response) => response.json());
    assert.ok(coordinateMatches.matches.some((item) => item.zoneBlockId === zoneBlockId));

    const locations = await fetch(`${base}/api/admin/locations?q=${encodeURIComponent(payload.zoneBlock.name)}`, { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.json());
    assert.ok(locations.some((item) => item.zoneBlockId === zoneBlockId));
    const dashboard = await fetch(`${base}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } }).then((response) => response.json());
    assert.ok(dashboard.stats.totalZones >= 1 && Number.isInteger(dashboard.stats.totalSchedules));

    const scheduleDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(Date.now() + 30 * 86400000));
    const scheduleResponse = await fetch(`${base}/api/admin/schedules`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ zoneBlockId, stage: 2, date: scheduleDate, startTime: '18:00', endTime: '19:00', source: 'ADMIN' }),
    });
    const schedule = await scheduleResponse.json();
    assert.strictEqual(scheduleResponse.status, 201, JSON.stringify(schedule));
    scheduleId = schedule.id;

    const protectedDelete = await fetch(`${base}/api/admin/locations/${zoneBlockId}`, { method: 'DELETE', headers });
    assert.strictEqual(protectedDelete.status, 409);

    const editedPayload = {
      province: `${payload.province.name} Updated`,
      city: `${payload.city.name} Updated`,
      area: `${payload.area.name} Updated`,
      suburb: `${payload.suburb.name} Updated`,
      zoneBlock: `${payload.zoneBlock.name} Updated`,
      officialName: payload.officialName,
      latitude: payload.latitude,
      longitude: payload.longitude,
    };
    const editResponse = await fetch(`${base}/api/admin/locations/${zoneBlockId}`, { method: 'PUT', headers, body: JSON.stringify(editedPayload) });
    assert.strictEqual(editResponse.status, 200);
    const editedResults = await fetch(`${base}/api/locations/search?q=${encodeURIComponent(editedPayload.zoneBlock)}`).then((response) => response.json());
    assert.ok(editedResults.some((item) => item.zoneBlockId === zoneBlockId));

    const publicSchedule = await fetch(`${base}/api/schedules/upcoming?zoneBlockId=${zoneBlockId}`).then((response) => response.json());
    assert.ok(publicSchedule.some((item) => item.id === scheduleId));
    console.log('Admin location integration tests passed.');
  } finally {
    try {
      if (scheduleId) await query('DELETE FROM schedule WHERE id::text = $1', [scheduleId]);
      if (zoneBlockId && databaseEnabled()) await query(`
        DELETE FROM province WHERE id = (
          SELECT p.id FROM province p JOIN city_municipality c ON c.province_id = p.id
          JOIN area a ON a.city_id = c.id JOIN suburb s ON s.area_id = a.id
          JOIN zone_block z ON z.suburb_id = s.id WHERE z.id::text = $1 LIMIT 1
        )
      `, [zoneBlockId]);
    } finally {
      server.close();
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});