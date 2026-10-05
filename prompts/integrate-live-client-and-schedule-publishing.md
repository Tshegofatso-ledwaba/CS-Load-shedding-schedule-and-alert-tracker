# Integrate live client data and outage publishing

## Goal
Make the public client and Express API behave as one interactive schedule experience: selecting an area loads that location's server-computed status and schedule, and an administrator's saved outage remains visible in the admin published list and public schedule.

## Findings
- `client/app/page.tsx` always requests status and upcoming schedules for `zone-2`. Area search only changes the displayed label; it does not reload data for the selected location.
- Search responses identify areas, while status and schedules are keyed by zone-block ID. The client needs a server-backed resolution from a selected area to its relevant zone block; do not calculate status in the browser.
- `POST /api/schedules` currently appends only to the in-memory seed array. With `DATABASE_URL` configured, schedule reads prefer PostgreSQL, so a successful admin save may not appear in the admin list or public view and is lost on server restart.
- The admin form currently accepts a free-text zone ID. Saving must validate and persist the zone relationship, and the post-save published list must be refreshed from the same source as the public endpoints.
- Successful empty PostgreSQL schedule queries currently fall back to in-memory seeds, which can make the public list disagree with status calculated from database rows.

## Scope
- Add a backend schedule-creation service that inserts into PostgreSQL when configured, validating the zone/block relationship and returning the same schedule shape used by existing list endpoints.
- Preserve the existing no-database local development fallback by appending to the shared in-memory data source only when the database is not configured.
- Ensure admin and public list/status endpoints read the saved schedule from their authoritative source. Do not report success when persistence fails.
- Populate the admin zone/block selector from the backend so administrators choose a real persisted location rather than guessing an ID.
- Update the public client so choosing a search result resolves a zone block and reloads that zone's status and upcoming schedules. Keep status calculation on the server and use `Africa/Johannesburg` server logic.
- Make the admin save flow show validation/API errors, prevent duplicate submission while saving, and reload the published list after successful persistence.
- Add focused server regression coverage for create, admin listing, public upcoming visibility, authentication, invalid zone, and location-specific client/API behavior where practical.
- Keep visual changes consistent with the current PowerTrack interface and retain loading, empty, and error states.

## Out of scope
- Editing or deleting schedules, notifications, public accounts, prediction features, unrelated refactors, and migration redesign.
- Do not silently change database configuration or commit secrets. If no `DATABASE_URL` is available locally, validate the fallback path and clearly report that durable PostgreSQL behavior still requires configured credentials.

## Acceptance criteria
1. With PostgreSQL configured, an authenticated admin save inserts a schedule tied to a real zone-block row; invalid zone references fail with a useful client-visible error.
2. The saved schedule appears in `GET /api/admin/schedules` and `GET /api/schedules/upcoming` for its zone, and remains after server restart.
3. Without PostgreSQL configured, the local fallback continues to show the newly created schedule in admin and public lists for the lifetime of the server process.
4. Selecting a different area on the public client fetches status and upcoming schedules for the resolved zone; the status comes from `GET /api/status/:zoneBlockId`, not client-side calculations.
5. Existing authentication, schedule validation, and client build checks continue to pass.

## Validation
1. Run the server's focused schedule/admin tests and the existing auth/status tests.
2. In local fallback mode, create an outage through the admin UI and verify it appears in Published schedules and the matching public schedule view without a full page reload.
3. When a test database is configured, create an outage, verify both list endpoints, restart the API, and verify the row remains visible.
4. Run the client production build and manually select an area to confirm its status/schedule requests use the resolved zone ID.