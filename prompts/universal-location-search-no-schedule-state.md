# Universal location search + no-schedule state

## Objective

Implement the PowerTrack two-stage location model so a real South African place can be discovered independently from whether PowerTrack has an outage schedule for it. The user may find a valid geographic place via the geocoder, then PowerTrack resolves whether the place matches a managed zone/block and whether schedule data exists for it.

## Product requirements

- Public search can discover real South African locations without an admin-created PowerTrack record.
- Search results may point to locations with no schedule, and the UI must say so explicitly.
- The no-schedule state must be treated as a first-class status, not as `POWER_AVAILABLE`.
- When a matching PowerTrack location exists but no schedule exists, show a clear message such as: "No outage schedule available" / "PowerTrack doesn't currently have schedule data for this location."
- When a geocoder lookup fails, show a location-not-found state.
- When a schedule exists, the app continues to show current status, next outage, countdown, and upcoming schedule.
- Admin functionality must remain intact and cannot be blocked by this change.

## Expected behavior

### Status model

Implement the following state logic:

- `NO_SCHEDULE` when no matching PowerTrack schedule exists for the resolved zone/block.
- `OUTAGE_ACTIVE` when the current South African time is inside a scheduled outage window.
- `UPCOMING_OUTAGE` when a future outage exists but the current time is not inside an outage window.
- `POWER_AVAILABLE` when a zone/block exists and there are schedules, but the current time is outside all outage windows and no future outage is scheduled.

### UI states

- Selected location + schedule available
- Selected location + no schedule available
- Location not found
- Search/loading states
- API failure states

## Constraints

- No fake outage calculation from nearby areas.
- No automatic creation of schedules when a location is not managed by PowerTrack.
- Do not treat missing schedule data as power available.
- Keep the backend business logic server-side, not in the browser.
- Preserve the admin login, location management, and schedule management flows.
- Use the current Africa/Johannesburg timezone for all schedule logic.

## Validation

- Status tests cover `NO_SCHEDULE` and the boundary transitions around current outages.
- Search flow renders a friendly no-schedule message for a real location with no managed schedule.
- Existing admin tests continue to pass.
