# Show place names in recent schedule updates

## Goal
Include a human-readable location for each entry in the admin dashboard's Recent schedule updates, alongside its date and time.

## Scope
- Extend `GET /api/admin/dashboard` recent updates with a Zone/Block display name and location hierarchy for both database-backed and in-memory seed data.
- Prefer a non-empty official Zone/Block name when available; otherwise use its regular name.
- Include parent place context (suburb, area, city/municipality, province), avoiding duplicate consecutive hierarchy names.
- Update the dashboard `ScheduleItem` type and render the place name and hierarchy alongside the existing date, time range, stage, and source.
- When location data cannot be resolved, show an explicit unavailable label rather than an internal identifier.
- Preserve recent-update ordering and limit, dashboard statistics, authentication, and error handling.

## Constraints
- Do not change schedule CRUD, public endpoints, or status behavior.
- Use a single joined query for database-backed recent updates.
- Keep all displayed names backed by server data; do not fabricate names in the client.
- Make only the focused API, dashboard UI, and relevant test changes.

## Acceptance criteria
- Recent updates show readable Zone/Block names and parent place context in both data modes.
- Database-backed and in-memory responses have a consistent response shape.
- Date, time range, stage, and source remain visible and readable on narrow screens.
- Missing location data shows a clear fallback, not a raw internal identifier.

## Validation
- Run the relevant schedule-admin/server tests and client lint, type check, and production build as available.
- Verify recent-update response shapes in both in-memory and database-backed modes.
