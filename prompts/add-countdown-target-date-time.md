# Add countdown target date and time

## Goal
Show the date and time of the event the bold countdown is counting toward, inside the existing Current power status card, without making the card cluttered.

## Scope
- Preserve the current two-column layout and bold live countdown.
- Directly beneath the countdown, add a compact, muted target date/time (for example, `Sat, 10 Oct · 18:02`).
- Format the timestamp using `Africa/Johannesburg`.
- Use the existing API-provided `countdownTarget`: it represents expected restoration during an active outage and the next outage start when power is available/upcoming.
- When status is `NO_SCHEDULE` or no target exists, do not display a misleading date/time; retain the current unavailable countdown treatment.
- Keep location, stage, source, timezone, schedules, and other UI behavior unchanged.

## Constraints
- No client-side status calculations or derived target times. Only format the API target for display.
- Keep date/time visually secondary to, and not competing with, the bold countdown. Preserve responsive and light/dark theme styling.
- Limit changes to `client/app/page.tsx` and its related CSS.

## Acceptance criteria
- The Current power status card shows current status, stage, bold live countdown, and the date/time that countdown targets.
- Active outages show the restoration target's date/time; available/upcoming statuses show the next outage's date/time.
- The target date and time are correct for South Africa and are omitted when unavailable.
- The previous layout remains intact and readable on narrow screens.

## Validation
- Run public page ESLint, TypeScript checking, and the production build.
- Verify formatting uses the API countdown target and explicitly sets `Africa/Johannesburg`.
