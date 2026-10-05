# Add admin schedule management entry point

## Goal
Add a clear, visible schedule-management option on the admin dashboard so administrators can find where outage scheduling lives without guessing.

## Current state
The admin dashboard at `client/app/admin/dashboard/page.tsx` shows only a stats summary and recent schedule updates. There is no obvious action or navigation for managing outage windows or schedule entries.

## In scope
- Add a prominent admin action/button on the dashboard for schedule management.
- Use the existing PowerTrack styling and navigation patterns.
- Keep the change small and focused on discoverability.
- If the full CRUD workflow is not implemented yet, surface a clear placeholder page or route that explains the next step without breaking the dashboard flow.

## Proposed UX
- On the admin dashboard, add a button or card like “Manage schedules” or “Outage schedule” near the stats area.
- Clicking it routes to a simple admin schedule page (for example `/admin/schedules`).
- The page can show the current schedule list and a minimal CTA like “Add outage window” or “Schedule maintenance” if backend CRUD is not available yet.
- Ensure the page is protected by the same JWT check used by the dashboard.

## Constraints
- No unrelated refactors.
- Do not add a public user-account flow.
- Keep the change consistent with the project’s dark green design language and admin access experience.
- Respect the project milestone note that admin schedule CRUD is deferred to a later phase; do not overbuild beyond a small management entry point.

## Acceptance criteria
- The admin dashboard displays a schedule-management action.
- The action is visible and accessible from the authenticated admin view.
- Clicking it opens an admin screen for schedule management or a clear placeholder state.
- The route remains protected and consistent with the current admin pattern.

## Validation
1. Open the admin dashboard while signed in.
2. Confirm the schedule-management option is visible.
3. Click it and verify the route loads without breaking auth.
4. Confirm layout and styling match the existing admin interface.
