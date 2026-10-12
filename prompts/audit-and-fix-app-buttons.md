# Audit and fix application button functionality

## Goal
Ensure every visible button/action across the public and admin application performs its intended operation, navigates appropriately, or clearly reports why it cannot complete.

## Scope
Audit the interactive actions across the public home page, shared components, admin login, dashboard, locations, and schedules:
- Public location selection: use current location, search, choose result, adjust pin, check/confirm schedule area, save Home/Work, check pinned locations, remove pinned entries, and theme toggle.
- Navigation and shared controls: back, brand/navigation links, sign out, password visibility toggle, metric detail dialogs and close/Escape.
- Admin location actions: search, select location, create/update, create schedule navigation, delete, and map/pin interactions.
- Admin schedule actions: choose location, collapse/expand create form, publish, edit, cancel edit, delete, and map preview controls.
- For each action, verify disabled/busy states, success state, and errors. Fix only confirmed nonfunctional or misleading behavior.
- Actions disabled by configuration or required prerequisites must explain the requirement and direct the user to the relevant next step; they must not silently do nothing or show success.
- Add or update focused tests for any corrected behavior.

## Constraints
- Preserve existing product behavior and API contracts unless a narrowly necessary fix is identified.
- Do not introduce new features or broaden CRUD/auth/security scope.
- Do not remove intended dependency safeguards such as refusing to delete locations with schedules.
- Keep changes surgical, preserve unrelated worktree edits, and follow existing visual/accessibility patterns.

## Acceptance criteria
- Every rendered `<button>` has a meaningful, reachable action or is clearly disabled with an explanation.
- Every action either completes and updates the UI, navigates, or reports a clear actionable failure.
- No action reports success when the server did not persist the change.
- Public users remain unauthenticated; protected admin actions retain authentication.
- Existing loading, empty, error, and success handling remains consistent.

## Validation
- Run focused tests covering affected behavior, including admin location and schedule flows where relevant.
- Run client lint, TypeScript checking, and production build.
- Provide a concise button/action verification checklist and identify any actions that remain unavailable because of deployment configuration or missing prerequisites.
