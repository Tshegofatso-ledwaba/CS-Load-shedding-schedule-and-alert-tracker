# Improve the end-to-end admin workflow

## Goal
Make the administrator's core journey easy to follow: open the dashboard, add or choose a saved place, publish an outage for that place, and review the published schedules.

## Current observations
- The dashboard links to Locations and Schedules, but the two management pages have inconsistent navigation: Locations links to Dashboard and Schedules, while Schedules links only to Dashboard.
- Location creation starts from address search/map results and an adjacent detail form. A saved location's "Create schedule" action selects it and navigates to schedules using a query parameter; users need clear confirmation that the intended saved place was carried forward.
- The schedule form and published list share one page, but the progression from choosing a place to publishing and verifying the result is not presented as a clear guided sequence.
- Admin pages use local-storage JWT checks and API-backed data; preserve these security and loading/error behaviors.

## Scope
1. Provide consistent admin navigation between Dashboard, Locations, and Schedules on all three screens. Make the current section visually and accessibly identifiable, and retain Sign out.
2. Clarify the location-management next step: explain how a place is searched/selected and saved, provide an obvious route to schedule a saved location, and preserve filtering, selection, deletion safeguards, and error feedback.
3. Improve the location-to-schedule handoff. When an admin chooses "Create schedule" for a saved Zone/Block, visibly confirm the selected location and its hierarchy on the schedule screen and keep it selected. Avoid silently replacing a valid URL-selected zone during data refresh.
4. Organize the schedule screen as a simple sequence: select/confirm location, enter outage details, then review published schedules. Keep existing create/edit/delete operations, post-publish collapse behavior, location names in the published list, coordinate requirements for creating schedules, and schedule-linked location deletion restrictions.
5. Keep dashboard actions discoverable and consistent with the management pages; avoid duplicative navigation or unexplained dead ends.

## Constraints
- Limit changes to the admin dashboard, location management, schedule management, and their directly related styles.
- Do not alter API contracts, introduce new capabilities, or change the current server-side data sources.
- Preserve JWT enforcement, unauthenticated redirects, loading/empty/error states, confirmations, and dependency protection.
- Do not change the existing architecture or pull deferred Phase 9 features into scope.
- Follow current visual/accessibility conventions and keep the experience usable on mobile.

## Acceptance criteria
- Admins can move directly among Dashboard, Locations, and Schedules from each management screen; the current screen is identifiable.
- The location page makes it clear how to find/select and save a location, and how to start scheduling for a saved one.
- Starting a schedule from a saved place carries the requested Zone/Block into the form; its name and hierarchy are apparent before publishing.
- A valid requested zone remains selected after schedules/zones refresh unless it no longer exists.
- The schedule workflow makes place selection, outage entry, and published-schedule review easy to follow without breaking current CRUD behavior.
- Authentication, API errors, loading/empty states, responsive layout, and existing location deletion safeguards remain intact.

## Validation
- Run ESLint, TypeScript checking, and the client production build.
- Run the targeted admin-location and schedule-admin server tests to preserve current API behavior.
- Manually test: Dashboard → Locations → create/save a place → create schedule for that place → publish → verify the named published entry → return to Locations and Dashboard; also test direct schedule-page entry, invalid/deleted zone query parameters, mobile layout, and signed-out access.
