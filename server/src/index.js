require('dotenv').config();
const { randomUUID } = require('crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { locations, schedules } = require('./data');
const { calculateStatus } = require('./status');
const { databaseEnabled } = require('./db');
const databaseLocations = require('./locations');
const databaseSchedules = require('./schedules');
const { searchAddresses, reverseAddress } = require('./nominatim');
const { bcrypt, findAdministrator, createAdministrator } = require('./auth');
const province = locations.provinces[0];
const city = locations.cities[0];
const area = locations.areas[0];
const suburb = locations.suburbs[0];
const zone = locations.zones[0];

const app = express();
const PORT = Number(process.env.PORT || 3001);
const isProduction = process.env.NODE_ENV === 'production';
const defaultDevValues = {
  JWT_SECRET: 'local-development-secret-change-me',
  ADMIN_EMAIL: 'admin@powertrack.local',
  ADMIN_PASSWORD: 'PowerTrackFriday!',
};
const resolveDevelopmentSetting = (value, fallback) => {
  if (!value || value === 'replace-this-password' || value === 'replace-this-secret' || value === 'replace-this-email' || value === 'admin@example.com') return fallback;
  return value;
};
const JWT_SECRET = isProduction ? (process.env.JWT_SECRET || null) : resolveDevelopmentSetting(process.env.JWT_SECRET, defaultDevValues.JWT_SECRET);
const ADMIN_EMAIL = isProduction ? (process.env.ADMIN_EMAIL || null) : resolveDevelopmentSetting(process.env.ADMIN_EMAIL, defaultDevValues.ADMIN_EMAIL);
const ADMIN_PASSWORD = isProduction ? (process.env.ADMIN_PASSWORD || null) : resolveDevelopmentSetting(process.env.ADMIN_PASSWORD, defaultDevValues.ADMIN_PASSWORD);
const ADMIN_REGISTRATION_KEY = process.env.ADMIN_REGISTRATION_KEY || (isProduction ? null : 'LoadsheddingIsFun!');
const JWT_EXPIRES_IN = /^\d+(?:\.\d+)?[smhd]$/.test(process.env.JWT_EXPIRES_IN || '') ? process.env.JWT_EXPIRES_IN : '1h';
if (isProduction && (!JWT_SECRET || !ADMIN_EMAIL || !ADMIN_PASSWORD)) throw new Error('JWT_SECRET, ADMIN_EMAIL, and ADMIN_PASSWORD are required in production.');
const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 }));
const geocodingLimit = rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

const sendError = (res, status, message) => res.status(status).json({ error: message });

async function withDatabaseFallback(operation, fallback, label) {
  if (!databaseEnabled()) return fallback();
  try {
    const result = await operation();
    if (Array.isArray(result) && result.length === 0) {
      const localResult = fallback();
      if (Array.isArray(localResult) && localResult.length > 0) return localResult;
      return result;
    }
    return result;
  } catch (error) {
    console.warn(`Falling back to local ${label} data because the database is unavailable: ${error.message}`);
    return fallback();
  }
}

async function withScheduleFallback(operation, fallback, label) {
  if (!databaseEnabled()) return fallback();
  try {
    return await operation();
  } catch (error) {
    console.warn(`Falling back to local ${label} data because the database is unavailable: ${error.message}`);
    return fallback();
  }
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function parseScheduleInput(payload = {}) {
  const stage = Number(payload.stage);
  const zoneBlockId = String(payload.zoneBlockId || '').trim();
  const date = String(payload.date || '').trim();
  const startTime = String(payload.startTime || '').trim();
  const endTime = String(payload.endTime || '').trim();
  const source = String(payload.source || 'ADMIN');

  if (!zoneBlockId || !date || !startTime || !endTime) throw new Error('Zone, date, start time, and end time are required.');
  if (!Number.isInteger(stage) || stage < 1 || stage > 8) throw new Error('Stage must be an integer between 1 and 8.');
  const dateParts = date.split('-').map(Number);
  const calendarDate = dateParts.length === 3 ? new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2])) : null;
  const validCalendarDate = calendarDate && calendarDate.getUTCFullYear() === dateParts[0]
    && calendarDate.getUTCMonth() === dateParts[1] - 1 && calendarDate.getUTCDate() === dateParts[2];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !validCalendarDate) throw new Error('Date must be a valid ISO date.');
  if (!['ADMIN', 'EXTERNAL', 'PREDICTED'].includes(source)) throw new Error('Source must be ADMIN, EXTERNAL, or PREDICTED.');

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)
      || startMinutes === null || endMinutes === null) throw new Error('Start and end times must be valid HH:MM values.');
  if (endMinutes <= startMinutes) throw new Error('End time must be after the start time.');

  return { zoneBlockId, stage, date, startTime, endTime, source };
}

