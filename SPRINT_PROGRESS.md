# Sprint Progress

## Phase 3, Sprint 3.1 - Location API

**Goal:** Serve the public location hierarchy from the connected PostgreSQL database with safe search and detail behavior.

**Completed:**

- Added a PostgreSQL pool and location repository.
- Switched province, city, area, search, and detail routes to database mode when `DATABASE_URL` is configured.
- Added repeatable schema migration and canonical Friday location seed commands.
- Preserved the in-memory fallback for local runs without a database.

**Validation:**

- `npm run db:migrate` succeeded against the configured database.
- `npm run db:seed:locations` succeeded twice without duplicate hierarchy records.
- `GET /api/locations/search?q=Sosh` returned Soshanguve and City of Tshwane.
- Blank search returned `[]`.
- Location detail resolved to Zone 2.
- Unknown location returned `404`.
- Editor diagnostics reported no errors in the changed server files.

**Known limitations:**

- Schedule, status, and admin statistics still use in-memory data.
- The frontend selection still changes the visible label without reloading the selected zone.

**Next sprint:**

Phase 3, Sprint 3.2 - move schedule reads to the database and add zone/date filtering with stable ordering.

## Phase 3, Sprint 3.2 - Schedule API

**Goal:** Serve public schedule reads from the connected PostgreSQL database with filtering and stable time ordering.

**Completed:**

- Added a PostgreSQL schedule repository for all, upcoming, history, and detail reads.
- Added consistent `zoneBlockId` filtering, including history results.
- Added stable ordering for all schedule collections.
- Added an idempotent canonical schedule seed for Zone 2.
- Preserved the in-memory fallback when no database is configured.

**Validation:**

- `npm run db:migrate` succeeded.
- Location seed and schedule seed both succeeded twice without duplicate seed rows.
- Database mode returned 7 Zone 2 schedules in stable order.
- Upcoming returned 5 schedules and history returned 2 schedules.
- Unknown zone filtering returned `[]`.
- Schedule detail returned the requested row.
- Unknown schedule detail returned `404`.
- Changed server files reported no editor diagnostics.

**Known limitations:**

- Database identifiers are UUIDs while the in-memory fallback uses labels such as `zone-2`.
- Status calculation and admin statistics still use in-memory schedules.
- The frontend still requests the fallback `zone-2` identifier and does not reload after area selection.

**Next sprint:**

Phase 3, Sprint 3.3 - move status calculation to database schedules and add boundary-focused status tests.

## Phase 3, Sprint 3.3 - Status API

**Goal:** Calculate public status from database-backed schedules using South African time and correct countdown targets.

**Completed:**

- Status route now loads schedules from PostgreSQL in database mode.
- Existing `zone-2` frontend identifier resolves to the database Zone 2 record.
- Active, upcoming, exact-end, next-day, and no-event status behavior is covered by focused tests.
- Countdown target remains server-generated and timezone-aware.

**Validation:**

- `npm run test:status` passed.
- Live `GET /api/schedules?zoneBlockId=zone-2` returned 7 schedules.
- Live `GET /api/status/zone-2` returned `POWER_AVAILABLE`, Stage 4, Zone 2, `Africa/Johannesburg`, and a countdown target.
- Changed status, schedule, location, and API files reported no known diagnostics.

**Known limitations:**

- Authentication and admin statistics still use environment/in-memory data.
- The client still uses a fixed default zone and area selection does not yet reload a selected database zone.

**Next sprint:**

Phase 4, Sprint 4.1 - harden credential configuration and login validation.

## Phase 4, Sprint 4.1 - Authentication foundation

**Goal:** Prevent production startup with unsafe implicit credentials and validate JWT behavior.

**Completed:**

- Production now requires explicit `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` values.
- Development retains the documented local defaults.
- Added focused JWT issuance/verification and expiration tests.

**Validation:**

- `npm run test:auth` passed.
- Existing status tests remained available and passing.

**Known limitations:**

- Login still compares against an environment-derived administrator rather than a database administrator record.
- Logout is still client-side token removal without server-side revocation.

**Next sprint:**

Phase 4, Sprint 4.2 - protected admin endpoint hardening, role validation, and session revocation design.

## Admin access protection update

**Completed:**

- Removed the Admin link from the public PowerTrack navigation.
- Kept administrator access available directly at `/admin/login`.
- Redirected missing, expired, and unauthorized dashboard sessions to `/admin/login`.
- Required the `ADMIN` JWT role on protected admin API requests.
- Hardened malformed `JWT_EXPIRES_IN` handling so an invalid development value cannot break login.

**Validation:**

- Client lint and production build passed.
- Missing admin token returned `401`.
- Malformed authorization returned `401`.
- Valid non-admin token returned `403`.
- Valid administrator login returned `200` and authorized dashboard access returned `200`.

## Administrator registration update

**Completed:**

- Added a registration option to the dedicated `/admin/login` screen.
- Added `POST /api/auth/register` with email/password validation.
- Registration requires the server-only `ADMIN_REGISTRATION_KEY`.
- Registered administrator passwords are stored as bcrypt hashes in PostgreSQL.
- Registered administrators can sign in through the existing login flow.
- Added `server/.env.example` documentation for the registration key.

**Validation:**

- Registration is closed with `403` when the server key is not configured.
- Existing authentication, authorization, status, client lint, and client build checks passed.

**Usage:**

Set `ADMIN_REGISTRATION_KEY` in `server/.env`, restart the API, open `/admin/login`, and choose `Register an administrator`. The key is never entered into public navigation or stored in the browser.