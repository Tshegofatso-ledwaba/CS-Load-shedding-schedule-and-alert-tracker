# Refresh the Power Status Card

## Goal
Make the “Power available” status card feel more compact and less empty, with a clear, restrained color accent that makes the current state easier to scan.

## Confirmed cause
The public status card in `client/app/page.tsx` is styled by `.status-card` in `client/app/globals.css`. Its `min-height` and `justify-content: space-between` spread its two content groups apart, while the dark, low-contrast background leaves the open area visually plain. The mobile rule sets another large minimum height.

## In scope
- Refine only the public status card layout and styling, and make the smallest JSX adjustment needed for a visual accent.
- Reduce excess vertical space on desktop and mobile without clipping or crowding the status, stage, next-change, timezone, or schedule-source details.
- Add a compact decorative color treatment that reflects the existing `POWER_AVAILABLE` versus `OUTAGE_ACTIVE` state. Keep its meaning apparent through the existing text and status dot, not color alone.
- Respect the current palette and `prefers-reduced-motion`; avoid adding packages or changing status/API behavior.

## Out of scope
- Changing status calculations, API data, location selection, schedule content, or other cards.
- Adding new product features, fake readings, or prominent decorative artwork.

## Acceptance criteria
- The status card no longer has a large visually empty area at desktop or mobile widths.
- A small, polished color accent makes the current status area feel intentional while retaining readable contrast.
- Available and active-outage states remain distinguishable with their existing labels and details; layout remains responsive and content is not clipped.
- No unrelated files or behaviors are changed.

## Validation
1. Run `npm run lint` from `client`.
2. Run `npm run build` from `client`.
3. Inspect the card at desktop and mobile widths, in both available and active-outage states if practical.