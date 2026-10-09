# Restore location hierarchy form layout

## Goal
Restore the original five-input location form while keeping geocoder autofill for all hierarchy values except Zone/Block.

## Scope
- Remove the read-only hierarchy summary and missing-hierarchy helper messages added to the admin location form.
- Render the original Province, City / Municipality, Area, Suburb, and Zone / Block inputs in the existing card layout.
- When selecting a search/map result, prefill Province, City / Municipality, Area, and Suburb from the result, leaving Zone / Block blank for the administrator.
- Keep all five fields editable as in the original form.
- Preserve existing selection, editing, save, and error-handling behavior. Do not change the surrounding card or page UI.

## Validation
- Run ESLint and TypeScript checks for the admin locations page.
