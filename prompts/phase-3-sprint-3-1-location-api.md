# Phase 3, Sprint 3.1: Database-backed location API

## Goal
Make the public location endpoints read the canonical location hierarchy from PostgreSQL when `DATABASE_URL` is configured, with explicit search, validation, and not-found behavior. Keep schedule/status and frontend changes for later increments.

## In scope
- Add a small PostgreSQL pool/repository boundary for province, city, area, suburb, and zone reads.
- Support the existing public location routes: provinces, cities, areas, partial search, and location detail.
- Return enough hierarchy context for the dashboard, including the zone/block that owns schedules.
- Validate search input and location identifiers at the route boundary.
- Return a safe empty collection for blank search and `404` for unknown location IDs.
- Preserve a clearly isolated in-memory fallback for local runs without `DATABASE_URL`.
- Add focused API/repository validation where the existing toolchain supports it.

## Out of scope
- Schedule repository/API migration, status service changes, or frontend area reload.
- Admin schedule CRUD or public accounts.
- Database schema redesign, migrations, or seed changes.
- Unrelated formatting changes in `PROJECT_CONTRACT.md`.

## Acceptance criteria
- `GET /api/locations/provinces`, `/cities`, and `/areas` return database data in database mode.
- `GET /api/locations/search?q=Sosh` returns matching areas with city/province context.
- Blank search returns `[]` without a database query error.
- Unknown location IDs return `404` with the standard error shape.
- Location detail includes province, city, area, suburb, and zone/block context.
- Database failures produce a controlled server error and do not leak SQL or credentials.
- Existing in-memory local behavior remains available when no `DATABASE_URL` is configured.
- No secrets are sent to the client or committed.

## Validation
- Run the server/API smoke checks against the configured database.
- Verify the Soshanguve search and location detail responses.
- Verify blank search and unknown ID behavior.
- Run client lint/build only if shared client files are touched.
- Record commands, results, and any database seed limitations in the sprint completion record.
