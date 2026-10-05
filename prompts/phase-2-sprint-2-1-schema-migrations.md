# Phase 2, Sprint 2.1: Schema and migrations

## Goal
Create a repeatable PostgreSQL database foundation for PowerTrack without wiring the runtime API to PostgreSQL yet. Keep the existing in-memory API behavior unchanged until Sprint 2.2.

## Context
The repository currently has a single `database/schema.sql` draft and an Express API backed by in-memory seed data. The project contract defines the canonical hierarchy:

`Province -> City/Municipality -> Area -> Suburb -> Zone/Block -> Schedule`

The Friday seed hierarchy is Gauteng, City of Tshwane, Soshanguve, Soshanguve Block F, and Zone 2. The next sprint will add repositories, runtime connection handling, and idempotent seed execution; do not pull those changes into this sprint.

## In scope
- Split the schema into ordered, rerunnable migration files under `database/migrations/`.
- Add a minimal migration runner using the existing `pg` dependency and `DATABASE_URL`.
- Track applied migrations in a dedicated migration table.
- Preserve the required location hierarchy, schedules, administrators, and admin sessions.
- Preserve foreign keys, cascade behavior, uniqueness rules, stage 1-8 validation, allowed source values, required fields, and `start_time < end_time` validation.
- Add indexes needed by the contract for location lookup/search and schedule queries.
- Document the migration command and required environment variable in the relevant README or database documentation.
- Add a safe local configuration path that fails clearly when `DATABASE_URL` is missing; never commit credentials.

## Out of scope
- API repository/service wiring or replacing in-memory reads.
- Seed data insertion or a seed command; that belongs to Sprint 2.2.
- Schedule CRUD.
- TypeScript conversion of the server.
- Frontend changes, authentication redesign, or unrelated contract formatting changes.

## Acceptance criteria
- A clean PostgreSQL database can be created by running the documented migration command.
- Running the migration command a second time succeeds without duplicating or corrupting schema state.
- Invalid schedule stages, invalid source values, invalid time windows, missing required relationships, and invalid foreign keys are rejected by the database.
- Required hierarchy and schedule query indexes exist.
- Migration failures exit non-zero with a useful error and do not report success.
- `DATABASE_URL` and other secrets remain environment-only and are absent from committed files.
- Existing `npm start` behavior remains unchanged when the migration runner is not invoked.

## Implementation constraints
- Use the existing CommonJS Node.js server style and `pg` dependency.
- Keep migration SQL explicit and reviewable; do not hide schema changes in runtime route code.
- Use transactions for each migration application and record successful applications only after the SQL succeeds.
- Do not modify user-owned unrelated changes in `PROJECT_CONTRACT.md`.

## Validation
- Run the migration command against an available PostgreSQL database, if configured.
- Run the migration command twice and verify the second run is a no-op success.
- Exercise database constraint failures for stage, source, time ordering, and foreign-key relationships.
- Run the existing client lint/build checks only if shared files are touched; otherwise validate the server/migration slice directly.
- Record the exact commands and any unavailable database prerequisite in the sprint completion record.

## Expected deliverables
- Ordered migration SQL files.
- Migration runner and package script.
- Documentation for setup and execution.
- Focused validation evidence.
- Sprint completion record in the format defined by `PROJECT_CONTRACT.md`.
