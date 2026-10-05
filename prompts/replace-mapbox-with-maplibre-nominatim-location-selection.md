# Replace Mapbox with MapLibre and Nominatim location selection

## Goal
Replace the current Mapbox-only admin map/geocoder and improve the public location selector so a user can search or locate an exact South African address, adjust a draggable marker, confirm it, and see load-shedding only when that point can be matched to a verified PowerTrack Zone/Block.

## Confirmed persistence decision
- The project has no public-user authentication or saved-area database model. `Home` and `Work` currently use browser `localStorage`, and the project contract specifies local-storage saved areas first.
- Preserve that behavior: save a confirmed public physical location and its label/coordinates in browser storage. Do not create anonymous ownerless residential-coordinate rows in Neon and do not let public users mutate canonical location rows.
- Neon remains the source of truth for admin-managed PowerTrack hierarchy and schedules. Use its stored verified Zone/Block coordinates to match a selected physical point. If no safe match exists, show the physical address but do not invent a load-shedding zone or attach a schedule.

## Current implementation findings
- Public home search queries the PowerTrack hierarchy and saves Home/Work to `localStorage`.
- Admin Location Management currently uses Mapbox GL and authenticated Mapbox forward/reverse geocoding endpoints.
- Geographic coordinates and provider ID metadata already exist on the relational location hierarchy; current zone rows may have no coordinates.
- There is admin-only JWT authentication and no public user identity.
- `mapbox-gl` is installed. The checked-in client/server `.env.example` files contain malformed duplicated content and Mapbox token placeholders; correct both as part of removing Mapbox.
- No public Mapbox token values or paid mapping services may remain in source, docs, or environment templates. Preserve unrelated user environment secrets and never print their values.

## Scope
- Replace `mapbox-gl` with `maplibre-gl`; remove Mapbox CSS/imports and obsolete Mapbox server code/routes/tests/dependency entries.
- Build one reusable client-only MapLibre component used by public location selection and admin location management. Use OpenStreetMap-compatible tiles with required `© OpenStreetMap contributors` attribution, South Africa initial extent, responsive controls, marker update/drag handling, and cleanup on unmount. Do not initialize the map during SSR.
- Use Nominatim server-side only. Add public `GET /api/location/search?q=` and `GET /api/location/reverse?lat=&lon=` endpoints with normalized PowerTrack responses; never return raw provider JSON.
- Search only on explicit form submission/Enter, not each keystroke. Validate minimum query length, constrain search to South Africa, prevent accidental duplicate requests, and return clear empty/provider/network/rate-limit errors.
- Send a descriptive Nominatim `User-Agent`/contact identity from the server. Respect the public Nominatim usage policy with a server-wide request queue/throttle (at most one request per second), per-client API rate limiting, timeout, bounded response count, and short-lived cache. Never issue reverse requests on every pointer movement; reverse geocode once after marker drag ends or a geolocation result arrives.
- Add browser `Use My Current Location` with permission-denied, unavailable, timeout, and unsupported-browser states. Reverse-geocode returned coordinates server-side and allow manual marker adjustment.
- Public result selection moves the map, sets the marker, and displays exact address and nullable province/municipality/city/area/suburb/zone fields. Show explicit `Adjust Location` and `Confirm Location` actions plus coordinates. Do not fabricate missing hierarchy values.
- Preserve existing Home/Work quick checks in `localStorage`, extending their data shape compatibly to include confirmed coordinates and normalized address. Keep all existing saved entries readable; do not add public account/auth flows or anonymous DB saved-place rows.
- Match coordinates against Neon-backed PowerTrack Zone/Block data only when a stored verified point is within a documented conservative distance threshold. Return exact `zoneBlockId` and hierarchy when matched; otherwise show `No verified PowerTrack schedule area match` and do not display unrelated status/schedules. Existing zones without coordinates can be enriched by admins from Nominatim results in the existing management page.
- Migrate current admin Mapbox search/reverse selection to Nominatim and MapLibre. Keep admin location CRUD protected. Store Nominatim identity using a provider-neutral geographic identifier (for example OSM type + OSM ID) and coordinates in existing relational rows; add a safe additive SQL migration only if a suitable field does not exist. Do not drop existing geographic metadata or schedule data.
- Preserve server-calculated status in `Africa/Johannesburg`, current API loading/error/empty states, existing schedule behavior, and responsive PowerTrack design.
- Repair `client/.env.example` and `server/.env.example` to contain only their correct keys once. Remove obsolete Mapbox variables from examples and local ignored env files without displaying or changing unrelated secret values. No map token is needed for public OSM tiles.
- Add a concise README section documenting Nominatim attribution, usage limitations, geolocation permissions, and tile provider policy. Do not claim the public Nominatim server is unlimited or suitable for unrestricted high-volume production traffic.

