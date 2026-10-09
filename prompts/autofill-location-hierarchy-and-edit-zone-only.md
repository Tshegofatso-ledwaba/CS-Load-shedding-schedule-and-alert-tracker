# Autofill location hierarchy and edit Zone/Block only

## Goal
After an administrator selects a South African place from search results, show its detected location hierarchy and let the administrator edit only the Zone/Block name before saving.

## Current behavior
- `chooseFeature` in `client/app/admin/locations/page.tsx` copies geocoder province, city/municipality, area, and suburb into the form, but every hierarchy input remains editable.
- The Zone/Block value from geocoder data is usually empty, and the administrator must enter it.
- Nominatim fields may be absent for some results; do not invent geography or silently use unrelated defaults.

## Scope
1. On selecting a search/map result, retain the result’s available hierarchy values and display Province, City/Municipality, Area, and Suburb as read-only values. Make Zone/Block the only editable hierarchy field for creating a new location.
2. Keep the Zone/Block field clearly labelled and focused/usable; initialize it from `address.zoneBlock` when present, otherwise leave it ready for administrator entry.
3. Make the selected place’s coordinates and name remain visible as today, and submit the detected hierarchy plus entered Zone/Block through the existing location API payload shape.
4. If required hierarchy parts are absent from the selected result, do not fabricate them. Show the missing values clearly and prevent a save that would create an invalid hierarchy, with actionable feedback to choose a more specific result.
5. Preserve the existing saved-location edit flow: selecting an already saved location must continue to allow its hierarchy to be edited as currently intended. Existing-location editing with a selected map feature must keep targeting that location.
6. Keep required/validation/error behavior and mobile layout accessible.

## Constraints
- Do not change API contracts, data schema, geocoder behavior, or add hierarchy lookup services.
- Avoid changes outside the admin location page and directly related styles.
- Do not show saved-location users blank editable province/city/area/suburb inputs when those remain in ordinary edit mode.

## Acceptance criteria
- Selecting a search result populates and displays the known Province, City/Municipality, Area, and Suburb without allowing accidental edits during create flow.
- Zone/Block is the only editable hierarchy field during new-place creation.
- The saved payload contains all detected hierarchy values and the entered Zone/Block.
- Missing geocoder hierarchy is visible and prevents invalid submission without fabricated values.
- Editing an existing saved location continues to work as before.

## Validation
- Run client ESLint and TypeScript checks; build if practical.
- Manually select a complete result and confirm four read-only hierarchy fields plus editable Zone/Block, then save.
- Select a result with an incomplete hierarchy and confirm saving is blocked with useful feedback.
- Select and edit a saved location, including applying a map result, and verify that the existing editing behavior remains intact.
