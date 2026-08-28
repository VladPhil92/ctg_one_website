# Production Lot State Machine

Status: **IMPLEMENTED AND DB-ENFORCED**. The canonical lifecycle is enforced in PostgreSQL by controlled `SECURITY DEFINER` functions and recorded in `investment_production_events`. Clients do not authoritatively set lot status directly.

## Normal lifecycle

```text
DRAFT → FUNDING_PENDING → FUNDING_OPEN → FUNDED → PROCUREMENT → BREWING
→ FERMENTATION → CONDITIONING → BOTTLING → QUALITY_CONTROL → WAREHOUSE
→ DISPATCHED → IN_MARKET → SELLING → SOLD_OUT → SETTLEMENT_PENDING
→ SETTLED → CLOSED
```

The transition into `SETTLED` is intentionally special: `transition_lot_status()` stops at `SETTLEMENT_PENDING`; `finalize_settlement()` performs the settlement invariants, writes the immutable settlement and participant ledger credits, and records the `SETTLED` production event in the same controlled transaction. `SETTLED → CLOSED` returns to `transition_lot_status()`.

## Exceptional states

`PAUSED`, `CANCELLED`, `PRODUCTION_LOSS`, `PARTIAL_LOSS`, `RECALLED`, and `EXPIRED` are explicit exceptional targets supported by the database transition function. They are never implicit fallbacks and every accepted transition is auditable through the production-event history.

The presence of these technical states does **not** settle the unresolved business treatment of losses, lot closing, or unsold inventory. BR-003, BR-004, and BR-005 remain governed by `BUSINESS_MODEL.md` and must not be inferred from the state names alone.

## Enforcement (ADR-008 / ADR-009)

The current transition RPC is:

```text
transition_lot_status(
  p_lot_id uuid,
  p_new_status text,
  p_notes text default null,
  p_evidence_document_id uuid default null
) → void
```

It is `SECURITY DEFINER` with a fixed `search_path = public`. The caller identity is derived from `auth.uid()`; there is no caller-supplied `actor_id` parameter.

For every normal transition, the function:

1. Requires `is_investment_operator()` authorization.
2. Locks the target lot row with `FOR UPDATE`.
3. Checks the current status against the legal next-state allow-list.
4. Applies stage-specific consistency guards where required.
5. Writes the transition through the controlled production-event writer, attributing the event to `auth.uid()`.
6. Associates an optional evidence document with the resulting event.

Skipped normal-state jumps such as `BREWING → SETTLED` are rejected at the database layer regardless of what a client sends.

## Stage-specific guards currently enforced

### `FUNDING_OPEN → FUNDED`

The database refuses the transition unless:

- funding allocations cover exactly all `total_eligible_units`; and
- no active unallocated funding order remains in the funding pipeline.

This guard proves allocation/capacity closure. It does not authorize public funding by itself; product exposure remains controlled separately by fail-closed feature flags and release governance.

### `SELLING → SOLD_OUT`

The database refuses the transition when:

- no serialized bottle units exist;
- any bottle remains in a non-terminal status; or
- a bottle marked `SOLD` lacks an authoritative `investment_sale_items` document trail.

### `SOLD_OUT → SETTLEMENT_PENDING`

The lot cannot enter settlement while revenue/tax financial entries exist without authoritative sale backing.

### `SETTLEMENT_PENDING → SETTLED`

This transition is owned by:

```text
finalize_settlement(p_lot_id uuid) → uuid
```

`finalize_settlement()` requires `is_investment_admin()` and, among other invariants, verifies:

- the lot is locked and currently `SETTLEMENT_PENDING`;
- the lot has not already been settled;
- allocations exactly cover eligible units;
- exactly one formula version governs the lot allocations;
- sale and credit-note financial entries are backed by their authoritative documents;
- confirmed sales reconcile to financial revenue/tax entries;
- credit notes reconcile to reversal entries and do not exceed confirmed sales.

Only after those checks does it calculate realized NDLP from authoritative financial entries, create the immutable settlement, create participant `SETTLEMENT_CREDIT` ledger entries, and record the `SETTLED` production event.

## Participant-facing timeline

The participant timeline is rendered from `investment_production_events`, not inferred from the current `investment_production_lots.status` value alone. A representative presentation is:

```text
✅ Aporte confirmado              ✅ Embotellado
✅ Materias primas adquiridas     ✅ Control de calidad
✅ Producción iniciada            ✅ Ingreso a bodega
✅ Cocción realizada              ✅ Despacho
✅ Fermentación iniciada          ✅ Comercialización
✅ Fermentación finalizada        ✅ Lote vendido
✅ Acondicionamiento              ✅ Liquidación
```

Dates and supporting evidence may be shown for completed steps where available. Steps not yet reached remain pending rather than being fabricated or hidden.

## Release boundary

A DB-enforced state machine is technical readiness evidence, not proof that a real production lot has completed the lifecycle. Production maturity and LIVE promotion remain subject to the separate exact-deployment canary, reviewed real operating evidence, pending business/legal decisions, and explicit human release governance documented elsewhere in this repository.
