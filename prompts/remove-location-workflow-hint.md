# Remove location workflow helper text

## Goal
Remove the extra instructional sentence from the admin Locations page because it disrupts the layout.

## Scope
- Remove only the paragraph that says: “Search for a South African place, select a result to confirm its location details, then save it. Use ‘Create schedule’ on a saved place to publish an outage for that location.”
- Keep location search, selection, saving, scheduling actions, navigation, and all other page content unchanged.
- Remove any CSS that becomes unused solely because this paragraph is removed, if applicable.

## Validation
- Run ESLint and TypeScript checks for the client.
