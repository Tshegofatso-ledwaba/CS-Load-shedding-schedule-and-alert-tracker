const assert = require('assert');
const jwt = require('jsonwebtoken');
const app = require('../src/index');
const { databaseEnabled, query } = require('../src/db');
const { schedules } = require('../src/data');

(async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  const token = jwt.sign({ email: 'admin@powertrack.local', role: 'ADMIN' }, process.env.JWT_SECRET || 'local-development-secret-change-me');
  let created;
  const scheduleDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(Date.now() + 3 * 86400000));

  try {
    const zonesResponse = await fetch(`${base}/api/locations/zones`);
    const zones = await zonesResponse.json();
    assert.strictEqual(zonesResponse.status, 200);
    assert.ok(Array.isArray(zones) && zones.length > 0);

    const createResponse = await fetch(`${base}/api/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        zoneBlockId: 'zone-2',
        stage: 5,
        date: scheduleDate,
        startTime: '18:00',
        endTime: '20:30',
        source: 'ADMIN',
      }),
    });

    created = await createResponse.json();
    assert.strictEqual(createResponse.status, 201, `Expected 201, got ${createResponse.status}: ${JSON.stringify(created)}`);
    assert.ok(typeof created.zoneBlockId === 'string' && created.zoneBlockId.length > 0);
    assert.strictEqual(created.stage, 5);

    const invalidResponse = await fetch(`${base}/api/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        zoneBlockId: 'missing-zone',
        stage: 5,
        date: scheduleDate,
        startTime: '18:00',
        endTime: '20:30',
        source: 'ADMIN',
      }),
    });
    assert.strictEqual(invalidResponse.status, 400);

    for (const invalidWindow of [
      { date: '2026-02-30', startTime: '18:00', endTime: '20:30' },
      { date: scheduleDate, startTime: '18:99', endTime: '20:30' },
    ]) {
      const validationResponse = await fetch(`${base}/api/admin/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ zoneBlockId: 'zone-2', stage: 5, ...invalidWindow, source: 'ADMIN' }),
      });
      assert.strictEqual(validationResponse.status, 400);
    }

    const adminResponse = await fetch(`${base}/api/admin/schedules`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const adminSchedules = await adminResponse.json();
    assert.strictEqual(adminResponse.status, 200);
    assert.ok(adminSchedules.some((item) => item.id === created.id));

    const listResponse = await fetch(`${base}/api/schedules/upcoming?zoneBlockId=zone-2`);
    const list = await listResponse.json();
    assert.strictEqual(listResponse.status, 200);
    assert.ok(Array.isArray(list));
    assert.ok(list.some((item) => item.id === created.id && item.zoneBlockId === created.zoneBlockId && item.stage === 5));

    const overlapResponse = await fetch(`${base}/api/admin/schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ zoneBlockId: created.zoneBlockId, stage: 4, date: scheduleDate, startTime: '19:30', endTime: '21:00', source: 'ADMIN' }),
    });
    assert.strictEqual(overlapResponse.status, 409);

    const updateResponse = await fetch(`${base}/api/admin/schedules/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ zoneBlockId: created.zoneBlockId, stage: 6, date: scheduleDate, startTime: '18:00', endTime: '20:30', source: 'ADMIN' }),
    });
    const updated = await updateResponse.json();
    assert.strictEqual(updateResponse.status, 200, JSON.stringify(updated));
    assert.strictEqual(updated.stage, 6);

    const dashboardResponse = await fetch(`${base}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const dashboard = await dashboardResponse.json();
    assert.strictEqual(dashboardResponse.status, 200, JSON.stringify(dashboard));
    assert.ok(Array.isArray(dashboard.recentUpdates) && dashboard.recentUpdates.length > 0);
    assert.ok(dashboard.recentUpdates.some((item) => typeof item.locationName === 'string' && item.locationName.length > 0));
    assert.ok(dashboard.recentUpdates.some((item) => typeof item.locationPath === 'string' && item.locationPath.length > 0));

    const deleteResponse = await fetch(`${base}/api/admin/schedules/${created.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(deleteResponse.status, 200);
    const deletedList = await fetch(`${base}/api/schedules/upcoming?zoneBlockId=${encodeURIComponent(created.zoneBlockId)}`).then((response) => response.json());
    assert.ok(!deletedList.some((item) => item.id === created.id));

    console.log('Schedule CRUD tests passed.');
  } finally {
    try {
      if (created?.id && databaseEnabled()) await query('DELETE FROM schedule WHERE id::text = $1', [created.id]);
      else if (created?.id) {
        const index = schedules.findIndex((item) => item.id === created.id);
        if (index !== -1) schedules.splice(index, 1);
      }
    } finally {
      server.close();
    }
  }
})();
