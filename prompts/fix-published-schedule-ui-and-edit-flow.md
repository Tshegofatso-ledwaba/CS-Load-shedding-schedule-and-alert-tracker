# Fix published schedule presentation and edit flow

## Goal
Make the Published schedules list readable and make its Edit action reliably open a usable edit form.

## Current state
- Published schedule rows in `client/app/admin/schedules/page.tsx` use the generic `.admin-row` flex layout while mixing location, schedule metadata, and controls in a single inline span. The resulting hierarchy and alignment are unclear.
- Clicking Edit sets the form values and expands the outage form, but does not bring the form into view. The save button is disabled whenever the selected zone has no coordinates, even when editing an existing schedule (coordinates are not required to edit the schedule).
- Schedule creation still requires a saved zone with coordinates; preserve that behavior for new outages.

## Scope
1. Restructure each published schedule row into clear semantic groups: place and geographic hierarchy; date/time and stage/source; and edit/delete actions. Add focused styles for the published list rather than broad changes to generic admin rows. Ensure actions stay aligned and the layout adapts cleanly to narrow screens.
2. On Edit, populate the selected zone, date, times, stage, and source, expand the form, and scroll/focus the edit form into view so the action has an obvious result.
3. Permit saving an existing schedule even when that zone has no coordinates. Keep the coordinate-based restriction for creating a new outage. Preserve the existing API validation and error messages.
4. Make cancel/complete behavior unambiguous: cancelling returns to create mode without discarding other functionality; successful update reloads the published rows and exits edit mode.

## Constraints
- Keep changes limited to the admin schedules UI and its styles.
- Do not change API contracts or add schedule capabilities.
- Preserve existing schedule data, API-driven place labels, publication collapse behavior, accessibility, and delete controls.
- Avoid unrelated refactors or modifications to the pre-existing worktree changes.

## Acceptance criteria
- Published rows display place, hierarchy, date, time, stage, and source as legible separate content, with consistently positioned Edit/Delete controls on desktop and mobile.
- Clicking Edit opens the populated form and brings it into view.
- Editing and saving works for schedules attached to locations without coordinates; creating new schedules for such locations remains disabled.
- Cancel edit and successful update return to normal create mode and refresh the published list.
- Client lint, type-check, and production build pass.

## Validation
1. Run ESLint for the affected client files, TypeScript checking, and the client production build.
2. Manually inspect Published schedules at desktop and mobile widths.
3. Click Edit and verify the populated form is brought into view, then save and cancel an edit.
4. Verify a coordinate-less zone still cannot be used to create a new outage, but an existing outage for that zone can be edited.
