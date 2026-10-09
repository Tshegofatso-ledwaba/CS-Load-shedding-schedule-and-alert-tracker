# Restore previous public status layout with integrated countdown

## Goal
Keep the public home page's previous visual layout and integrate the live countdown and next-event information into the existing Current power status card.

## Scope
- Restore the previous two-column status area: the Current power status card on the left, with the verified location, pinned places, and Up next content on the right.
- Preserve the prior card dimensions, typography, spacing, colors, and responsive behavior rather than keeping the recently enlarged/full-width status treatment.
- Move the useful countdown and next outage/return details from the separate Up next card into the existing Current power status card. Retain the current status, stage, status summary, schedule source, timezone, and freshness information.
- Remove the separate Up next card once its relevant information is integrated.
- Keep the existing save-confirmed-location, pinned-place, and upcoming-schedule functions and placement.
- Keep loading, API error, unmatched-location, and no-schedule states clear and unchanged in behavior.

## Constraints
- Make only the public home page and directly related styles changes.
- Do not change status or countdown calculations, API contracts, schedule data, or server behavior. Status and countdown targets must remain API-derived.
- Keep the message/target appropriate to the current status: expected restoration during an active outage, otherwise the next outage; show an unavailable indication when there is no schedule.
- Preserve source distinctions and `Africa/Johannesburg` display.
- Avoid unrelated refactors and dependencies.

## Acceptance criteria
- The page visually follows the previous layout and does not use the recent full-width status-first redesign.
- The status card itself includes its current status, stage, summary, next-change description, live countdown, and next-event details.
- The former standalone Up next card is absent, and no information necessary to understand the next change is lost.
- Location details, pinned places, save actions, and upcoming schedules continue to work and remain available.
- Both desktop and narrow-screen layouts remain usable in dark and light themes.

## Validation
- Run ESLint for the public page, TypeScript checking, and the production build.
- Check desktop and narrow/mobile layouts in both themes.
- Verify countdown messaging for active outage, upcoming outage/power available, and no-schedule states; confirm values still come from the API-backed status.
