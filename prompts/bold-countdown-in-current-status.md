# Bold countdown in Current power status

## Goal
Show the live countdown prominently in bold inside the existing Current power status card, without a separate Up next/event-details block.

## Scope
- Preserve the restored previous two-column page layout.
- Remove the embedded event-details presentation (schedule time range/date/source/title and standalone "Countdown" label) from the Current power status card.
- Show only the applicable live countdown as a clearly bold value directly within the Current power status card, alongside its existing current status and stage information.
- Keep the countdown target and ticking value driven by the existing API status fields and existing client clock update; do not alter status calculations.
- Keep the existing schedule/source listing, timezone, no-schedule handling, location controls, and upcoming schedule section unchanged.

## Acceptance criteria
- No separate Up next card or repeated schedule time/date/source block is displayed in the current status area.
- A user can clearly see the current status, stage, and a bold live countdown in the Current power status card.
- Outage-active countdown continues to target restoration; available/upcoming states continue to target the next outage; no-schedule shows a clear unavailable value.
- The restored desktop and responsive layouts remain intact.

## Validation
- Run client ESLint on the public page, `npx tsc --noEmit`, and the production build.
- Confirm the API-provided countdown target and timer are unchanged.
