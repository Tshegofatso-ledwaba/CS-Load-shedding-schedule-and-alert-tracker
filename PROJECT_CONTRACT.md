# PowerTrack Project Contract

**Project:** PowerTrack — South African Load-Shedding Schedule and Alert Tracker  
**Contract version:** 1.0  
**Contract date:** 17 September 2026  
**Primary repository:** `CS-Load-shedding-schedule-and-alert-tracker`

## 1. Purpose

PowerTrack exists to make load-shedding information quick to understand and useful for planning.

Load-shedding schedules change frequently and are often published in formats that are difficult to check quickly. This creates avoidable uncertainty for households and small businesses that need to plan work, study, cooking, charging, security, and daily operations around electricity availability.

PowerTrack must answer the user's immediate question:

> What is happening with my electricity right now, and what happens next?

The product will provide a clear location-based status, a reliable upcoming schedule, and a countdown to the next relevant change in power availability.

## 2. Product Vision

PowerTrack should become a trusted, location-aware electricity planning tool for South African communities.

The product must be:

- Clear enough to understand in seconds.
- Accurate about the difference between current status and future schedule.
- Honest about manually maintained, external, and predicted information.
- Useful on mobile, tablet, and desktop.
- Simple for the public and controlled for administrators.
- Structured so future features can be added without rewriting the core system.

## 3. Contract Principles

These principles apply to every phase and sprint:

1. Real schedule and status data must come from the backend. The frontend must not hard-code dashboard results.
2. Status must be calculated from schedule data and South African time, using `Africa/Johannesburg`.
3. Predicted or unofficial information must never be presented as official information.
4. Public users do not need accounts for the Friday milestone.
5. Administrators must authenticate before accessing administrative data.
6. Secrets must come from environment variables and must not be committed.
7. Every API-driven view must support loading, success, empty, and error states.
8. Every completed sprint must include focused validation before the next sprint begins.
9. The visual system follows the supplied PowerTrack direction: deep green-black surfaces, muted dark green cards, warm burnt-orange accents, off-white text, restrained mint status indicators, rounded modern cards, and minimal glassmorphism.
10. The smallest working change is preferred over speculative complexity.

## 4. Users and Roles

### 4.1 Public user

A resident, household member, student, or small-business operator who wants to check electricity status for a selected area.

The public user can:

- Search for an area.
- View the current selected area.
- See whether power is available or an outage is active.
- See the relevant stage.
- See the next outage or expected return of power.
- View a live countdown.
- Browse upcoming and historical schedules when available.
- Read the schedule freshness/disclaimer information.

### 4.2 Administrator

A trusted operator responsible for maintaining schedule information and monitoring data quality.

The administrator can, subject to the approved future scope:

- Sign in through the private admin login.
- View schedule and location statistics.
- Maintain locations and schedules.
- Review recent schedule changes.
- Control data source and freshness information.

There is no public administrator registration flow.

## 5. Current System Baseline

The repository currently contains:

- A Next.js 16.3.5 client using React, TypeScript, Tailwind CSS, and the App Router.
- An Express 5 API running on Node.js/CommonJS.
- Seeded in-memory location and schedule data for Gauteng, City of Tshwane, Soshanguve, Soshanguve Block F, and Zone 2.
- Timezone-aware status calculation in `server/src/status.js`.
- Public API endpoints for locations, search, schedules, history, upcoming schedules, and status.
- JWT login with bcrypt password verification and a protected admin dashboard endpoint.
- A responsive public dashboard at `/`.
- Admin login at `/admin/login`.
- A protected client-side admin dashboard at `/admin/dashboard`.
- A PostgreSQL schema draft at `database/schema.sql`.
- Environment templates for client and server.

The current implementation is a Friday milestone foundation, not the final production system.

### 5.1 Known baseline limitations

These limitations are accepted in the current milestone and are tracked by later sprints:

- The API uses in-memory seed data at runtime.
- `DATABASE_URL` is not yet used by the API for reads and writes.
- The backend is currently JavaScript rather than the target TypeScript architecture.
- The client area selection changes the visible location label but does not yet reload status and schedules for a different zone.
- The database schema exists, but migrations, database seed execution, and repository/service queries are not yet implemented.
- Admin logout is currently client-side token removal plus a simple API response; server-side token/session revocation is still future work.
- Automated backend tests and browser end-to-end tests are still required.
- Schedule administration CRUD is not part of the Friday milestone.

