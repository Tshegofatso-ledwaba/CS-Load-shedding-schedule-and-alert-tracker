# Fix client location search

## Goal
Make the public location search button reliably return useful, selectable locations and give visible feedback when there are no matches or the API is unavailable.

## Findings
- `client/app/page.tsx` starts a debounced request whenever the query changes and starts a second request when Search or Enter is used. The concurrent responses can race, and fetch failures are silently converted into an empty result list.
- `GET /api/locations/search` currently matches only `area.name`. Common queries such as `Soshanguve Block F` (suburb) and `Zone 2` (zone/block) return no results even though they refer to the seeded location.
- The client search result contract expects an area-like result with city and province information; preserve that canonical selectable result shape so selecting a match continues through the existing area-to-zone resolver.

## Scope
- Consolidate button and Enter search behavior with typeahead so the same query does not cause competing requests; ignore/cancel stale responses.
- Add a search loading state and explicit empty/error feedback. Clear prior errors on a new search and retain accessible labels.
- Extend the backend search to match area, suburb, and zone/block names, while returning the canonical area result and its city/province fields.
- Keep all status and schedule loading on the existing server API paths. Do not change the visual system or add an account/location-management feature.
- Add focused backend tests for matching area, suburb, and zone/block terms and preserve empty-query behavior.

## Out of scope
- Changes to schedule management, saved-location persistence, location data model, unrelated visual redesign, or public account features.

## Acceptance criteria
1. Clicking Search and pressing Enter both show results for the current query.
2. Searches for `Soshanguve`, `Soshanguve Block F`, and `Zone 2` return the canonical Soshanguve area option.
3. Rapid typing or repeated clicks cannot replace newer results with an older response.
4. No-match and API-failure states are visible and understandable; a successful result can be selected and resolves through the existing location-to-zone behavior.
5. Client build and focused location API tests pass.

## Validation
1. Test API queries for area, suburb, and zone names, as well as blank and unmatched queries.
2. In the browser, exercise Search, Enter, fast query changes, no matches, and selecting a returned option.
3. Run focused server location tests and the client production build.