function parseLocationInput(payload = {}) {
  const readName = (value) => String(value || '').trim();
  const coordinates = [Number(payload.latitude), Number(payload.longitude)];
  const location = {
    geocoderPlaceId: readName(payload.geocoderPlaceId),
    osmType: readName(payload.osmType),
    osmId: readName(payload.osmId),
    officialName: readName(payload.officialName),
    latitude: coordinates[0],
    longitude: coordinates[1],
    province: { name: readName(payload.province?.name) },
    city: { name: readName(payload.city?.name) },
    area: { name: readName(payload.area?.name) },
    suburb: { name: readName(payload.suburb?.name) },
    zoneBlock: { name: readName(payload.zoneBlock?.name) },
  };
  if (!location.geocoderPlaceId || Object.values(location).filter((item) => item && typeof item === 'object' && 'name' in item).some((item) => !item.name)) {
    throw new Error('Geocoder identity and all five hierarchy names are required.');
  }
  if (!Number.isFinite(location.latitude) || location.latitude < -35 || location.latitude > -22
      || !Number.isFinite(location.longitude) || location.longitude < 16 || location.longitude > 33) {
    throw new Error('Choose a valid location in South Africa from the map search results.');
  }
  location.zoneBlock.latitude = location.latitude;
  location.zoneBlock.longitude = location.longitude;
  location.zoneBlock.geocoderPlaceId = location.geocoderPlaceId;
  location.zoneBlock.osmType = location.osmType;
  location.zoneBlock.osmId = location.osmId;
  location.zoneBlock.officialName = location.officialName;
  return location;
}

function appendSchedule(record) {
  schedules.push({
    id: randomUUID(),
    zoneBlockId: record.zoneBlockId,
    stage: record.stage,
    date: record.date,
    startTime: record.startTime,
    endTime: record.endTime,
    source: record.source,
    updatedAt: new Date().toISOString(),
  });
  return schedules[schedules.length - 1];
}

function findLocalZone(id) {
  return locations.zones.find((item) => item.id.toLowerCase() === id.toLowerCase()
    || item.name.toLowerCase() === id.toLowerCase()
    || item.name.toLowerCase().replace(/\s+/g, '-') === id.toLowerCase());
}

function hasLocalOverlap(record, ignoreId) {
  const start = timeToMinutes(record.startTime);
  const end = timeToMinutes(record.endTime);
  return schedules.some((item) => item.id !== ignoreId && item.zoneBlockId === record.zoneBlockId
    && item.date === record.date && start < timeToMinutes(item.endTime) && end > timeToMinutes(item.startTime));
}

