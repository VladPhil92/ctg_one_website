# Inventory Model — CTG Craft Beer Inversión

Status: implemented baseline through migrations `0024_inventory_reconciliation_preflight.sql`, `0025_inventory_reconciliation.sql`, `0026_inventory_reconciliation_hardening.sql` and `0027_inventory_location_fk_index.sql`.

## Cutover contract

Inventory Reconciliation deliberately does not invent historical physical locations. Migration `0024` is a fail-closed preflight: if an environment already contains bottle units, inventory movements, sales or sale items, the sequence stops before installing the canonical model and requires an explicit audited backfill plan.

The production cutover for this project was designed while those physical/commerce tables contained zero rows, so no synthetic history is required.

## Core principle

Inventory is not represented by a mutable "quantity on hand" field. Physical truth is reconstructed from two coordinated projections:

1. `investment_bottle_units` — current unit-level projection for every serialized bottle.
2. `investment_inventory_movements` + `investment_inventory_movement_units` — append-only event history that records which serials moved, from where, to where and why.

A bottle projection that cannot be explained by its movement history is an inventory discrepancy.

## Canonical locations

`investment_inventory_locations` is the master registry for operational locations. Stable uppercase codes are the integration key; names and addresses are presentation metadata.

Location types:

- `PRODUCTION`
- `WAREHOUSE`
- `TRANSIT`
- `SALES_POINT`
- `PARTNER`
- `CUSTOMER`
- `QUARANTINE`
- `OTHER`

System locations provisioned by the baseline:

- `CTG_PRODUCTION`
- `CTG_WAREHOUSE`
- `IN_TRANSIT`

Operational sales points and partners are registered through `upsert_inventory_location()` before units can be received there. System location types cannot be changed or deactivated.

`investment_bottle_units.current_location_id` is the canonical foreign key. The legacy `current_location` text column remains only as a denormalized display label maintained by domain RPCs.

Migration `0027` adds the covering index for `investment_inventory_locations.created_by`, the only new unindexed foreign key reported by Supabase Performance Advisor after the canonical cutover.

## Movement history

Movement types:

`PRODUCED`, `PACKAGED`, `QC_APPROVED`, `WAREHOUSE_RECEIPT`, `RESERVED`, `UNRESERVED`, `DISPATCHED`, `RECEIVED_AT_DESTINATION`, `SOLD`, `RETURNED`, `DAMAGED`, `EXPIRED`, `LOST`, `RECALLED`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`.

Each authoritative unit movement records:

- lot;
- movement type;
- quantity;
- monotonic `sequence_no`;
- origin location;
- destination location;
- actor;
- linked bottle units;
- optional Sales OS source document for `SOLD`.

`investment_inventory_movement_units` provides unit genealogy. A deferred database constraint validates at transaction commit that `movement.quantity_units` equals the exact number of linked bottle units. Movement rows and movement-unit links are append-only.

For `SOLD`, the source sale must also be a confirmed Sales OS document from the same lot.

## Bottle transition state machine

Physical transitions are validated atomically by `update_bottle_units_status()`.

Baseline legal paths include:

```text
PACKAGED
  → QC_APPROVED
  → WAREHOUSE
  → DISPATCHED
  → IN_MARKET
```

Returns move from `DISPATCHED` or `IN_MARKET` to `RETURNED`, then may be received back into `WAREHOUSE`.

Operational exception states (`DAMAGED`, `LOST`, `EXPIRED`, `RECALLED`) are constrained to eligible non-sold source states. `SOLD` is written only by Sales OS, not by the generic movement RPC.

A multi-serial operation is all-or-nothing: if one requested bottle is missing or has an illegal source state, no bottle in the batch is updated.

## Sales OS integration

`record_bottle_sale_document()` is the only client-executable sale path.

A confirmed sale atomically writes:

```text
Sales document
→ Sale items
→ SOLD inventory movement
→ movement ↔ bottle links
→ bottle projection = SOLD
→ REVENUE/TAX financial facts
→ audit log
```

A sale cannot span multiple physical source locations. An explicitly supplied sale location must match the current canonical location of every bottle; Sales OS never silently relocates inventory.

The Bottle Scanner uses the same idempotent Sales OS RPC. Its idempotency key is generated on first submission and retained across retries of the same attempt.

The historical `record_bottle_sales()` and coarse `record_inventory_movement()` RPCs are not executable by `anon` or `authenticated` roles.

## Stock by location

`get_inventory_location_stock()` derives stock from the current bottle projection and groups it by:

- canonical location;
- lot;
- bottle status;
- inventory class.

Inventory classes:

- `WORK_IN_PROCESS`
- `SELLABLE`
- `SOLD`
- `NON_SELLABLE`

This read model is operational; participant-facing reporting remains lot-level and does not expose internal location detail.

## Reconciliation engine

`get_inventory_reconciliation()` compares the bottle projection with movement history and Sales OS.

Per lot it detects:

- movement quantity different from linked serial count;
- serialized bottles with no movement history;
- missing canonical locations;
- current location different from the last movement destination;
- bottle status different from the status implied by the last movement;
- SOLD bottles without the corresponding sale item / Sales OS movement genealogy.

A lot is `is_reconciled = true` only when all discrepancy counters are zero. The commit-time quantity/link constraint prevents the most fundamental movement mismatch from becoming durable in the first place; reconciliation remains defense in depth for projection drift and cross-domain genealogy.

## Security model

Direct client mutation of bottle units, inventory movements, movement-unit links and location master data is prohibited. State changes occur through domain RPCs that revalidate RBAC.

Operational inventory reads require `ops.read`. Location administration requires `inventory.manage`. Sales-generated `SOLD` movements require `sales.manage` and an authoritative `source_sale_id`.

The historical anonymous `SELECT USING (true)` policy on `investment_inventory_movements` is removed by migration `0025`.

## Participant-facing metrics

Participant views remain aggregated at lot level, for example:

- Producción total
- Botellas serializadas
- Botellas en bodega
- Botellas despachadas
- Botellas vendidas
- Botellas dañadas / perdidas
- Botellas restantes
- Porcentaje vendido

Participants do not receive operational location-level visibility merely because they hold an economic allocation in the lot.