## Search/address normalization
Normalize only data Nominatim actually returns. The server response should contain:
- stable geocoder identifier (`osm_type`, `osm_id` and/or `place_id` as appropriate)
- `displayName`, `latitude`, `longitude`
- `province`, `municipality`, `city`, `town`, `area`, `suburb`, `road`, and `postcode`, each nullable
- selected PowerTrack match (`zoneBlockId` and full hierarchy) only when a verified coordinate match exists

Map South African Nominatim address fields carefully (`state`, `municipality`, `city`, `town`, `village`, `suburb`, `neighbourhood`, `residential`, `road`, `postcode`). Missing fields remain `null`; do not infer a Zone/Block from a suburb name.

## Security and privacy
- Never make browser requests directly to Nominatim and never expose provider request logic/credentials in browser code.
- Do not store precise public users' current coordinates in Neon. Store their confirmed saved choices in their own browser storage until a real public account system is explicitly approved.
- Admin location changes remain JWT-protected. Public APIs are read-only against canonical PowerTrack locations and schedules.
- Validate coordinates and South Africa bounds on both reverse requests and saves; constrain server requests to fixed Nominatim endpoints (no arbitrary URL proxying).
- Preserve required OpenStreetMap attribution in a visible map footer.

## Tests
- Mock Nominatim responses; test South Africa country restriction, normalized address variants/missing fields, malformed payloads, empty search, invalid coordinates, timeouts/errors, and rate-limit behavior without depending on external uptime.
- Verify requests are server-side and use the configured descriptive User-Agent/contact identity.
- Test public browser flow with stubbed geolocation: search submission only, result selection, map recenter/marker, drag-end reverse geocode, confirm/save/reload, and all geolocation error modes.
- Test exact stored-zone match and no-match behavior; ensure unmatched coordinates never receive another zone's status or schedule.
- Test admin MapLibre/Nominatim flow, legacy zones without coordinates, environment examples, and absence of Mapbox imports/routes/dependencies.
- Run all existing location/schedule/status/auth/admin tests, migrations if changed, client lint/build, and desktop/mobile browser checks.

## Acceptance criteria
1. There are no Mapbox packages, runtime calls, routes, token variables, or user-facing Mapbox configuration messages remaining.
2. Public exact-address search and reverse geocoding go through the PowerTrack API and follow Nominatim's usage constraints.
3. MapLibre renders an attributed OpenStreetMap-compatible map client-side, with a South Africa initial view, selectable/draggable marker, and current-location control.
4. User can review normalized hierarchy and coordinates, adjust the pin, then confirm; Home/Work saves persist locally across reloads without introducing a public account.
5. PowerTrack status/schedules load only for an exact verified zone match; otherwise the interface clearly separates physical-location selection from schedule matching.
6. Admin location editing uses the same MapLibre/Nominatim behavior and remains protected; canonical locations/schedules stay Neon-backed.
7. Existing saved places and current PowerTrack functionality remain intact; lint, build, tests, and mobile checks pass.

## Out of scope
- Mapbox, Google mapping/geocoding, paid map services, public account creation, anonymous Neon user-location storage, fabricated zones, unrestricted Nominatim scraping, and schedule prediction.