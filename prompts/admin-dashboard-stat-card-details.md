# Make Admin Dashboard Metric Cards Interactive

## Goal
Make the Areas, Zones, Schedules, and Upcoming metric cards on the admin dashboard reveal useful, real information when clicked.

## Confirmed cause
The metric cards in `client/app/admin/dashboard/page.tsx` are currently non-interactive `<div>` elements that render only a label and count. The authenticated endpoints `/api/admin/locations` and `/api/admin/schedules` already provide the underlying admin records; `/api/admin/dashboard` only provides aggregate counts and recent schedule updates.

## Proposed behavior
- Make each metric card a semantic, keyboard-accessible button while preserving its existing visual treatment and displayed count.
- Clicking a card opens an accessible detail dialog or equivalent clearly associated detail panel, with a title matching the selected metric and records relevant to that metric.
- Areas and Zones details come from authenticated admin location data. Schedules shows schedule records. Upcoming shows only upcoming schedule records, using the project's `Africa/Johannesburg` time convention for any date/time comparison; prefer a server-provided upcoming result if available rather than duplicating status logic in the browser.
- Include useful location hierarchy and schedule fields where relevant, including date, start/end time, stage, and source. Provide a clear close action and close on Escape; keep focus behavior accessible.
- Represent loading, empty, and request-error states. Reuse existing auth handling and never display fabricated records or counts.
- Keep the change limited to the admin dashboard and any narrowly necessary API support. Follow existing PowerTrack styles and avoid unrelated dashboard redesign.

## Out of scope
- Changing schedule or location CRUD behavior.
- Adding dashboard analytics, charts, or new persistent data.
- Changing public status calculations or adding unrelated API contracts.

## Acceptance criteria
- Each of the four metric cards responds to pointer and keyboard activation.
- The selected card's details are relevant and backed by API data; predicted/external schedules retain their source labels.
- Upcoming details exclude past schedules using South African local schedule time.
- The detail view has accessible title/semantics, close behavior, and loading, success, empty, and error states.
- Existing summary counts and recent updates remain intact, and dashboard lint/build checks pass.

## Validation
1. Run `npm run lint` from `client`.
2. Run `npm run build` from `client`.
3. With the API running, sign into the admin dashboard and click each metric card. Confirm the content matches the records, Upcoming contains no past schedule, and keyboard activation/Escape closing work.
