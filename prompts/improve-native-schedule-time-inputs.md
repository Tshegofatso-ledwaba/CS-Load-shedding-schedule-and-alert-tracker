# Improve native schedule time inputs

## Goal
Keep browser-native time selection for outage schedules, but make the Start time and End time controls clearer, consistent with the schedule card, and usable in both app themes.

## Current behavior
- Schedule times use native `<input type="time">` controls with browser-default picker presentation and generic admin input styling.
- Schedule API values use `HH:MM`; keep this data shape and the server-side validation unchanged.

## Scope
- Apply focused styling to the two schedule time inputs (not every time or date input in the application): consistent sizing, spacing, background, foreground, border, focus-visible state, and a clear clickable picker indicator where supported.
- Preserve native browser picker behavior, keyboard entry, required validation, and `HH:MM` values.
- Ensure the controls render legibly with the app's existing light and dark themes, using the correct native control color scheme for each theme.
- Keep Start/End controls clearly labelled and side-by-side on wider screens, stacking neatly on narrow screens.
- Do not change schedule date, stage, source, validation, or API behavior.

## Constraints
- Only adjust the admin schedule page and directly related CSS.
- Do not replace native time inputs with a custom picker or add dependencies.
- Native popup internals are browser-controlled; style the input itself without claiming to restyle inaccessible native popup UI.

## Validation
- Run client ESLint, TypeScript check, and production build.
- Manually check both theme modes and narrow/wide layouts; verify selecting and keyboard-entering a time still submits `HH:MM`.
