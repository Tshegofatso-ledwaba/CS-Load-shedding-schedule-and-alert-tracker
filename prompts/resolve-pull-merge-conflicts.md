# Resolve pull merge conflicts

## Goal
Resolve the three outstanding conflicts from `git pull origin dev` without discarding either branch's valid work or changing unrelated merged files.

## Scope
- Resolve `prompts/show-place-names-in-recent-schedule-updates.md` into one coherent feature prompt that retains the useful requirements from both sides: human-readable Zone/Block names, official-name preference, parent location context, consistent in-memory/database response shape, explicit fallback for unresolved locations, and preservation of order, limits, stats, authentication, and error behavior.
- In `server/src/index.js`, prefer a non-empty `officialName` for the in-memory Zone/Block display name and fall back to `name`, then `null`.
- In `server/test/schedule-admin.test.js`, preserve general response-shape assertions and retain the more specific mode-aware checks: verify the created schedule and expected Zone/Block/hierarchy in seed mode, and verify named location fields in database mode.
- Remove all conflict markers and ensure these files are syntactically valid.

## Constraints
- Do not discard already staged, non-conflicting changes or edit unrelated files.
- Do not modify schedule CRUD, public endpoints, status logic, or other behavior.
- Do not use destructive Git commands, create a commit, or complete the merge commit.
- Keep the resolution focused on the three reported files.

## Acceptance criteria
- No unresolved conflict markers remain in the three files.
- The server uses `officialName || name || null` semantics for the in-memory dashboard's location name.
- Tests verify the recent-update location data for both supported storage modes.
- Existing staged work remains intact and the merge stays uncommitted.

## Validation
- Run the focused `server/test/schedule-admin.test.js` test.
- Check the diff and Git status to confirm only the intended conflict resolutions changed and no unresolved paths remain.
