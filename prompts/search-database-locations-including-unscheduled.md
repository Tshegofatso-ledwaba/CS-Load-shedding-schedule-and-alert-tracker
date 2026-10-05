# Search database locations, including unscheduled locations

## Goal
Let public users search and select every location registered in PowerTrack's existing database location hierarchy, even if no outage schedule has been added for that location.

## Confirmed interpretation
“Map locations” means the location hierarchy represented in PowerTrack's database (`province → city/municipality → area → suburb → zone/block`). No external map/geocoding provider is currently configured or in scope. Admin scheduling selects existing zones; it does not create location records.

## Findings
- The location search currently returns area-shaped results and matches area, suburb, and zone names. It does not filter on schedule existence, but results can be limited by which hierarchy records exist and the fallback currently contains only the canonical Soshanguve seed.
- The public client resolves a selected result through `/api/locations/:id`, then fetches server-computed status and schedules by zone/block ID.
- A registered location with no schedule should still resolve successfully; the server status and public schedule views should report that no outage is scheduled rather than treating the location as missing.

## Scope
- Make public search read all registered location hierarchy data from PostgreSQL when configured, independently of any schedule table or schedule count.
- Return stable, selectable result records with the hierarchy context and exact zone-block ID for each matching block. Avoid losing which block matched when several zones belong to one area.
- Ensure location detail resolution supports these search results for zones, suburbs, and areas that have at least one zone. Do not require a schedule row for resolution.
- Preserve the local seed fallback and make its available locations searchable using the same query behavior.
- Ensure selecting a location with no schedules yields the existing server-computed `POWER_AVAILABLE` state with no next outage, plus an empty upcoming list; do not invent or client-calculate outage data.
- Add focused tests for locations with schedules and locations without schedules, matching at area/suburb/zone levels, result selection/resolution, and empty schedules.
- Keep changes within the current hierarchy and existing PowerTrack design. Do not add external geocoding, map rendering, location CRUD, or a public account feature.

## Acceptance criteria
1. Search returns matching registered locations regardless of whether any schedule rows exist for them.
2. Search results resolve to the exact matched zone block and include useful area/city/province/suburb/zone context.
3. Selecting an unscheduled location succeeds and displays its server-calculated available status and an empty schedule state.
4. Location rows that do not yet have a zone block are not presented as selectable schedule/status locations unless the API can resolve them safely; return a clear empty/no-results outcome rather than a broken selection.
5. No external map provider or secrets are introduced.

## Validation
1. Run focused location search/detail tests against a test database fixture containing a scheduled zone and an unscheduled zone.
2. Verify queries matching area, suburb, and zone names return the expected canonical records.
3. In the browser, select both a scheduled and an unscheduled location and verify status/schedule responses.
4. Run existing status/auth/admin tests and the client production build.