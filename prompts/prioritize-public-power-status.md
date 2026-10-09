# Prioritize public power availability status

## Goal
After a public user selects and confirms a preferred location, make the current power state—power available or outage active—the first and clearest result.

## Current behavior
- `client/app/page.tsx` renders location save controls before status/loading/error and the current status card.
- The current state is large within a two-column layout, but the next-change countdown is in a separate secondary card and can be visually overshadowed by other location panels.
- Status and outage data come from the API and must remain server-calculated. The client already refreshes status and schedules from the selected Zone/Block.

## Scope
1. Reorder the public page so the status/loading/error result follows location confirmation immediately and appears before optional save/pin controls and schedule browsing.
2. Make the current state unmistakable with clear text for “Power available” / “Outage active”, an accessible non-color-only status treatment, and a prominent status-specific background/label.
3. Bring the most relevant next change and live countdown into the primary status section: when an outage is active, emphasize expected restoration; when power is available, emphasize the next outage start. Preserve current API-derived stage, schedule source, timezone, and freshness details.
4. Keep `NO_SCHEDULE`, no verified Zone/Block match, loading, and API error outcomes clear and distinct. Do not display a stale previous location's status while a new selection loads.
5. Move location-save/pinned-place actions and upcoming schedules to secondary visual priority without removing their functionality. Keep responsive behavior and reduced-motion/accessibility conventions.

## Constraints
- Limit changes to the public home page and its directly related styles.
- Do not compute or infer power status client-side, change server contracts, or hard-code dashboard/schedule results.
- Preserve public location selection, Home/Work saving, API refresh behavior, official/external/predicted source distinctions, and existing disclaimers.
- Avoid unrelated refactoring or added dependencies.

## Acceptance criteria
- Immediately after confirming a supported location, current status is the first result users encounter; loading/error/missing-schedule states are clear while data is unavailable.
- Power availability versus active outage is obvious from both text and visual treatment, including to users who do not distinguish colors.
- During an outage, return-time/countdown is the primary next event; when power is available, next outage/countdown is primary.
- Changing locations never briefly shows the prior location's status as if it belonged to the newly selected location.
- Location-saving controls, pinned locations, upcoming schedules, source labels, and freshness text remain available and responsive.

## Validation
- Run client ESLint for the public page, TypeScript checking, and production build.
- Manually select an area with power available and one with an active/next outage; verify status, countdown target, source, loading, empty schedule, and error states.
- Check both themes and narrow/mobile layout; verify screen-reader text/labels and reduced-motion behavior.
