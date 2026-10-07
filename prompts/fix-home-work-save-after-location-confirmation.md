# Fix Saving a Confirmed Location as Home or Work

## Goal
Let a user save a confirmed current or searched location as Home or Work without waiting for schedule/status data to load.

## Confirmed cause
In `client/app/page.tsx`, the Home/Work controls for a matched location are rendered inside the success branch that also requires a successful status response. When status is still loading or has failed, the confirmed location is selected but the save controls are absent. At mobile widths, `client/app/globals.css` also hides the text inside `.save-button`, leaving the actions identifiable only by symbols.

## In scope
- Keep Home and Work save actions visible and enabled whenever a physical location has been confirmed, independently of schedule/status loading or errors and whether a verified schedule match exists.
- Persist confirmed locations to the existing `powertrack_saved_locations` localStorage key, preserving the current one-location-per-slot behavior.
- Give immediate, accessible feedback after saving, and make the saved state apparent on the Home/Work controls and existing pinned-place list.
- Keep the button labels legible on narrow screens; preserve the existing visual system and responsive layout.
- Make the smallest changes needed in `client/app/page.tsx` and `client/app/globals.css`.

## Out of scope
- Public accounts, server-side saved places, notifications, schedule/status API changes, location matching changes, or unrelated layout redesign.
- Changing the existing Home/Work storage format unless required for the fix.

## Acceptance criteria
- After using current location or selecting an address and confirming it, the user can immediately save it as Home or Work, including while the status request is pending or has failed.
- Saving a location without a verified PowerTrack match remains supported.
- The selected slot is persisted and appears in the existing pinned-place list after reload.
- Home and Work remain distinguishable by visible text at mobile and desktop widths; saving provides clear feedback accessible to assistive technology.
- Status loading, status errors, and schedule display behavior remain unchanged.

## Validation
1. Run `npm run lint` from `client`.
2. Run `npm run build` from `client`.
3. Manual test: confirm a current location with a verified match while the status endpoint is unavailable, save as Home, then save as Work; repeat with an unmatched location. Verify the pinned-place list updates, survives reload, and labels remain visible at a narrow viewport.
