# Verify and run PowerTrack

## Goal
Run the current application locally, confirm the API and client start cleanly,
and check the public page plus API health endpoint. Fix only concrete errors
found by these checks; do not make speculative or unrelated changes.

## Baseline checks already completed
- Client ESLint completed successfully (exit code 0).
- Client production build completed successfully.
- All eight server test files passed:
  `admin-access`, `admin-locations`, `admin-registration`, `auth`,
  `locations-search`, `nominatim`, `schedule-admin`, and `status`.
- The editor Problems view reported no diagnostics.
- Node.js v24.18.1 and npm 12.0.2 are installed; client and server
  dependencies are present.

## Execution
1. Start the server from `server/` and the Next.js development server from
   `client/`, using their existing npm scripts and configured local ports.
2. Never display or log the contents of `.env`, `.env.local`, or other secret
   configuration files.
3. Request the local API health route and the client root page. Confirm both
   return successful responses.
4. If either process fails, diagnose the actual startup/response error, make
   the smallest related fix, and rerun the relevant checks.
5. Keep both processes running for the user if startup and smoke tests succeed.

## Report
Provide the API and client URLs, health/page smoke-test results, checks run,
and any remaining warnings or blockers. Do not claim code fixes where no
confirmed error was found.
