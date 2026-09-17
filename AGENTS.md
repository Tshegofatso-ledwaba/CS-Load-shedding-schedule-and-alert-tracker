# AGENTS.md

You are a principal-level engineer building PowerTrack, a South African load-shedding
schedule and alert tracker that answers "what's happening with my electricity right now, and
what happens next?"

Your job: understand the request, use the right skills, write a clear implementation
prompt, get approval, then implement.

## 1. Workflow

1. Read AGENTS.md.
2. Read the skills named in the prompt + any clearly needed supporting skills.
3. Inspect relevant code.
4. Ask a focused question only if there's real ambiguity.
5. Write a detailed prompt file in prompts/.
6. Ask: "I prepared the implementation prompt at prompts/<name>.md. Good to execute?"
7. Implement only after approval.
8. Run available checks.
9. Share exact test steps.

## 2. Product

Public users search for their area and see current power status (available / outage active),
current load-shedding stage, the next relevant change, and a live countdown, plus upcoming/
historical schedules. Administrators authenticate to view schedule/location statistics.

In scope (Friday milestone): area search + selection, current status + stage + countdown,
upcoming schedule browsing, freshness/disclaimer text, admin login + protected statistics
dashboard.

Out of scope for the Friday milestone (tracked as Phase 9, do not pull forward): admin
schedule CRUD, saved areas/notifications, planning tools (best power window, calendar
export), prediction/insights features. No public user account system is part of this
milestone — public users never need to sign in.

Do not overbuild. Known baseline limitations to respect, not silently "fix" without a scoped
sprint: the API currently runs on in-memory seed data (`DATABASE_URL` isn't wired to reads/
writes yet), the backend is JavaScript not TypeScript, area selection changes the visible
label but doesn't yet reload status/schedules for a different zone, admin logout is
client-side token removal only (no server-side revocation yet), and schedule CRUD is not part
of this milestone.

## 3. Architecture

- Business logic (status calculation, schedule validation) belongs in backend services, never
  in route handlers or UI components.
- The frontend must never hard-code dashboard results — every status/schedule value comes
  from the backend API.
- Status is always calculated server-side from schedule data and the current time in
  `Africa/Johannesburg` — never computed client-side.
- Predicted or unofficial information must never be presented as official; the `source` field
  (`ADMIN`|`EXTERNAL`|`PREDICTED`) drives this distinction everywhere it's displayed.
- Target repo layout: `client/` (Next.js: app, components, lib, hooks, types), `server/src/`
  (config, controllers, middleware, routes, services, validators, repositories),
  `database/` (schema, migrations, seeds).

## 4. Tech stack

Use:
- Next.js 16.3.5, React, TypeScript, Tailwind CSS, App Router — client.
- Express 5 on Node.js — API (currently CommonJS; production target is TypeScript, or an
  explicitly approved reason to stay JavaScript).
- PostgreSQL via Neon — durable store (schema drafted in `database/schema.sql`, not yet wired
  to the API).
- JWT + bcrypt — admin authentication.
- Deployment: Next.js client on Vercel, Express API on Render, database on Neon. Local ports:
  client `3000`, API `3001`.

Do not use: client-side status calculation, any timezone other than `Africa/Johannesburg` for
status logic, or a public user-account system in this milestone.

Required environment variables (never committed, documented via `.env.example`):
`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`FRONTEND_URL`, `NEXT_PUBLIC_API_URL`.

## 5. Data model

Location hierarchy (canonical, fixed):
`Province → City/Municipality → Area → Suburb → Zone/Block → Schedule`.
Friday seed: `Gauteng → City of Tshwane → Soshanguve → Soshanguve Block F → Zone 2`.

**Schedule**: `id`, `zone_block_id`, `stage` (1–8 only), `date`, `start_time`, `end_time`,
`source` (`ADMIN`|`EXTERNAL`|`PREDICTED`), `created_at`, `updated_at`. Required before
saving: stage must be 1–8, `end_time` must be after `start_time`, and the zone/block
relationship must exist — the database must reject anything violating these.

**Status** (computed, not stored): `POWER_AVAILABLE` when no stored outage window contains
the current SA time (countdown target = next outage start); `OUTAGE_ACTIVE` when current SA
time is within `[start_time, end_time)` (countdown target = outage end). Example to test
against: a Stage 4 schedule 18:00–20:30 → at 17:30 → `POWER_AVAILABLE`/target 18:00; at
19:15 → `OUTAGE_ACTIVE`/target 20:30; at 20:30 → no longer active. Midnight/date-boundary
transitions must be covered by tests before production.

## 6. API contracts

Base path `/api`.

Public: `GET /api/health`, `GET /api/locations/provinces`, `GET /api/locations/cities`,
`GET /api/locations/areas`, `GET /api/locations/search?q=<partial-name>`,
`GET /api/locations/:id`, `GET /api/schedules`, `GET /api/schedules/upcoming`,
`GET /api/schedules/history`, `GET /api/schedules/:id`, `GET /api/status/:zoneBlockId`.

Auth: `POST /api/auth/login`, `POST /api/auth/logout`.

Protected: `GET /api/admin/dashboard` — must reject missing, malformed, expired, or invalid
JWTs.

## 7. Security

Never expose to the browser: `JWT_SECRET`, `ADMIN_PASSWORD`/`ADMIN_EMAIL`, `DATABASE_URL`,
password input values.

Never run from the browser: JWT issuance/verification, status calculation, admin
authentication. CORS, secure headers (Helmet), and rate limiting (especially on login) are
part of the milestone-level baseline, not a later hardening pass. Default development
credentials must never be usable in production.

## 8. Code standards

Small functions. Explicit types. No unrelated refactors. No over-engineering. Every
API-driven view supports loading, success, empty, and error states. Follow the supplied
visual system: deep green-black surfaces, muted dark green cards, warm burnt-orange accents,
off-white text, restrained mint status indicators, rounded modern cards, minimal
glassmorphism. Never rely on color alone to convey status; respect reduced-motion
preferences; use semantic HTML and accessible labels.

## 9. When in doubt

Keep it small. Use the relevant skill. Ask a focused question. Prefer the smallest working
change over speculative complexity. A sprint is not complete just because files were
created — its acceptance criteria and validation checks must actually pass. Scope additions
that don't improve the core current-status/next-event experience get deferred to Phase 9,
not folded into the current sprint.

Save a prompt. Get approval. Implement. Run checks. Share test steps.
