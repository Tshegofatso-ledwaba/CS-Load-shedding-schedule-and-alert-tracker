# Fix: Schedule Loading Fails with the Root Server Entry Point

## Goal
Ensure that starting the API through `server/index.js` serves the same PowerTrack API as the supported `npm start` command, so the client can load status and schedules instead of receiving a generic health-shaped object.

## Confirmed cause
The client requests `GET /api/status/zone-2` and `GET /api/schedules/upcoming?zoneBlockId=zone-2`, expecting a status object and a schedule array. `server/index.js` currently starts a standalone placeholder HTTP server that returns `{ status, message, port }` for every path. The browser therefore fails status validation when this entry point is used. `server/package.json` correctly starts `server/src/index.js`.

## In scope
- Replace the duplicate placeholder behavior in `server/index.js` with a small delegation to the supported Express API entry point (`./src/index`).
- Preserve the existing package scripts and API behavior.
- Add or adapt the smallest practical smoke test to verify the root entry point exposes the health and schedule routes with their expected response shapes, if the test setup supports a reliable isolated server process.
- Run the focused smoke check and the existing server tests; report any environment-dependent constraints.

## Out of scope
- Changing schedule filtering, seed data, database behavior, or the frontend error message.
- Changing API contracts or introducing a new server framework.

## Acceptance criteria
- Starting from the `server` directory with `node index.js` serves `/api/health`, `/api/status/zone-2`, and `/api/schedules/upcoming?zoneBlockId=zone-2` through Express.
- The schedule endpoint returns an array (including `[]` when there are no upcoming schedules), not the placeholder's generic object.
- `npm start` and `npm run dev` continue to work unchanged.
- Existing server checks pass.

## Validation
1. Start the server with `node index.js` on an isolated test port and verify the health response and that the schedule route returns an array.
2. Run `npm test`-equivalent existing scripts: `npm run test:status`, `npm run test:auth`, and `npm run test:admin-access` from `server`.
