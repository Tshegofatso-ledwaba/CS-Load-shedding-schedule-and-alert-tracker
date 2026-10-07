# Add Back Navigation to All Pages

## Goal
Give users a clear, consistent way to return to the previous view from every public and admin page.

## Current behavior
The app has a public dashboard at `/` and admin routes at `/admin/login`, `/admin/dashboard`, `/admin/locations`, and `/admin/schedules`. Header navigation is duplicated per page. Locations and schedules can link to the admin dashboard, login links to the public dashboard, but the admin dashboard has no contextual back action and navigation behavior is inconsistent.

## In scope
- Add a reusable, accessible Back button to the header on every app route: public dashboard, admin login, admin dashboard, admin locations, and admin schedules.
- Use in-app/browser history when it leads back to the previous app view.
- Handle direct URL entry or unavailable history with sensible route fallbacks: locations and schedules to admin dashboard; admin dashboard and login to the public dashboard. On the public dashboard, use browser back when available and avoid a confusing self-navigation fallback.
- Keep existing navigation links, authentication redirects, and sign-out controls working.
- Match the existing PowerTrack header and button styling; ensure the button remains visible and usable on mobile.
- Keep the change focused on frontend navigation. Do not alter route protection or add routes.

## Out of scope
- Redesigning page headers or refactoring unrelated admin navigation.
- Changing authentication, page content, or data loading behavior.

## Acceptance criteria
- Every listed route visibly provides a Back control in its header.
- From in-app navigation, Back returns to the actual previous app page where possible.
- Directly opened pages have the defined parent-page fallback and do not navigate to an unrelated external site.
- The public dashboard's Back control does not loop to itself when there is no usable history.
- Existing header links, sign-out behavior, and protected-route behavior remain unchanged.
- Controls have an accessible name and remain usable at narrow viewport widths.

## Validation
1. Run `npm run lint` from `client` and inspect any warnings on changed files.
2. Run `npm run build` from `client`.
3. Manual test each route: navigate between dashboard, locations, and schedules and use Back; open each route directly in a fresh tab and verify its fallback; verify the public dashboard and login can return to `/` and mobile headers do not overlap.
