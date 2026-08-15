# Inventory Model — CTG Craft Beer Inversión

Status: design reference for the first domain milestone.

## Movement-based inventory

Inventory is never a single "quantity on hand" column — it is derived from
`investment_inventory_movements`. Movement types:
`PRODUCED`, `PACKAGED`, `WAREHOUSE_RECEIPT`, `RESERVED`, `UNRESERVED`,
`DISPATCHED`, `RECEIVED_AT_DESTINATION`, `SOLD`, `RETURNED`, `DAMAGED`,
`EXPIRED`, `LOST`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`.

Stock states derived from movement history:
`IN_PRODUCTION`, `AVAILABLE`, `RESERVED`, `IN_TRANSIT`, `DELIVERED`, `SOLD`,
`RETURNED`, `DAMAGED`, `EXPIRED`, `LOST`.

## Invariant

No movement may drive any stock state negative. Every movement is validated
against current derived stock before insert (same "lock the aggregate, check
invariant, then write" pattern as the lot state machine — ADR-008). Required
tests, once the engine lands: no negative inventory ever; movements
reconcile (`sum(in) - sum(out) == current stock` per lot per state); a sale
cannot exceed available eligible inventory; damaged/returned units stay
traceable to their originating movement.

## What a participant sees (lot-level only, never other lots' operational detail)

`Producción total`, `Botellas producidas`, `Botellas en bodega`,
`Botellas despachadas`, `Botellas vendidas`, `Botellas dañadas`,
`Botellas restantes`, `Porcentaje vendido`.
