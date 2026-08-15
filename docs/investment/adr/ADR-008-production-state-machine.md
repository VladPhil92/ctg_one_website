# ADR-008: Production Lot State Machine

## Status
Accepted

## Decision
`investment_production_lots.status` transitions only through an explicit,
server-enforced state machine (see `LOT_STATE_MACHINE.md` for the full
transition table). Enforcement happens in a Postgres `SECURITY DEFINER`
function (`transition_lot_status(lot_id, new_status, ...)`) that checks the
current status against an allow-list of legal next states before writing —
the same defense-in-depth pattern already used by `approve_deposit`/
`approve_kyc` (re-check authorization/invariants inside the function, don't
trust the caller). Direct `UPDATE` on `status` is not granted to any role.

## Consequences
`BREWING → SETTLED` (or any other skipped-state jump) is rejected at the
database layer regardless of what the UI sends. Deferred to the first domain
milestone, not the initial UI-skeleton slice.
