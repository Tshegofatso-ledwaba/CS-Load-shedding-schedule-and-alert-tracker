# PowerTrack Integration Readiness Check

## Goal
Verify that the Friday-milestone public dashboard and administrator sign-in/dashboard flows work end to end with the configured local API, and repair only reproducible integration defects.

## Current evidence
- Client lint and production build pass.
- Server status, auth-token, and admin-role test scripts pass.
- Live health, location search, status, and upcoming-schedule routes respond with expected JSON shapes.
- The live login route returned `401` for the README's documented local default credentials. This may be an intentional `server/.env` override; no environment secrets have been inspected.
- Existing server auth tests exercise JWT utilities, not the HTTP login or protected-dashboard route flow.

## In scope
- Add focused integration coverage for public API route response shapes and the admin login-to-protected-dashboard flow, including missing/invalid authorization responses.
- Reproduce and diagnose the local login result using environment-safe checks. Do not print or disclose passwords, JWTs, registration keys, database URLs, or other secret values.
- Ensure the documented development credentials work when no overrides are configured, and that explicit configured credentials are honored.
- Fix only confirmed defects in the milestone flows; preserve the existing API contracts and small local architecture.
- Run all existing server test scripts, the new focused integration check, client lint, and client production build.

## Out of scope
- Admin schedule CRUD, public accounts, notification/planning features, or a broad rewrite.
- Reworking database-backed persistence or changing credentials/environment files.
- Making selected-area changes reload status/schedules; this remains a documented baseline limitation.
- Changing client-side token removal into server-side session revocation.
- Treating an empty schedule response as an API failure when its response shape and empty state are valid.

## Acceptance criteria
- Public health, location/search, schedule, and status routes return their contracted shapes in the supported local mode.
- With no credential overrides, the documented development administrator can sign in and use the protected dashboard; explicit configured credentials continue to control sign-in when set.
- Missing, malformed, expired, or invalid tokens are rejected; a non-admin role cannot access the dashboard.
- Tests exercise HTTP behavior rather than only testing JWT library primitives.
- Client lint/build and all server checks pass, or any external configuration blocker is reported with a safe, exact remediation that does not reveal secret values.
- Known milestone limitations remain unchanged.

## Validation
1. Run `npm run test:status`, `npm run test:auth`, and `npm run test:admin-access` from `server`.
2. Run the new isolated HTTP integration check from `server`.
3. Run `npm run lint` and `npm run build` from `client`.
4. Verify the app's public dashboard and `/admin/login` → `/admin/dashboard` flow against the local API without exposing credentials or tokens in output.