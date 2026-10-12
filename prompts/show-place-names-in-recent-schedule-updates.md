# Show place names in recent schedule updates

## Goal
Include a human-readable location for each item in the admin dashboard's Recent schedule updates, alongside its date and time.

## Scope
- Extend the admin dashboard API recent-update response with a Zone/Block display name and location hierarchy for both database-backed and in-memory seed data.
- Prefer a non-empty official Zone/Block name when available, otherwise use its regular name.
- Include parent place context (suburb, area, city/municipality, province), avoiding duplicate consecutive hierarchy names.
- Update the dashboard schedule type and render place name and hierarchy with existing date, time range, stage, and source.
- When location data cannot be resolved, show an explicit unavailable label rather than an internal identifier.
- Preserve update order/limit, dashboard statistics, authentication, and error handling.

## Constraints
- Do not change schedule CRUD, public endpoints, or status behavior.
- Use a single joined query for database-backed recent updates.
- Keep all displayed names backed by server data.
- Make only the focused API, dashboard UI, and relevant test changes.

## Acceptance criteria
- Recent updates show readable place names in both data modes.
- Date, time range, stage, and source remain visible.
- Missing hierarchy does not expose raw internal IDs.
- Dashboard layout remains readable at narrow widths.

## Validation
- Run the schedule-admin integration test, admin dashboard ESLint, TypeScript check, and client production build.