## 6. Technical Contract

### 6.1 Target architecture

```text
PowerTrack/
├── client/                 # Next.js public and admin applications
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   └── types/
├── server/                 # Express REST API
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       ├── validators/
│       └── repositories/
├── database/               # PostgreSQL schema, migrations, and seeds
└── PROJECT_CONTRACT.md
```

### 6.2 Deployment target

- Next.js client: Vercel.
- Express API: Render.
- PostgreSQL database: Neon.
- Local development: client on port `3000`, API on port `3001`.

### 6.3 Required environment variables

```env
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=1h
ADMIN_EMAIL=
ADMIN_PASSWORD=
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Values must be documented through `.env.example` files and must not be committed.

### 6.4 Location hierarchy

The canonical hierarchy is:

```text
Province
  └── City/Municipality
      └── Area
          └── Suburb
              └── Zone/Block
                  └── Schedule
```

The Friday seed must include:

```text
Gauteng
└── City of Tshwane
    └── Soshanguve
        └── Soshanguve Block F
            └── Zone 2
```

### 6.5 Schedule contract

Every schedule contains:

- `id`
- `zone_block_id`
- `stage`, constrained to 1 through 8
- `date`
- `start_time`
- `end_time`
- `source`, one of `ADMIN`, `EXTERNAL`, or `PREDICTED`
- `created_at`
- `updated_at`

The database must reject invalid stage values, invalid relationships, and an end time that is not after the start time.

## 7. Status Contract

The backend owns status calculation.

### 7.1 Power available

Returned when no stored outage window currently contains the South African current time.

The response must include:

- `status: POWER_AVAILABLE`
- Human-readable label.
- Applicable stage when one is known.
- The next outage when one exists.
- Countdown target equal to the next outage start.
- Timezone and last-updated information.

### 7.2 Outage active

Returned when the current South African time is greater than or equal to the outage start and before the outage end.

The response must include:

- `status: OUTAGE_ACTIVE`
- Human-readable label.
- Active stage.
- Active outage window.
- Countdown target equal to the expected end of the outage.
- Timezone and last-updated information.

### 7.3 Required examples

For a Stage 4 schedule from `18:00` to `20:30`:

- At `17:30`, status is `POWER_AVAILABLE`, with a target of `18:00`.
- At `19:15`, status is `OUTAGE_ACTIVE`, with a target of `20:30`.
- At `20:30`, the outage is no longer active.

Midnight and date transitions must be covered by tests before production release.

## 8. API Contract

The API base path is `/api`.

### Public endpoints

```text
GET  /api/health
GET  /api/locations/provinces
GET  /api/locations/cities
GET  /api/locations/areas
GET  /api/locations/search?q=<partial-name>
GET  /api/locations/:id
GET  /api/schedules
GET  /api/schedules/upcoming
GET  /api/schedules/history
GET  /api/schedules/:id
GET  /api/status/:zoneBlockId
```

### Authentication endpoints

```text
POST /api/auth/login
POST /api/auth/logout
```

### Protected administrator endpoint

```text
GET /api/admin/dashboard
```

Protected endpoints must reject missing, malformed, expired, or invalid JWTs.

## 9. User Experience Contract

### 9.1 Public dashboard

The first screen must prioritize:

1. Current power status.
2. Current stage.
3. Selected location.
4. Next outage or power-return event.
5. Countdown.
6. Upcoming schedule.
7. Last updated information and manual-data disclaimer.

The dashboard must be responsive and remain usable on small screens without simply shrinking the desktop layout.

### 9.2 Admin experience

The Friday admin flow is:

```text
Open /admin/login
    ↓
Submit credentials
    ↓
Receive JWT
    ↓
Open /admin/dashboard
    ↓
