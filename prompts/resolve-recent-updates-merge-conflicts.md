# Resolve recent-updates merge conflicts

## Goal
Resolve the two conflicts from the latest `git pull origin dev` while preserving valid work from both sides.

## Scope
- Merge the conflicting portions of `prompts/show-place-names-in-recent-schedule-updates.md` into a single coherent prompt, retaining the API scope, official-name preference, location hierarchy, consistent data-mode response shape, explicit fallback, narrow-screen readability, and focused validation.
- Resolve `server/test/schedule-admin.test.js` by keeping the non-empty recent-updates assertion and the mode-specific assertions for seed and database-backed results.
- Remove all conflict markers in these two files only.

## Constraints
- Do not change implementation behavior outside the test assertions.
- Do not alter other files or discard any existing staged changes.
- Do not create a commit or otherwise finish the merge.

## Acceptance criteria
- Neither conflicted file contains merge markers.
- The test continues verifying that recent updates are a non-empty array, and checks location name and hierarchy in both storage modes.
- No unrelated working-tree or staged changes are modified.

## Validation
- Run `server/test/schedule-admin.test.js`.
- Check the targeted diff and Git status to ensure the two paths are resolved and no merge conflicts remain.
