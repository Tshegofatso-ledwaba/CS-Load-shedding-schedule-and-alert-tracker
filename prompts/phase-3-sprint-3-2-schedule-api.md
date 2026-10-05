# Phase 3, Sprint 3.2: Database-backed schedule API

## Goal
Move public schedule reads to PostgreSQL when `DATABASE_URL` is configured, with zone/date filtering, stable ordering, and explicit upcoming/history boundaries.

## In scope
- Add a schedule repository using the existing PostgreSQL pool.
- Use the database for `/api/schedules`, `/api/schedules/upcoming`, `/api/schedules/history`, and `/api/schedules/:id` in database mode.
- Support `zoneBlockId` filtering consistently on all collection endpoints.
- Return schedules in the existing API shape (`zoneBlockId`, `startTime`, `endTime`, `source`, `updatedAt`).
- Ensure upcoming excludes schedules already started and history excludes schedules that have not ended, using South African time.
- Add an idempotent canonical schedule seed for Zone 2 so the connected database has useful test data.
- Keep the in-memory fallback and status service unchanged.

## Out of scope
- Status repository migration or status calculation changes.
- Frontend selected-area reload.
- Schedule CRUD, admin editing, or database schema redesign.

## Acceptance criteria
- Database mode returns all schedules in stable date/start-time order.
- Zone filtering returns only matching schedules.
- Upcoming schedules exclude started windows.
- History excludes future and currently active windows.
- Schedule detail returns `404` for an unknown ID.
- Empty results return `[]`.
- Database failures use the existing controlled JSON error shape.
- Existing no-database fallback remains runnable.

## Validation
- Apply migrations and run the idempotent location and schedule seeds.
- Smoke-test all schedule endpoints against the connected database.
- Verify zone filtering, stable ordering, empty results, and unknown detail behavior.
- Run diagnostics on changed files and record results in `SPRINT_PROGRESS.md`.
