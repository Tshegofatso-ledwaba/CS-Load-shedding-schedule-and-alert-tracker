require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { locations, schedules } = require('./data');
const { calculateStatus } = require('./status');
const province = locations.provinces[0];
const city = locations.cities[0];
const area = locations.areas[0];
const suburb = locations.suburbs[0];
const zone = locations.zones[0];

const app = express();
const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'local-development-secret-change-me';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@powertrack.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'PowerTrackFriday!';
const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 }));

const sendError = (res, status, message) => res.status(status).json({ error: message });

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return sendError(res, 401, 'Authentication required.');
  try { req.admin = jwt.verify(token, JWT_SECRET); return next(); } catch { return sendError(res, 401, 'Your session has expired.'); }
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'PowerTrack API' }));
app.get('/api/locations/provinces', (_req, res) => res.json(locations.provinces));
app.get('/api/locations/cities', (_req, res) => res.json(locations.cities));
app.get('/api/locations/areas', (_req, res) => res.json(locations.areas));
app.get('/api/locations/search', (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase();
  if (!query) return res.json([]);
  return res.json(locations.areas.filter((item) => item.name.toLowerCase().includes(query)).map((item) => ({ ...item, city: locations.cities.find((cityItem) => cityItem.id === item.cityId), province })));
});
app.get('/api/locations/:id', (req, res) => {
  if (req.params.id !== 'zone-2' && req.params.id !== 'soshanguve') return sendError(res, 404, 'Location not found.');
  return res.json({ ...locations.zones[0], suburb, area, city, province });
});

app.get('/api/schedules', (req, res) => {
  const result = schedules.filter((item) => !req.query.zoneBlockId || item.zoneBlockId === req.query.zoneBlockId);
  res.json(result.sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)));
});
app.get('/api/schedules/upcoming', (req, res) => {
  const now = new Date();
  res.json(schedules.filter((item) => (!req.query.zoneBlockId || item.zoneBlockId === req.query.zoneBlockId) && new Date(`${item.date}T${item.startTime}:00+02:00`) > now).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)));
});
app.get('/api/schedules/history', (req, res) => {
  const now = new Date();
  res.json(schedules.filter((item) => new Date(`${item.date}T${item.endTime}:00+02:00`) < now));
});
app.get('/api/schedules/:id', (req, res) => {
  const item = schedules.find((scheduleItem) => scheduleItem.id === req.params.id);
  return item ? res.json(item) : sendError(res, 404, 'Schedule not found.');
});
app.get('/api/status/:zoneBlockId', (req, res) => res.json({ ...calculateStatus(req.params.zoneBlockId, schedules), area: { ...zone, suburb: suburb.name, area: area.name, city: city.name, province: province.name } }));

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return sendError(res, 400, 'Email and password are required.');
  if (email !== ADMIN_EMAIL || !(await bcrypt.compare(password, passwordHash))) return sendError(res, 401, 'Invalid email or password.');
  return res.json({ token: jwt.sign({ email, role: 'ADMIN' }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }), administrator: { email, role: 'ADMIN' } });
});
app.post('/api/auth/logout', (_req, res) => res.json({ message: 'Signed out.' }));
app.get('/api/admin/dashboard', authenticate, (_req, res) => res.json({ stats: { totalAreas: locations.areas.length, totalZones: locations.zones.length, totalSchedules: schedules.length, upcomingSchedules: schedules.filter((item) => new Date(`${item.date}T${item.startTime}:00+02:00`) > new Date()).length }, recentUpdates: schedules.slice(-4).reverse() }));

app.use((err, _req, res, _next) => { console.error(err); sendError(res, 500, 'Unexpected server error.'); });
app.listen(PORT, '0.0.0.0', () => console.log(`PowerTrack API running on http://localhost:${PORT}`));

module.exports = app;