function authenticate(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return sendError(res, 401, 'Authentication required.');
  try {
    const admin = jwt.verify(token, JWT_SECRET);
    if (admin.role !== 'ADMIN') return sendError(res, 403, 'Administrator access required.');
    req.admin = admin;
    return next();
  } catch { return sendError(res, 401, 'Your session has expired.'); }
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'PowerTrack API' }));
app.get('/api/locations/provinces', async (_req, res) => {
  const payload = await withDatabaseFallback(() => databaseLocations.listProvinces(), () => locations.provinces, 'provinces');
  res.json(payload);
});
app.get('/api/locations/cities', async (_req, res) => {
  const payload = await withDatabaseFallback(() => databaseLocations.listCities(), () => locations.cities, 'cities');
  res.json(payload);
});
app.get('/api/locations/areas', async (_req, res) => {
  const payload = await withDatabaseFallback(() => databaseLocations.listAreas(), () => locations.areas, 'areas');
  res.json(payload);
});
app.get('/api/locations/zones', async (_req, res) => {
  const payload = await withScheduleFallback(() => databaseLocations.listZones(), () => locations.zones.map((item) => ({
    id: item.id,
    name: item.name,
    suburbName: suburb.name,
    areaName: area.name,
    cityName: city.name,
    provinceName: province.name,
    latitude: zone.latitude || null,
    longitude: zone.longitude || null,
  })), 'zones');
  res.json(payload);
});
app.get('/api/locations/:id/children', async (req, res) => {
  if (!databaseEnabled()) return res.json([]);
  try {
    return res.json(await databaseLocations.listChildren(req.params.id));
  } catch (error) {
    console.error(`Could not load location children: ${error.message}`);
    return sendError(res, 500, 'Could not load child locations.');
  }
});
app.get('/api/locations/:id/schedules', async (req, res) => {
  const payload = await withScheduleFallback(
    () => databaseSchedules.listUpcoming(req.params.id),
    () => schedules.filter((item) => item.zoneBlockId === req.params.id),
    'location schedules',
  );
  return res.json(payload);
});
app.get('/api/locations/search', async (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase();
  if (!query) return res.json([]);
  if (databaseEnabled()) {
    try {
      return res.json(await databaseLocations.searchAreas(query));
    } catch (error) {
      console.warn(`Falling back to local area search because the database is unavailable: ${error.message}`);
    }
  }
  const matches = locations.zones.flatMap((zoneItem) => {
    const suburbItem = locations.suburbs.find((item) => item.id === zoneItem.suburbId);
    const areaItem = locations.areas.find((item) => item.id === suburbItem?.areaId);
    if (!suburbItem || !areaItem) return [];
    const cityItem = locations.cities.find((item) => item.id === areaItem.cityId);
    const isMatch = [province.name, cityItem?.name, areaItem.name, suburbItem.name, zoneItem.name]
      .some((name) => name?.toLowerCase().includes(query));
    if (!isMatch) return [];
    return [{
      ...areaItem,
      zoneBlockId: zoneItem.id,
      zoneBlockName: zoneItem.name,
      suburbName: suburbItem.name,
      city: cityItem,
      province,
    }];
  });
  return res.json(matches);
});
app.get('/api/location/search', geocodingLimit, async (req, res) => {
  try {
    return res.json(await searchAddresses(req.query.q));
  } catch (error) {
    return sendError(res, error.status || 502, error.message || 'Address search is unavailable.');
  }
});
app.get('/api/location/reverse', geocodingLimit, async (req, res) => {
  const latitude = Number(req.query.lat);
  const longitude = Number(req.query.lon);
  try {
    return res.json(await reverseAddress(latitude, longitude));
  } catch (error) {
    return sendError(res, error.status || 502, error.message || 'Address lookup is unavailable.');
  }
});
app.get('/api/location/match', async (req, res) => {
  const latitude = Number(req.query.lat);
  const longitude = Number(req.query.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
      || latitude < -35 || latitude > -22 || longitude < 16 || longitude > 33) {
    return sendError(res, 400, 'Coordinates must be within South Africa.');
  }
  if (!databaseEnabled()) return res.json({ radiusMeters: 250, matches: [] });
  try {
    const matches = await databaseLocations.nearbyZones(latitude, longitude, 250);
    return res.json({ radiusMeters: 250, matches });
  } catch (error) {
    console.error(`Could not match selected coordinates to PowerTrack zones: ${error.message}`);
    return sendError(res, 500, 'Could not check for a verified PowerTrack schedule area.');
  }
});
app.get('/api/admin/locations', authenticate, async (req, res) => {
  if (!databaseEnabled()) return sendError(res, 503, 'Admin location management requires DATABASE_URL.');
  try {
    return res.json(await databaseLocations.listAdminLocations(String(req.query.q || '').trim()));
  } catch (error) {
    console.error(`Could not load admin locations: ${error.message}`);
    return sendError(res, 500, 'Could not load PowerTrack locations.');
  }
});
app.post('/api/admin/locations', authenticate, async (req, res) => {
  if (!databaseEnabled()) return sendError(res, 503, 'Saving locations requires DATABASE_URL.');
  try {
    return res.status(201).json(await databaseLocations.createLocation(parseLocationInput(req.body || {})));
  } catch (error) {
    if (error.code === '23505') return sendError(res, 409, 'This OpenStreetMap place or hierarchy location already exists.');
    if (error instanceof Error && !error.code) return sendError(res, 400, error.message);
    console.error(`Could not create location: ${error.message}`);
    return sendError(res, 500, 'Could not save this PowerTrack location.');
  }
});
app.put('/api/admin/locations/:id', authenticate, async (req, res) => {
  if (!databaseEnabled()) return sendError(res, 503, 'Editing locations requires DATABASE_URL.');
  const changes = {
    province: String(req.body?.province || '').trim(),
    city: String(req.body?.city || '').trim(),
    area: String(req.body?.area || '').trim(),
    suburb: String(req.body?.suburb || '').trim(),
    zoneBlock: String(req.body?.zoneBlock || '').trim(),
    officialName: String(req.body?.officialName || req.body?.zoneBlock || '').trim(),
    geocoderPlaceId: String(req.body?.geocoderPlaceId || '').trim(),
    osmType: String(req.body?.osmType || '').trim(),
    osmId: String(req.body?.osmId || '').trim(),
    latitude: req.body?.latitude == null ? null : Number(req.body.latitude),
    longitude: req.body?.longitude == null ? null : Number(req.body.longitude),
  };
  const hasCoordinates = changes.latitude !== null || changes.longitude !== null;
  if (Object.values(changes).slice(0, 5).some((name) => !name)
      || (hasCoordinates && (!Number.isFinite(changes.latitude) || !Number.isFinite(changes.longitude)
        || changes.latitude < -35 || changes.latitude > -22 || changes.longitude < 16 || changes.longitude > 33))) {
    return sendError(res, 400, 'All hierarchy names and valid South African coordinates, when supplied, are required.');
  }
  try {
    const location = await databaseLocations.updateZoneBlock(req.params.id, changes);
    return location ? res.json(location) : sendError(res, 404, 'Zone/Block not found.');
  } catch (error) {
    if (error.code === '23505') return sendError(res, 409, 'A Zone/Block with that name already exists under this suburb.');
    console.error(`Could not update location: ${error.message}`);
    return sendError(res, 500, 'Could not update this PowerTrack location.');
  }
});
app.delete('/api/admin/locations/:id', authenticate, async (req, res) => {
  if (!databaseEnabled()) return sendError(res, 503, 'Deleting locations requires DATABASE_URL.');
  try {
    const result = await databaseLocations.deleteZoneBlock(req.params.id);
    if (!result) return sendError(res, 404, 'Zone/Block not found.');
    if (!result.deleted) return sendError(res, 409, result.reason);
    return res.json({ deleted: true });
  } catch (error) {
    console.error(`Could not delete location: ${error.message}`);
    return sendError(res, 500, 'Could not delete this PowerTrack location.');
  }
});
app.get('/api/locations/:id', async (req, res) => {
  if (databaseEnabled()) {
    try {
      const location = await databaseLocations.findLocation(req.params.id);
      if (location) return res.json(location);
    } catch (error) {
      console.warn(`Falling back to local location lookup because the database is unavailable: ${error.message}`);
    }
  }
  if (req.params.id !== 'zone-2' && req.params.id !== 'soshanguve') return sendError(res, 404, 'Location not found.');
  return res.json({ ...locations.zones[0], suburb, area, city, province });
});

