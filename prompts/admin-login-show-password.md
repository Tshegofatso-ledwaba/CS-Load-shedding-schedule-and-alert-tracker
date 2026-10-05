# Add password visibility toggle to admin login

## Goal
Let an administrator reveal or conceal the account password while typing on the shared sign-in and registration form.

## Scope
- Add a small Show/Hide password button adjacent to the Password input in `client/app/admin/login/page.tsx`.
- Toggle only the account password input between `password` and `text`; leave the registration key masked.
- Keep the password value and form submission behavior unchanged.
- Use an accessible button type, label that reflects the current action, and `aria-pressed` or equivalent screen-reader state.
- Preserve the existing PowerTrack styling and ensure the control works on narrow screens.

## Out of scope
- Password manager behavior, registration key visibility, authentication changes, new icon dependencies, and unrelated login redesign.

## Acceptance criteria
1. Password is masked by default.
2. Activating the toggle reveals the entered password; activating it again masks it.
3. Sign-in and registration continue to submit the unchanged password value.
4. Keyboard and screen-reader users can identify and operate the toggle.
5. Client production build passes.

## Validation
1. In the browser, type a password, toggle visibility twice, and verify the value remains intact.
2. Run the client production build.