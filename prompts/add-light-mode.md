# Add Light Mode

## Goal
Add an accessible light/dark theme toggle to the PowerTrack client, covering the public status experience and all admin routes without changing application behavior or API contracts.

## Repository context
- Client is Next.js 16 App Router with React and TypeScript.
- Global styles and most visual tokens live in `client/app/globals.css`.
- `client/app/layout.tsx` wraps every route; public and admin pages currently render their own topbar markup.
- The existing dark palette is the current product visual system and must remain the default for users without a saved preference.
- CSS contains hard-coded dark colors in addition to root variables, so tokenizing the shared palette alone may leave controls or panels unreadable in light mode.

## Requirements
1. Provide a reusable theme toggle in the header on the public page and every admin page. Use a semantic button with an accessible name that states the action, keyboard operation, visible focus, and a familiar sun/moon icon or equivalent text/icon treatment.
2. Support both light and dark themes across all client routes, including forms, dialogs, status cards, location picker, schedule items, admin surfaces, and interactive states. Do not alter MapLibre tile styling.
3. Preserve the current dark appearance as the default when no preference has been saved. Persist the user's explicit selection in `localStorage` and restore it on subsequent visits.
4. Avoid a flash of the wrong theme during initial load and avoid hydration warnings. Keep theme initialization SSR-safe; do not read browser storage during server rendering.
5. Implement theme colors through a small, coherent set of CSS custom properties and theme-scoped overrides. Replace or override existing hard-coded dark-only colors where required, without unrelated restyling.
6. Maintain readable contrast, clear focus/hover/disabled states, and status distinctions that do not rely on color alone. Honor `prefers-reduced-motion` for any theme transition.
7. Do not add dependencies, change API behavior, or expand into unrelated UI work.

## Acceptance criteria
- The toggle works on the public page, admin login, dashboard, locations, and schedules pages.
- Selecting light or dark updates the complete application surface immediately and survives a reload and route navigation.
- A clean browser with no saved preference still shows the existing dark theme.
- Theme initialization does not produce hydration errors or a visible incorrect-theme flash.
- Both themes remain usable at mobile and desktop widths; form controls, dialog, map surroundings, and focus indicators remain legible.
- Existing application behavior and map rendering are unchanged.

## Verification
- Run the client lint command (`npm run lint`) and production build (`npm run build`) from `client/`.
- Manually test theme switching and persistence on `/`, `/admin/login`, `/admin/dashboard`, `/admin/locations`, and `/admin/schedules`, including a reload and a narrow viewport.
- Check browser console for hydration errors and inspect keyboard focus and contrast in both themes.
