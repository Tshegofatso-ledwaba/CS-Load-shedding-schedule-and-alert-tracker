const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const MIN_REQUEST_INTERVAL_MS = 1000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_LIMIT = 300;
const cache = new Map();
let requestQueue = Promise.resolve();
let lastRequestAt = 0;

function nullable(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeAddress(address = {}) {
  return {
    province: nullable(address.state),
    municipality: nullable(address.municipality || address.county || address.city_district),
    city: nullable(address.city || address.town || address.village || address.hamlet),
    town: nullable(address.town || address.village || address.hamlet),
    area: nullable(address.city_district || address.suburb || address.district || address.quarter),
    suburb: nullable(address.suburb || address.neighbourhood || address.residential || address.quarter),
    zoneBlock: null,
    road: nullable(address.road || address.pedestrian || address.footway),
    postcode: nullable(address.postcode),
  };
}

function normalizeResult(item) {
  const latitude = Number(item?.lat);
  const longitude = Number(item?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const osmType = nullable(item.osm_type);
  const osmId = item.osm_id == null ? null : String(item.osm_id);
  return {
    geocoderPlaceId: osmType && osmId ? `${osmType}/${osmId}` : item.place_id == null ? null : String(item.place_id),
    osmType,
    osmId,
    displayName: nullable(item.display_name) || 'Unnamed location',
    latitude,
    longitude,
    address: normalizeAddress(item.address),
  };
}

function cached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (item.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function storeCache(key, value) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

async function rateLimitedFetch(url, fetchImpl) {
  const task = requestQueue.then(async () => {
    const wait = Math.max(0, MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
    const contact = process.env.NOMINATIM_CONTACT;
    const identity = 'PowerTrack/1.0 (South African load-shedding location selector)';
    const userAgent = contact ? `${identity}; contact: ${contact}` : identity;
    return fetchImpl(url, {
      headers: { 'User-Agent': userAgent, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
  });
  requestQueue = task.catch(() => {});
  return task;
}

async function requestNominatim(parameters, fetchImpl = fetch) {
  const url = new URL(parameters.endpoint, NOMINATIM_BASE);
  for (const [key, value] of Object.entries(parameters.query)) url.searchParams.set(key, value);
  const response = await rateLimitedFetch(url, fetchImpl);
  if (response.status === 429) {
    const error = new Error('Address search is busy. Wait a moment before trying again.');
    error.status = 429;
    throw error;
  }
  if (!response.ok) {
    const error = new Error('OpenStreetMap address search is temporarily unavailable.');
    error.status = 502;
    throw error;
  }
  try {
    return await response.json();
  } catch {
    const error = new Error('OpenStreetMap returned an unreadable address response.');
    error.status = 502;
    throw error;
  }
}

async function searchAddresses(search, fetchImpl = fetch) {
  const value = String(search || '').trim().replace(/\s+/g, ' ');
  if (value.length < 3) {
    const error = new Error('Enter at least three characters to search an address.');
    error.status = 400;
    throw error;
  }
  if (value.length > 180) {
    const error = new Error('Address search must be 180 characters or fewer.');
    error.status = 400;
    throw error;
  }
  const key = `search:${value.toLowerCase()}`;
  const prior = cached(key);
  if (prior) return prior;
  const response = await requestNominatim({
    endpoint: '/search',
    query: { q: value, format: 'jsonv2', addressdetails: '1', countrycodes: 'za', limit: '6' },
  }, fetchImpl);
  if (!Array.isArray(response)) {
    const error = new Error('OpenStreetMap returned an invalid address response.');
    error.status = 502;
    throw error;
  }
  const results = response.map(normalizeResult).filter(Boolean);
  storeCache(key, results);
  return results;
}

async function reverseAddress(latitude, longitude, fetchImpl = fetch) {
  if (!Number.isFinite(latitude) || latitude < -35 || latitude > -22
      || !Number.isFinite(longitude) || longitude < 16 || longitude > 33) {
    const error = new Error('Coordinates must be within South Africa.');
    error.status = 400;
    throw error;
  }
  const roundedLatitude = Number(latitude.toFixed(5));
  const roundedLongitude = Number(longitude.toFixed(5));
  const key = `reverse:${roundedLatitude}:${roundedLongitude}`;
  const prior = cached(key);
  if (prior) return prior;
  const response = await requestNominatim({
    endpoint: '/reverse',
    query: {
      lat: String(roundedLatitude), lon: String(roundedLongitude), format: 'jsonv2', addressdetails: '1', zoom: '18',
    },
  }, fetchImpl);
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    const error = new Error('OpenStreetMap returned an invalid address response.');
    error.status = 502;
    throw error;
  }
  const result = normalizeResult(response);
  if (!result) {
      const address = normalizeAddress();
      const approximate = {
        geocoderPlaceId: null,
        osmType: null,
        osmId: null,
        displayName: 'Dropped pin · address not found',
        latitude: roundedLatitude,
        longitude: roundedLongitude,
        address,
      };
      storeCache(key, approximate);
      return approximate;
  }
  storeCache(key, result);
  return result;
}

module.exports = { searchAddresses, reverseAddress, normalizeAddress, normalizeResult };