# ADR-009: Production Event History

## Status
Accepted

## Decision
`investment_production_lots.status` is a projection, not the source of
truth. Every transition writes an `investment_production_events` row
(`previous_state`, `new_state`, `occurred_at`, `actor_id`, `notes`,
`evidence_document_id`). The participant-facing lot timeline
(`LOT_STATE_MACHINE.md` §Participant Timeline) always renders from this
event table, never from a single current-status field, so partial/delayed
updates and historical evidence remain visible even after the lot moves on.

## Consequences
Slightly more write volume per transition (one state update + one event
insert, same transaction); in exchange, the participant timeline and any
future audit never lose history.