app.get('/api/schedules', async (req, res) => {
  const payload = await withScheduleFallback(() => databaseSchedules.listSchedules(req.query.zoneBlockId), () => {
    const result = schedules.filter((item) => !req.query.zoneBlockId || item.zoneBlockId === req.query.zoneBlockId);
    return result.sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  }, 'schedules');
  res.json(payload);
});
app.get('/api/admin/schedules', authenticate, async (_req, res) => {
  const payload = await withScheduleFallback(() => databaseSchedules.listSchedules(), () => [...schedules].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)), 'admin schedules');
  return res.json(payload);
});
async function saveSchedule(req, res, id = null) {
  let record;
  try {
    record = parseScheduleInput(req.body || {});
  } catch (error) {
    return sendError(res, 400, error instanceof Error ? error.message : 'Invalid schedule payload.');
  }

  if (!databaseEnabled()) {
    const localZone = findLocalZone(record.zoneBlockId);
    if (!localZone) return sendError(res, 400, 'The selected zone/block does not exist.');
    record.zoneBlockId = localZone.id;
    if (hasLocalOverlap(record, id)) return sendError(res, 409, 'This outage overlaps an existing schedule for the selected Zone/Block.');
    if (id) {
      const index = schedules.findIndex((item) => item.id === id);
      if (index === -1) return sendError(res, 404, 'Schedule not found.');
      schedules[index] = { ...schedules[index], ...record, updatedAt: new Date().toISOString() };
      return res.json(schedules[index]);
    }
    return res.status(201).json(appendSchedule(record));
  }
  try {
    const scheduleItem = id
      ? await databaseSchedules.updateSchedule(id, record)
      : await databaseSchedules.createSchedule(record);
    if (!scheduleItem) return sendError(res, 400, 'The selected zone/block does not exist.');
    if (scheduleItem === false) return sendError(res, 400, 'The selected zone/block does not exist.');
    return id ? res.json(scheduleItem) : res.status(201).json(scheduleItem);
  } catch (error) {
    if (error.code === 'SCHEDULE_OVERLAP') return sendError(res, 409, error.message);
    console.error(`Could not save schedule: ${error.message}`);
    return sendError(res, 500, 'The schedule could not be saved. Please try again.');
  }
}

