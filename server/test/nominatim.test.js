const assert = require('assert');
const app = require('../src/index');
const { databaseEnabled, query } = require('../src/db');
const { reverseAddress, searchAddresses } = require('../src/nominatim');

const fixture = {
  place_id: 123,
  osm_type: 'way',
  osm_id: 456,
  display_name: 'Soshanguve Block L, City of Tshwane, Gauteng, South Africa',
  lat: '-25.51001',
  lon: '28.09002',
  address: {
    state: 'Gauteng',
    municipality: 'City of Tshwane',
    city: 'Pretoria',
    suburb: 'Soshanguve',
    neighbourhood: 'Block L',
    road: 'Example Road',
    postcode: '0152',
  },
};

(async () => {
  const calls = [];
  const fakeFetch = async (url, options) => {
    calls.push({ url: new URL(url), options });
    return { ok: true, status: 200, json: async () => url.pathname.endsWith('/search') ? [fixture] : fixture };
  };

  const search = await searchAddresses('Soshanguve Block L', fakeFetch);
  assert.strictEqual(search.length, 1);
  assert.strictEqual(search[0].geocoderPlaceId, 'way/456');
  assert.strictEqual(search[0].latitude, -25.51001);
  assert.strictEqual(search[0].longitude, 28.09002);
  assert.strictEqual(search[0].osmType, 'way');
  assert.strictEqual(search[0].address.province, 'Gauteng');
  assert.strictEqual(search[0].address.municipality, 'City of Tshwane');
  assert.strictEqual(search[0].address.suburb, 'Soshanguve');
  assert.strictEqual(search[0].address.zoneBlock, null);
  assert.strictEqual(calls[0].url.searchParams.get('countrycodes'), 'za');
  assert.strictEqual(calls[0].url.searchParams.get('addressdetails'), '1');
  assert.match(calls[0].options.headers['User-Agent'], /^PowerTrack\/1\.0/);

  const originalFetch = global.fetch;
  global.fetch = fakeFetch;
  const server = app.listen(0);
  const { port } = server.address();
  try {
    const routeSearch = await originalFetch(`http://127.0.0.1:${port}/api/location/search?q=${encodeURIComponent('Soshanguve Block L route test')}`);
    assert.strictEqual(routeSearch.status, 200);
    assert.strictEqual((await routeSearch.json())[0].address.province, 'Gauteng');
    const routeReverse = await originalFetch(`http://127.0.0.1:${port}/api/location/reverse?lat=-25.51001&lon=28.09002`);
    assert.strictEqual(routeReverse.status, 200);
    assert.strictEqual((await routeReverse.json()).osmId, '456');
    if (databaseEnabled()) {
      const zones = await query(`
        SELECT id::text AS id, latitude, longitude FROM zone_block
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY id LIMIT 1
      `);
      if (zones.rows[0]) {
        const matches = await originalFetch(`http://127.0.0.1:${port}/api/location/match?lat=${zones.rows[0].latitude}&lon=${zones.rows[0].longitude}`).then((response) => response.json());
        assert.ok(matches.matches.some((item) => item.zoneBlockId === zones.rows[0].id));
      }
      }
  } finally {
    server.close();
    global.fetch = originalFetch;
  }

  const cachedSearch = await searchAddresses('  Soshanguve   Block L ', fakeFetch);
  assert.deepStrictEqual(cachedSearch, search);
  assert.strictEqual(calls.length, 3);

  const reverse = await reverseAddress(-25.51, 28.09, fakeFetch);
  assert.strictEqual(reverse.displayName, fixture.display_name);
  assert.strictEqual(calls[3].url.pathname, '/reverse');
  assert.strictEqual(calls[3].url.searchParams.get('lat'), '-25.51');

  await assert.rejects(() => searchAddresses('ZA'), (error) => error.status === 400);
  await assert.rejects(() => reverseAddress(0, 0, fakeFetch), (error) => error.status === 400);
  await assert.rejects(() => searchAddresses('nonexistent place', async () => ({ ok: false, status: 429 })), (error) => error.status === 429);
  await assert.rejects(() => searchAddresses('invalid payload test', async () => ({ ok: true, status: 200, json: async () => ({}) })), (error) => error.status === 502);

  console.log('Nominatim integration tests passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});