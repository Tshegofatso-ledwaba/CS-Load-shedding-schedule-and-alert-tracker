# Improve admin location deletion and schedule publishing flow

## Goal
Make it easier for administrators to remove a mistakenly added place and to see where an outage was published, while keeping schedule creation focused and easy to return to.

## Current behavior
- The admin locations screen (`client/app/admin/locations/page.tsx`) has a delete action only in the detail panel after selecting a saved location. The saved-location rows themselves have no delete option.
- The protected `DELETE /api/admin/locations/:id` endpoint and `deleteZoneBlock` service already exist. Deletion is rejected when schedules are attached to that Zone/Block; preserve that safeguard and surface its error to the administrator.
- The schedule screen (`client/app/admin/schedules/page.tsx`) keeps the create-outage form permanently expanded. After a successful create it clears the fields and refreshes schedules, but does not move focus to the published list.
- Published schedule records include `zoneBlockId`, and the screen already loads the available zones, but each published row currently shows only date, time, stage, and source.

## Scope
1. Add a clear, accessible delete action to each saved-location row so an administrator can remove a mistakenly created Zone/Block without first opening its detail panel. Reuse the existing authenticated delete handler/API behavior where practical; retain a confirmation naming the place and refresh the list after successful deletion. If the deleted location was selected, clear the selected/editing location state. Keep the existing schedule-dependency protection and display its failure message.
2. Make the create-outage card collapsible. Keep it open by default (including when editing). After a new outage is successfully created and the schedule refresh succeeds, collapse the form and bring the Published schedules card into view. Provide an accessible way to reopen the form for another outage. Do not collapse it on validation, request, or refresh errors; edits should remain usable.
3. Show the associated place name and its geographic hierarchy on every Published schedules entry, using the already-loaded zone/location data keyed by `zoneBlockId`. Keep the existing date/time, stage, source, edit, and delete controls. If a schedule refers to a location that is not in the loaded zone list, show a clear fallback rather than rendering an empty name.

## Constraints
- Keep this scoped to the admin location and schedule-management screens; do not add public location deletion or schedule CRUD capabilities beyond the existing admin screen.
- Preserve authentication, schedule-linked location deletion restrictions, and current API-driven schedule data.
- Do not weaken error handling or represent a failed operation as successful.
- Follow existing styling, accessible semantic controls, and project conventions. Avoid unrelated refactors or dependency changes.

## Acceptance criteria
- Each saved Zone/Block row has an obvious delete control with a confirmation identifying the place.
- Successful deletion removes the location from the list and clears stale selection when applicable; a location with attached schedules remains protected and its error is visible.
- The outage creation card can be collapsed and reopened accessibly. It collapses only after a successful new outage publication and refreshed schedule list, then the published list is brought into view.
- Existing edit flows remain expanded and work as before.
- Each published schedule visibly identifies its place (and hierarchy where available) alongside its schedule details and existing actions.
- Empty, loading, auth, and error behavior is preserved.

## Validation
- Run the relevant client lint/build or type-check available in the repository.
- Run `server/test/admin-locations.test.js` and `server/test/schedule-admin.test.js` to preserve the delete protection and schedule behavior.
- Manually verify: delete a location without schedules; attempt to delete one with a schedule; publish a new outage and confirm the form collapses and the matching named location appears in Published schedules; reopen the form; edit an existing outage and confirm the form remains expanded.
