# Production Lot State Machine

Status: design reference for the first domain milestone (see note at the
bottom of `DOMAIN_MODEL.md` — not yet implemented as a DB-enforced state
machine; the current PR's demo lot uses a fixed illustrative status).

## Normal lifecycle

```
DRAFT → FUNDING_PENDING → FUNDING_OPEN → FUNDED → PROCUREMENT → BREWING
→ FERMENTATION → CONDITIONING → BOTTLING → QUALITY_CONTROL → WAREHOUSE
→ DISPATCHED → IN_MARKET → SELLING → SOLD_OUT → SETTLEMENT_PENDING
→ SETTLED → CLOSED
```

## Exceptional states

`PAUSED`, `CANCELLED`, `PRODUCTION_LOSS`, `PARTIAL_LOSS`, `RECALLED`,
`EXPIRED` — reachable from any in-progress state via an explicit, logged
transition; never a default/implicit fallback.

## Enforcement (ADR-008)

Transitions are only legal in the direction listed above (each state's only
legal "next" is the following state, plus any exceptional state). Enforced
inside a `SECURITY DEFINER` Postgres function
(`transition_lot_status(lot_id, new_status, actor_id, notes, evidence_document_id)`)
that:
1. Locks the lot row (`for update`).
2. Confirms the caller is authorized (`is_investment_admin()` or the
   specific role permitted for that stage — see `SECURITY_MODEL.md`).
3. Checks `current_status → new_status` against the allow-list.
4. Writes the new status **and** an `investment_production_events` row in the
   same transaction (ADR-009) — the event history is what the participant
   timeline renders from, not the status column alone.

`BREWING → SETTLED` (or any other skipped-state jump) is rejected at the
database layer regardless of what any client sends.

## Participant-facing timeline (rendered from `investment_production_events`)

```
✅ Aporte confirmado              ✅ Embotellado
✅ Materias primas adquiridas     ✅ Control de calidad
✅ Producción iniciada            ✅ Ingreso a bodega
✅ Cocción realizada              ✅ Despacho
✅ Fermentación iniciada          ✅ Comercialización
✅ Fermentación finalizada        ✅ Lote vendido
✅ Acondicionamiento              ✅ Liquidación
```

Dates and supporting evidence documents are shown per completed step where
available; steps not yet reached render as pending, not hidden.
