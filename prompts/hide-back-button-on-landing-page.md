# Hide Back Button on the Landing Page

## Goal
Remove the non-functional Back control from the public landing page while preserving back navigation on secondary routes.

## Confirmed cause
`client/app/components/BackButton.tsx` is rendered globally by the root layout. On `/`, it renders a disabled button when there is no prior in-app page, leaving a visible control that cannot take the user anywhere.

## In scope
- Do not render the Back control on the public landing route `/`.
- Keep current history-aware navigation and route fallbacks on admin routes and other non-root pages unchanged.
- Make the smallest possible change in the shared Back component.

## Out of scope
- Changing the route history logic, fallback destinations, page headers, or other navigation links.

## Acceptance criteria
- The public landing page has no Back control, regardless of history availability.
- Admin login, dashboard, location management, and schedule management continue to show and use Back as before.

## Validation
1. Run focused ESLint on `app/components/BackButton.tsx` from `client`.
2. Run `npm run build` from `client`.
3. Confirm `/` omits the control and a secondary route still renders it.
