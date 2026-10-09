# Show place names in recent schedule updates

## Goal
Include the human-readable place associated with each entry in the admin dashboard's Recent schedule updates list, rather than showing only schedule date and time.

## Scope
- Update `GET /api/admin/dashboard` recent updates to include a human-readable place name for each schedule in both supported modes:
  - In-memory seed data: resolve each schedule's `zoneBlockId` using the location hierarchy in seed data.
  - Database-backed: join the schedule's Zone/Block and location hierarchy, returning the Zone/Block name and useful parent place context (suburb, area, city, province).
- Update the admin dashboard's `ScheduleItem` type and Recent schedule updates row to display the location clearly alongside the existing date, time, stage, and source.
- Preserve existing recent update ordering, limit, stats, auth, and error handling.
- If the associated zone/location cannot be resolved, render an explicit unavailable label rather than hiding the place or displaying an internal ID.

## Constraints
- Do not change schedule CRUD or public schedule/status behavior.
- Keep the database-backed implementation efficient with a single joined recent-update query.
- Keep location hierarchy and schedule results backed by real server data; do not fabricate names in the client.
- Make only the necessary server schedule/dashboard, client dashboard, and directly related test changes.

## Acceptance criteria
- Every recent update with a resolvable location displays its Zone/Block name and parent place context.
- Database-backed and in-memory responses have a consistent response shape.
- Recent updates still display date, time range, stage, and source and remain readable on narrow screens.
- Unresolved location references show a clear fallback, not a raw UUID/internal identifier.

## Validation
- Run the relevant admin dashboard/server tests, client ESLint, TypeScript checking, and production build as available.
- Verify both in-memory and database-backed recent update response shapes.
