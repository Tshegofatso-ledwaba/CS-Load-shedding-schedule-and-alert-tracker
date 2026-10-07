# PowerTrack

PowerTrack is a South African load-shedding schedule and alert tracker. The Friday milestone includes a live public dashboard, a seeded Express API, timezone-aware status calculation, and a protected administrator statistics view.

See [PROJECT_CONTRACT.md](PROJECT_CONTRACT.md) for the complete product, architecture, phase, sprint, acceptance, and release contract.

## Run locally

```powershell
cd server
npm install
npm start
```

In another terminal:

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:3000`. The local admin credentials are `admin@powertrack.local` and `PowerTrackFriday!` unless overridden in `server/.env`. Copy the server and client `.env.example` files before configuring deployment. With `DATABASE_URL`, Neon is the shared source of truth for locations and schedules; without it, the API exposes only the small local development seed.

## Database setup

With `DATABASE_URL` configured in `server/.env`, apply the schema and canonical location seed:

```powershell
cd server
npm run db:migrate
npm run db:seed:locations
npm run db:seed:schedules
```

The migration runner applies `database/schema.sql`, then ordered additive migrations under `database/migrations/`. It is safe to run again and preserves existing records. Database mode uses UUID identifiers returned by the location endpoints; the local fallback uses seeded labels such as `zone-2`.

## OpenStreetMap location selection

The public dashboard and Admin Location Management use MapLibre GL JS with OpenStreetMap raster tiles; no map token is required. The map displays `© OpenStreetMap contributors` attribution. The public address search and reverse geocoding are sent through the PowerTrack API to the Nominatim service, are restricted to South Africa, and are throttled/cached server-side. Searches run only after form submission, and reverse lookup runs after marker drag ends.

The public `Use My Current Location` button requires browser geolocation permission and a secure browser context (localhost is allowed for development). Browser-saved Home/Work places remain in local storage because PowerTrack has no public account system; exact user coordinates are not written to Neon. Neon remains the source of truth for admin-managed PowerTrack zones and schedules. After a pin is confirmed, nearby coordinate-backed PowerTrack zones are offered explicitly; the app does not invent or silently assign a schedule area when no verified match exists.

Admin Location Management is available at `/admin/locations`. Administrators search or click the map, complete any missing hierarchy levels, and save a Zone/Block and its OpenStreetMap identity/coordinates to Neon. Existing zones without coordinates can be enriched there. Map tiles use the standard OpenStreetMap tile service, whose public capacity is limited; for sustained high-volume production use, configure a compliant self-hosted or dedicated OpenStreetMap-compatible tile provider and retain its required attribution. Do not bulk-geocode or issue automated high-volume searches to the public Nominatim service.

Schedule creation, update, and deletion are protected admin operations. The API validates the persisted zone, stage, date, and time range, and rejects overlapping outage windows for the same block. Locations with attached schedules cannot be deleted.

Administrator registration is available from the admin login screen when the server has both `DATABASE_URL` and `ADMIN_REGISTRATION_KEY` configured. Set both in `server/.env` for local use or in the API host's environment settings for deployment. Keep the registration key server-side; it is never sent to the browser or committed. Registration stores administrator accounts in the database and saves only a bcrypt password hash. The registration key can be rotated by changing the server environment variable.

## Checks

```powershell
cd client; npm run lint; npm run build
cd ../server; npm start
```
# CS-Load-shedding-schedule-and-alert-tracker
The problem: Load-shedding schedules change frequently and are published in formats that are hard to check  quickly, making it difficult for households and small businesses to plan around outages. 