app.post('/api/schedules', authenticate, (req, res) => saveSchedule(req, res));
app.post('/api/admin/schedules', authenticate, (req, res) => saveSchedule(req, res));
app.put('/api/admin/schedules/:id', authenticate, (req, res) => saveSchedule(req, res, req.params.id));
app.delete('/api/admin/schedules/:id', authenticate, async (req, res) => {
  if (!databaseEnabled()) {
    const index = schedules.findIndex((item) => item.id === req.params.id);
    if (index === -1) return sendError(res, 404, 'Schedule not found.');
    schedules.splice(index, 1);
    return res.json({ deleted: true });
  }
  try {
    const deleted = await databaseSchedules.deleteSchedule(req.params.id);
    return deleted ? res.json({ deleted: true }) : sendError(res, 404, 'Schedule not found.');
  } catch (error) {
    console.error(`Could not delete schedule: ${error.message}`);
    return sendError(res, 500, 'Could not delete schedule.');
  }
});
app.get('/api/schedules/upcoming', async (req, res) => {
  const payload = await withScheduleFallback(() => databaseSchedules.listUpcoming(req.query.zoneBlockId), () => {
    const now = new Date();
    return schedules.filter((item) => (!req.query.zoneBlockId || item.zoneBlockId === req.query.zoneBlockId) && new Date(`${item.date}T${item.startTime}:00+02:00`) > now).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  }, 'upcoming schedules');
  res.json(payload);
});
app.get('/api/schedules/history', async (req, res) => {
  const payload = await withScheduleFallback(() => databaseSchedules.listHistory(req.query.zoneBlockId), () => {
    const now = new Date();
    return schedules.filter((item) => (!req.query.zoneBlockId || item.zoneBlockId === req.query.zoneBlockId) && new Date(`${item.date}T${item.endTime}:00+02:00`) < now);
  }, 'schedule history');
  res.json(payload);
});
app.get('/api/schedules/:id', async (req, res) => {
  if (databaseEnabled()) {
    try {
      const item = await databaseSchedules.findSchedule(req.params.id);
      return item ? res.json(item) : sendError(res, 404, 'Schedule not found.');
    } catch (error) {
      console.warn(`Falling back to local schedule lookup because the database is unavailable: ${error.message}`);
    }
  }
  const item = schedules.find((scheduleItem) => scheduleItem.id === req.params.id);
  return item ? res.json(item) : sendError(res, 404, 'Schedule not found.');
});
app.get('/api/status/:zoneBlockId', async (req, res) => {
  if (databaseEnabled()) {
    try {
      const [currentSchedules, location] = await Promise.all([
        databaseSchedules.listSchedules(req.params.zoneBlockId),
        databaseLocations.findLocation(req.params.zoneBlockId),
      ]);
      if (location) {
        return res.json({ ...calculateStatus(location.id, currentSchedules), area: { ...location, suburb: location.suburb.name, area: location.area.name, city: location.city.name, province: location.province.name } });
      }
    } catch (error) {
      console.warn(`Falling back to local status data because the database is unavailable: ${error.message}`);
    }
  }
  return res.json({ ...calculateStatus(req.params.zoneBlockId, schedules), area: { ...zone, suburb: suburb.name, area: area.name, city: city.name, province: province.name } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return sendError(res, 400, 'Email and password are required.');
  if (databaseEnabled()) {
    try {
      const administrator = await findAdministrator(email);
      if (administrator && await bcrypt.compare(password, administrator.passwordHash)) {
        return res.json({ token: jwt.sign({ email: administrator.email, role: administrator.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }), administrator: { email: administrator.email, role: administrator.role } });
      }
    } catch (error) {
      console.warn(`Falling back to local admin login because the database is unavailable: ${error.message}`);
    }
  }
  if (email !== ADMIN_EMAIL || !(await bcrypt.compare(password, passwordHash))) return sendError(res, 401, 'Invalid email or password.');
  return res.json({ token: jwt.sign({ email, role: 'ADMIN' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }), administrator: { email, role: 'ADMIN' } });
});
app.post('/api/auth/register', async (req, res) => {
  const { email, password, registrationKey } = req.body || {};
  if (!email || !password || !registrationKey) return sendError(res, 400, 'Email, password, and registration key are required.');
  if (!ADMIN_REGISTRATION_KEY || registrationKey !== ADMIN_REGISTRATION_KEY) return sendError(res, 403, 'Administrator registration is not enabled.');
  if (!databaseEnabled()) return sendError(res, 503, 'Administrator registration requires the database.');
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12) return sendError(res, 400, 'Use a valid email and a password of at least 12 characters.');
  const administrator = await createAdministrator(email.trim().toLowerCase(), password);
  if (!administrator) return sendError(res, 409, 'An administrator with that email already exists.');
  return res.status(201).json({ administrator });
});
app.post('/api/auth/logout', (_req, res) => res.json({ message: 'Signed out.' }));
app.get('/api/admin/dashboard', authenticate, async (_req, res) => {
  if (!databaseEnabled()) {
    return res.json({
      stats: {
        totalAreas: locations.areas.length,
        totalZones: locations.zones.length,
        totalSchedules: schedules.length,
        upcomingSchedules: schedules.filter((item) => new Date(`${item.date}T${item.startTime}:00+02:00`) > new Date()).length,
      },
      recentUpdates: schedules.slice(-4).reverse(),
    });
  }
  try {
    const [locationCounts, scheduleDashboard] = await Promise.all([databaseLocations.getCounts(), databaseSchedules.adminDashboard()]);
    return res.json({ stats: { ...locationCounts, ...scheduleDashboard.stats }, recentUpdates: scheduleDashboard.recentUpdates });
  } catch (error) {
    console.error(`Could not load database-backed admin statistics: ${error.message}`);
    return sendError(res, 500, 'Could not load admin statistics.');
  }
});

app.use((err, _req, res, _next) => { console.error(err); sendError(res, 500, 'Unexpected server error.'); });

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => console.log(`PowerTrack API running on http://localhost:${PORT}`));
}

module.exports = app;