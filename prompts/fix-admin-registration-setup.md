# Fix Admin Registration Setup Feedback

## Goal
Make administrator registration failures accurately explain the missing server configuration and let registration work when the required secure configuration is present. Preserve database-backed accounts and the registration-key gate.

## Verified context
- The login page posts `email`, `password`, and `registrationKey` to `POST /api/auth/register`.
- The API currently checks the registration key before checking `DATABASE_URL`.
- In this workspace, `server/.env` is absent. Registration cannot persist an administrator until a database is configured.
- Production requires an explicit `ADMIN_REGISTRATION_KEY`; never send this value to the browser or commit it.
- The existing registration feature stores bcrypt hashes through the database-backed auth service.

## Requirements
1. Keep admin registration protected by a server-only `ADMIN_REGISTRATION_KEY`; do not remove or weaken key validation, and do not add in-memory admin persistence.
2. Make server responses distinguish a missing database configuration from a missing or incorrect registration key. Check required persistence configuration early enough that a database-less local server returns the database requirement rather than a misleading key message.
3. Keep validation responses actionable without disclosing the configured key, environment values, or secrets to the browser.
4. Update the admin registration UI and setup documentation so an operator can tell that registration requires both a server-configured key and a configured database, and knows which server-side variables to set.
5. Preserve successful database-backed registration, duplicate-email handling, password validation, and all existing login behavior.
6. Add focused tests for missing database configuration, missing/incorrect key, successful registration where practical, and duplicate registration. Tests must not require real credentials or a production database.

## Acceptance criteria
- A local API without `DATABASE_URL` returns a clear database-configuration error for registration, not `Administrator registration is not enabled.`
- With a database configured but no valid key, registration remains rejected with an actionable but non-secret error.
- With a database and valid server key, a valid registration succeeds and stores only a bcrypt hash.
- No secret is exposed in client bundles, responses, or committed files.
- Existing login and registration security behavior remains intact.

## Verification
- Run the focused server authentication/registration tests and any existing auth/admin access checks.
- Run the client lint/build if the registration UI changes.
- Verify the UI explains requirements without rendering or fetching the key value.
