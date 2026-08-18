# Sales Returns & Credit Notes — CTG Craft Beer Investment OS

Status: implementation baseline through `0028_sales_returns_credit_notes.sql`, `0029_sales_returns_hardening.sql` and `0030_sales_returns_settlement_guard.sql`.

## Principle

A confirmed sale is historical evidence and is never rewritten to simulate a return. A customer return creates a second immutable commercial document that references the original sale and the exact serialized bottle units being returned.

```text
CONFIRMED SALE
  → sale items / serialized bottles
  → SOLD movement to CUSTOMER_POSSESSION
  → REVENUE / TAX

CUSTOMER RETURN
  → credit note
  → credit-note items / original sale items
  → SALE_RETURNED movement
  → bottle projection = RETURNED
  → REVENUE_REVERSAL / TAX_REVERSAL
```

## Safe custody cutover

Before this phase, SOLD bottle projection retained the sale-source location. The new model moves future SOLD units to the canonical system location `CUSTOMER_POSSESSION` (`CUSTOMER`).

Migration `0028` therefore starts fail-closed: if an environment already contains `investment_sales` or `investment_sale_items`, the migration aborts before installing the new semantics and requires an explicit audited customer-custody backfill.

The target production database was verified with zero sales and zero sale items before this phase was authored.

## Authoritative credit-note model

### `investment_sales_credit_notes`

One immutable commercial return document with:

- original `sale_id`;
- `lot_id`;
- idempotency key;
- optional business reference;
- canonical receiving location;
- reason code;
- gross credit;
- tax credit;
- actor and timestamp.

### `investment_sales_credit_note_items`

One row per returned serialized bottle. Every item references:

- the credit note;
- the original sale item;
- the bottle unit;
- the lot;
- the serial snapshot;
- exact gross credit;
- exact allocated tax credit.

`unique(sale_item_id)` and `unique(bottle_unit_id)` make a physical sold unit commercially returnable only once.

Both tables are append-only. Authenticated clients have no direct DML path; state changes happen through the domain RPC.

## Deterministic tax credit

The original Sales OS stores tax at sale-document level. Partial returns therefore cannot safely invent a tax amount at the UI.

`_sale_item_tax_share()` allocates the original tax across the sale items deterministically:

1. divide recognized sale tax by total sale items;
2. assign the integer base amount to every item;
3. distribute the remaining cents in stable `serial_code, sale_item_id` order.

The full set of item tax shares always equals the exact original `tax_recognized_cents`.

A physical return credits the full original gross of each returned item. Operators do not type gross or tax values manually.

## Customer custody

`CUSTOMER_POSSESSION` is a system inventory location.

A sale now records:

```text
sale.location_id = source point / warehouse / partner
inventory SOLD movement:
  from = sale source
  to   = CUSTOMER_POSSESSION
bottle.current_location_id = CUSTOMER_POSSESSION
```

A customer return records:

```text
SALE_RETURNED movement:
  from = CUSTOMER_POSSESSION
  to   = registered return receiving location
```

Allowed receiving types are:

- `WAREHOUSE`
- `SALES_POINT`
- `PARTNER`
- `QUARANTINE`
- `OTHER`

The generic operational `RETURNED` movement remains available for non-commercial logistics. `SALE_RETURNED` is reserved for a return backed by an authoritative credit note.

Migration `0030` hardens this genealogy: a `SALE_RETURNED` movement that references a credit note must originate exactly in `CUSTOMER_POSSESSION` and terminate at the `return_location_id` stored by that credit note.

## Non-resale rule

A bottle with historical `investment_sale_items` genealogy is not commercially sellable again.

Sales OS explicitly rejects previously sold units, even if an operator later moves a returned bottle back to `WAREHOUSE`. `get_inventory_location_stock()` likewise classifies any previously sold non-SOLD bottle as `NON_SELLABLE`.

This turns the existing unique sale-item genealogy into an explicit domain rule rather than relying on a downstream unique-constraint failure.

## Authoritative return RPC

`record_sale_return_credit_note()` performs one atomic transaction:

```text
validate sales.manage
→ normalize serial set
→ resolve registered return location
→ serialize idempotency key
→ lock original sale
→ lock returned bottle units
→ verify every serial belongs to the selected CONFIRMED sale
→ verify every unit is currently SOLD
→ reject already-credited sale items
→ verify CUSTOMER_POSSESSION custody
→ derive exact gross/tax credits
→ create credit note
→ create unit credit-note items
→ write SALE_RETURNED movement + bottle links
→ project bottles to RETURNED at receiving location
→ write REVENUE_REVERSAL / TAX_REVERSAL
→ audit log
```

The same idempotency key with the same payload returns the original document. Reusing the key with a different payload fails closed.

A lot that already has an immutable settlement cannot receive a new commercial credit note. Post-settlement refunds therefore require a future adjustment workflow rather than silently rewriting a finalized participant distribution.

## Financial reversals

`investment_lot_financial_entries` adds:

- `REVENUE_REVERSAL`
- `TAX_REVERSAL`
- `source_credit_note_id`

Reversal amounts are positive facts. Their financial sign is expressed by `entry_type`, not by negative storage values.

Hardening in `0029` requires:

- `REVENUE` = authoritative sale gross;
- `TAX` = authoritative sale tax;
- `REVENUE_REVERSAL` = authoritative credit-note gross;
- `TAX_REVERSAL` = authoritative credit-note tax.

No cost or generic adjustment may carry a sale or credit-note source reference.

## Settlement

Settlement now reconciles four document-backed surfaces independently:

```text
CONFIRMED sales gross  = REVENUE
CONFIRMED sales tax    = TAX
credit-note gross      = REVENUE_REVERSAL
credit-note tax        = TAX_REVERSAL
```

Net distributable profit uses:

```text
NDLP = REVENUE
     - REVENUE_REVERSAL
     - TAX
     + TAX_REVERSAL
     - PRODUCTION_COST
     - COMMERCIAL_COST
     - ADJUSTMENT
```

A return therefore reduces commercial revenue while also reversing the tax liability attributable to the returned units.

`0030` adds a settlement-boundary trigger: before an `investment_settlements` row can be created, every credited bottle in that lot must have a unit-linked `SALE_RETURNED` movement from `CUSTOMER_POSSESSION` to the exact receiving location on its credit note. Settlement therefore fails closed on physical return drift even if document and financial totals happen to match.

## Reconciliation read model

`get_sales_return_reconciliation()` returns per sale:

- sold units;
- returned units;
- credit-note count;
- original gross;
- credited gross;
- net revenue;
- original tax;
- credited tax;
- net tax;
- missing physical `SALE_RETURNED` genealogy;
- financial reversal mismatch;
- return state `NONE | PARTIAL | FULL`;
- `is_reconciled`.

Inventory reconciliation is also updated so a credited bottle with a valid commercial return movement is not incorrectly flagged merely because it still retains the immutable original sale item.

## Admin OS

`/admin/operations/returns` is the Sales Returns console. It allows authorized sales operators to:

- select a confirmed sale;
- select exact eligible serials;
- choose a receiving location;
- record reason/reference/notes;
- preview derived gross and tax credit;
- issue the authoritative credit note;
- review prior credit-note documents and reconciliation.

Settlement UI displays gross sales, credit-note reversals, net revenue and net tax before finalization.
