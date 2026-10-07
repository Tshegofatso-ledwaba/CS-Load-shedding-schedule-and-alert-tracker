const assert = require('assert');
const app = require('../src/index');
const { databaseEnabled, query } = require('../src/db');

(async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}/api/locations/search`;
  let fixtureProvinceId;

  try {
    for (const term of ['Gauteng', 'City of Tshwane', 'Soshanguve', 'Soshanguve Block F', 'Zone 2']) {
      const response = await fetch(`${base}?q=${encodeURIComponent(term)}`);
      const results = await response.json();
      assert.strictEqual(response.status, 200);
      assert.ok(results.some((item) => item.name === 'Soshanguve' && item.city?.name && item.province?.name), `${term} should resolve to the canonical Soshanguve area`);
      if (term === 'Zone 2') assert.ok(results.some((item) => item.zoneBlockName === 'Zone 2' && item.zoneBlockId), 'Zone search should identify the exact block');
    }

    const blankResponse = await fetch(`${base}?q=%20%20`);
    assert.deepStrictEqual(await blankResponse.json(), []);

    const unmatchedResponse = await fetch(`${base}?q=not-a-real-location`);
    assert.deepStrictEqual(await unmatchedResponse.json(), []);

    if (databaseEnabled()) {
      const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      const province = await query('INSERT INTO province (name) VALUES ($1) RETURNING id::text AS id', [`Search Test Province ${suffix}`]);
      fixtureProvinceId = province.rows[0].id;
      const city = await query('INSERT INTO city_municipality (province_id, name) VALUES ($1, $2) RETURNING id::text AS id', [fixtureProvinceId, `Search Test City ${suffix}`]);
      const area = await query('INSERT INTO area (city_id, name) VALUES ($1, $2) RETURNING id::text AS id', [city.rows[0].id, `Search Test Area ${suffix}`]);
      const suburb = await query('INSERT INTO suburb (area_id, name) VALUES ($1, $2) RETURNING id::text AS id', [area.rows[0].id, `Search Test Suburb ${suffix}`]);
      const zone = await query('INSERT INTO zone_block (suburb_id, name) VALUES ($1, $2) RETURNING id::text AS id', [suburb.rows[0].id, `Unscheduled Zone ${suffix}`]);

      const unscheduledResults = await fetch(`${base}?q=${encodeURIComponent(`Unscheduled Zone ${suffix}`)}`).then((response) => response.json());
      assert.strictEqual(unscheduledResults.length, 1);
      assert.strictEqual(unscheduledResults[0].zoneBlockId, zone.rows[0].id);

      const location = await fetch(`http://127.0.0.1:${port}/api/locations/${zone.rows[0].id}`).then((response) => response.json());
      assert.strictEqual(location.id, zone.rows[0].id);
      const status = await fetch(`http://127.0.0.1:${port}/api/status/${zone.rows[0].id}`).then((response) => response.json());
      assert.strictEqual(status.status, 'NO_SCHEDULE');
      assert.strictEqual(status.nextOutage, null);
      const upcoming = await fetch(`http://127.0.0.1:${port}/api/schedules/upcoming?zoneBlockId=${zone.rows[0].id}`).then((response) => response.json());
      assert.deepStrictEqual(upcoming, []);
    }
    console.log('Location search tests passed.');
  } finally {
    try {
      if (fixtureProvinceId) await query('DELETE FROM province WHERE id::text = $1', [fixtureProvinceId]);
    } finally {
      server.close();
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});