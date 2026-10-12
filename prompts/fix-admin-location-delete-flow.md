# Fix admin location delete flow

## Goal
Make the PowerTrack location Delete actions reliably remove eligible Zone/Block records and clearly explain when deletion is blocked because schedules depend on the location.

## Confirmed behavior and constraint
- Admin locations are deleted through `DELETE /api/admin/locations/:id`.
- A Zone/Block with attached schedules must not be deleted; preserve this safeguard and return a clear conflict message.
- The location list and selected-location panel both provide Delete actions.

## Scope
- Trace and correct any mismatch among the client delete request, API response, and database delete service that prevents deletion of an eligible Zone/Block.
- Ensure success clears a matching selected/editing location and refreshes the list; ensure failures remain visible with the API's explanation.
- Add integration coverage for successful deletion of a location without schedules and the existing refusal to delete one with schedules.
- Preserve authentication and other CRUD behavior.

## Constraints
- Do not cascade-delete schedules or otherwise delete any schedule records as part of deleting a location.
- Do not weaken referential integrity or the existing dependency check.
- Keep edits focused on the admin location UI, delete endpoint/service as needed, and related tests.

## Acceptance criteria
- An authenticated admin can delete a Zone/Block without schedules, and the list no longer shows it after refresh.
- The UI clears selected/edit state if the deleted location was selected.
- Attempting to delete a Zone/Block with schedules leaves both records intact and displays a useful message.
- Unauthorized and missing-location behavior remains correct.

## Validation
- Run the admin-location integration test and relevant client lint/type/build checks.
- Verify successful delete and schedule-protected delete behavior.