Load protected statistics
```

Unauthenticated access to the admin dashboard must redirect to `/admin/login` or be rejected by the protected API.

### 9.3 Accessibility and resilience

- Use semantic HTML and accessible labels.
- Do not rely on color alone to convey status.
- Respect reduced-motion preferences.
- Provide useful error text and retry/recovery actions.
- Keep text inside controls and cards at all supported viewport sizes.

## 10. Delivery Phases and Sprints

Each sprint ends with a working increment, a review of acceptance criteria, and recorded validation results.

### Phase 0 — Product alignment and discovery

**Goal:** Confirm the problem, users, scope, design direction, and technical boundaries.

#### Sprint 0.1 — Problem and user contract

Deliverables:

- Problem statement.
- Public user and administrator personas.
- Friday milestone scope.
- Out-of-scope list.
- Success measures.

Acceptance criteria:

- The team can explain the core user question in one sentence.
- Public and administrator responsibilities are separate.
- No public user account system is included in the Friday milestone.

#### Sprint 0.2 — UX and architecture contract

Deliverables:

- Figma-aligned visual direction.
- Location hierarchy.
- API boundary.
- Deployment boundary.
- Initial data and security decisions.

Acceptance criteria:

- The dashboard prioritizes current status and what happens next.
- Business logic is assigned to backend services rather than route handlers or UI components.
- Official, external, and predicted data are distinguishable.

### Phase 1 — Project foundation

**Goal:** Establish a clean, runnable client/server codebase.

#### Sprint 1.1 — Repository and client foundation

Deliverables:

- Next.js App Router application.
- TypeScript configuration.
- Tailwind CSS configuration.
- Shared visual tokens.
- Basic client routing.
- Client environment template.

Acceptance criteria:

- The client starts locally.
- The client passes lint.
- The client creates a production build.
- Root and admin route structure exists.

#### Sprint 1.2 — API foundation and security baseline

Deliverables:

- Express server.
- CORS configuration.
- Helmet/security headers.
- JSON parsing.
- Error response shape.
- Rate limiting for login.
- Server environment template.

Acceptance criteria:

- The API starts locally on port `3001`.
- `GET /api/health` returns a successful response.
- Secrets are not embedded in committed environment files.
- Unexpected errors return a controlled JSON response.

### Phase 2 — Database and data foundation

**Goal:** Move from local seed-only behavior to durable Neon PostgreSQL data.

#### Sprint 2.1 — Schema and migrations

Deliverables:

- PostgreSQL migration runner or migration files.
- Province, city, area, suburb, zone, schedule, administrator, and admin-session tables.
- Foreign keys and delete behavior.
- Stage and time constraints.
- Indexes for location search and schedule queries.

Acceptance criteria:

- A clean Neon database can be created from migrations.
- Invalid stages and invalid time windows are rejected.
- Required relationships cannot be null.
- Re-running migrations is safe.

#### Sprint 2.2 — Database repositories and seed data

Deliverables:

- Database connection pool using `DATABASE_URL`.
- Repository functions for location and schedule access.
- Idempotent seed script.
- Friday seed hierarchy and multiple historical/upcoming schedules.

Acceptance criteria:

- The API can read seeded data from Neon.
- The application no longer depends on in-memory schedules in normal database mode.
- Seed execution can be repeated without duplicate hierarchy records.
- Database connection failures produce a useful startup or request error.

### Phase 3 — Public REST API

**Goal:** Provide stable, validated, documented data endpoints.

#### Sprint 3.1 — Location API

Deliverables:

- Province, city, area, and location-detail endpoints.
- Partial search.
- Location hierarchy response shape.
- Query validation and not-found responses.

Acceptance criteria:

- Searching `Sosh` returns Soshanguve.
- Unknown locations return `404`.
- Empty search behavior is explicit and safe.
- Responses contain enough hierarchy context for the dashboard.

#### Sprint 3.2 — Schedule API

Deliverables:

- All-schedule endpoint.
- Upcoming endpoint.
- History endpoint.
- Schedule-detail endpoint.
- Zone and date filtering.
- Stable ordering.

Acceptance criteria:

- Upcoming schedules exclude schedules already started.
- History excludes future schedules.
- Filtering by zone returns only matching records.
- Empty areas return a valid empty collection, not a server error.

#### Sprint 3.3 — Status service and API

Deliverables:

- Dedicated status calculation service.
- Active outage detection.
- Upcoming outage detection.
- Countdown target.
- South African timezone handling.
- Status service unit tests.

Acceptance criteria:

- The required `17:30`, `19:15`, and `20:30` examples pass.
- Countdown targets are correct for both available and active states.
- Date and midnight transitions are tested.
- No dashboard status is hard-coded in the client.

### Phase 4 — Authentication and administrator access

**Goal:** Protect administrator functionality without creating public accounts.

#### Sprint 4.1 — Credential setup and login

Deliverables:

- Environment-configured initial administrator.
- Bcrypt password hashing and comparison.
- Login validation.
- JWT issuance and expiration.
- Invalid credential handling.

Acceptance criteria:

- Correct credentials produce a JWT.
- Incorrect credentials produce `401`.
- Passwords are never returned or stored in plain text.
- Missing credentials produce `400`.

#### Sprint 4.2 — Protected sessions and admin endpoint

Deliverables:

- JWT middleware.
- Role validation.
- Protected admin dashboard endpoint.
- Logout/session revocation design.
- Admin statistics query service.

Acceptance criteria:

- Missing and invalid tokens produce `401`.
- Expired tokens are rejected.
- Valid administrators can retrieve useful statistics.
- Logout behavior is documented and tested.

### Phase 5 — Public dashboard

**Goal:** Deliver the main Figma-aligned product experience using live backend data.

#### Sprint 5.1 — Dashboard status and location

Deliverables:

- PowerTrack header/navigation.
- Current status card.
- Current stage.
- Selected location display.
- Area search and selection.
- API loading, empty, and error states.

Acceptance criteria:

- Opening `/` loads status from the API.
- Search results are selectable.
- Location changes load the corresponding zone/status data rather than only changing the label.
- The user can tell whether power is currently available or in an outage.

#### Sprint 5.2 — Countdown and schedule presentation

Deliverables:

- Next outage card.
- Active outage return-time card.
- Client-side one-second countdown.
- Upcoming schedule list.
- Last-updated display.
- Manual-data disclaimer.

Acceptance criteria:

- The client does not request the API every second for countdown updates.
- Countdown does not become negative.
- Active outage counts down to power return.
- Upcoming outage counts down to outage start.
- Empty schedules are handled clearly.

#### Sprint 5.3 — Responsive and accessibility pass

Deliverables:

- Desktop, laptop, tablet, and mobile layouts.
- Keyboard-accessible controls.
- Semantic labels.
- Reduced-motion behavior.
- Visual status cues that do not depend only on color.

Acceptance criteria:

- No clipping or overlapping text at supported viewports.
- Search and navigation work on mobile.
- Loading and error states remain readable.
- Manual browser checks or automated browser checks cover desktop and mobile.

### Phase 6 — Admin dashboard

**Goal:** Complete the Friday administrator flow.

#### Sprint 6.1 — Admin login screen

Deliverables:

- `/admin/login` page.
- Form validation.
- Loading state.
- Invalid login state.
- Successful JWT storage/session handoff.

Acceptance criteria:

- Successful login routes to `/admin/dashboard`.
- Failed login remains on the login page with a useful message.
- Password input is not exposed in the UI.

#### Sprint 6.2 — Protected statistics dashboard

Deliverables:

- `/admin/dashboard` page.
- Session guard and redirect.
- Total areas statistic.
- Total zones statistic.
- Total schedules statistic.
- Upcoming schedules statistic.
- Recent schedule updates.
- Sign-out flow.

Acceptance criteria:

- Unauthenticated users cannot use the protected dashboard.
- Statistics come from the protected API.
- Expired sessions return the user to login.
- Empty or failed statistics responses are handled.

### Phase 7 — Quality, observability, and production hardening

**Goal:** Make the milestone dependable beyond a local demo.

#### Sprint 7.1 — Automated test suite

Deliverables:

- Status service unit tests.
- API integration tests.
- Authentication tests.
- Database repository tests.
- Frontend component or browser tests for core flows.

Acceptance criteria:

- Tests cover success, failure, empty, active outage, upcoming outage, and boundary-time behavior.
- Tests run from documented commands.
- A failing test blocks the relevant phase from being marked complete.

#### Sprint 7.2 — Validation and operational feedback

Deliverables:

- Request schema validation.
- Structured server logs.
- Correlation/request identifiers where useful.
- Schedule freshness metadata.
- Friendly API error codes/messages.

Acceptance criteria:

- Invalid filters and request bodies are rejected consistently.
- Errors can be traced to a route and request.
- Administrators can identify stale or missing schedule data.

#### Sprint 7.3 — Security review

Deliverables:

- Secret and dependency review.
- CORS review.
- JWT configuration review.
- Rate-limit review.
- Password and session handling review.
- Production environment checklist.

Acceptance criteria:

- No secrets are committed.
- Default development credentials cannot be used in production.
- Protected routes enforce authentication server-side.
- Dependency audit has no unresolved high-severity issue without an accepted exception.

### Phase 8 — Deployment and release

**Goal:** Release a repeatable staging/production deployment.

#### Sprint 8.1 — Staging deployment

Deliverables:

- Neon staging database.
- Render API service.
- Vercel client deployment.
- Environment configuration.
- CORS and API URL configuration.
- Seed/migration procedure.

Acceptance criteria:

- The deployed client can reach the deployed API.
- Database-backed status and schedules work in staging.
- Admin login works with staging credentials.
- No local development secret is reused in staging.

#### Sprint 8.2 — Release validation

Deliverables:

- Smoke-test checklist.
- Rollback procedure.
- Monitoring and health-check configuration.
- Release notes.

Acceptance criteria:

- Public flow passes from area selection through countdown.
- Admin flow passes from login through statistics.
- A rollback can be executed and documented.
- Known limitations are published.

### Phase 9 — Post-Friday product expansion

**Goal:** Add advanced value only after the core product is stable.

#### Sprint 9.1 — Schedule maintenance and freshness

- Admin schedule CRUD.
- Schedule validation UI.
- Bulk import or controlled external source ingestion.
- Change history.
- Freshness indicators.
- "What changed?" comparison.

#### Sprint 9.2 — Saved areas and notifications

- Local-storage saved areas first.
- Optional user accounts only when justified.
- Notification preferences.
- Email, push, or messaging integrations.
- Change and outage alerts.

#### Sprint 9.3 — Planning tools

- Best power window.
- Daily power availability.
- Smart Daily Planner.
- Business Planning Mode.
- Calendar export.

#### Sprint 9.4 — Prediction and insights

- PowerTrack Predict.
- Prediction confidence and evidence.
- Explicit `Predicted — Not Official` labeling.
- Prediction accuracy tracking.
- Power Insights.
- Compare Saved Areas.

## 11. Friday Milestone Definition of Done

The Friday milestone is complete only when all of the following are true:

### Public application

- `/` loads successfully.
- A user can search for and select an area.
- The selected area is visible.
- Current power status is loaded from the backend.
- Current stage is visible when applicable.
- Upcoming outage or active outage return time is visible.
- Countdown updates on the client.
- Upcoming schedules are visible.
- Loading, empty, and error states exist.
- The dashboard works on desktop and mobile.

### Admin application

- `/admin/login` exists.
- Successful authentication issues a JWT.
- Invalid login is handled.
- `/admin/dashboard` is protected.
- Statistics load from the protected API.
- Unauthenticated access is rejected or redirected.

### Backend

- Express API starts.
- Location and schedule endpoints respond.
- Partial location search works.
- Status calculation uses `Africa/Johannesburg`.
- Login and JWT verification work.
- Protected admin endpoint works.
- CORS, secure headers, rate limiting, validation, and error handling are present at the milestone level.

### Validation

- Client lint passes.
- Client production build passes.
- API health and smoke checks pass.
- Active and upcoming status examples pass.
- Invalid authentication is rejected.
- No blocking errors remain.

## 12. Production Definition of Done

The project is production-ready only when, in addition to the Friday milestone:

- Neon PostgreSQL is the runtime source of truth.
- Migrations and idempotent seeds are documented and tested.
- The API is TypeScript or has an explicitly approved reason to remain JavaScript.
- The selected-area flow loads the selected zone's real status and schedules.
- Automated unit, integration, and browser tests run in CI.
- Admin schedule maintenance is available or explicitly deferred with an operational data process.
- Schedule freshness and source labeling are visible.
- Production secrets, CORS, JWT, and administrator credentials are configured securely.
- Staging and production deployments are reproducible.
- Monitoring, health checks, rollback, and incident procedures exist.

## 13. Sprint Completion Record

Every sprint should be recorded using this format:

```text
SPRINT:
Goal:
Completed:
Files/components changed:
Tests/checks performed:
Issues found:
Issues fixed:
Known limitations:
Next sprint:
```

A sprint may not be marked complete solely because files were created. Its acceptance criteria and validation checks must pass.

## 14. Change Control

Changes to this contract must state:

- What requirement is changing.
- Why the change is necessary.
- Which phase or sprint is affected.
- What acceptance criteria change.
- Whether the Friday milestone or production release is affected.

Scope additions that do not improve the core current-status and next-event experience should be deferred until the relevant post-Friday phase.

## 15. Final Success Measure

PowerTrack succeeds when a resident can open the application, identify their area, understand the current power state, see what happens next, and make a practical decision without searching through a confusing schedule document.
