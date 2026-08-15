# Domain Model — CTG Craft Beer Inversión

Status: **design reference for the first domain milestone** (not yet
implemented as tables — the current PR ships the UI-skeleton milestone only,
see `README` note at the bottom of this file).

## Bounded contexts

```
Production   — ProductionLot, ProductionStage, ProductionEvent, QualityControlRecord,
                RawMaterial, RawMaterialPurchase, RawMaterialUsage
Funding      — Participant, ParticipantProfile, FundingAllocation, FundingAgreement,
                FormulaVersion
Inventory    — InventoryLocation, InventoryMovement
Sales        — Customer, SalesChannel, SalesOrder, Sale, SaleItem
Finance      — TaxRecord, LotExpense, LotRevenue, Settlement, SettlementAllocation,
                SettlementLine, LedgerTransaction, LedgerEntry
Withdrawal   — WithdrawalRequest
Reinvestment — ReinvestmentRequest
Documents    — Document, DocumentVersion
Audit        — AuditLog
Config       — SystemConfiguration, FeatureFlag
```

Transversal (not owned by one context): Auth/RBAC (shared with CTG One, see
ADR-011), Notification, Observability.

## Aggregate boundaries

- **ProductionLot** is the aggregate root for everything physical
  (stages, events, QC, inventory movements against that lot).
- **FundingAllocation** is the aggregate root for one participant's economic
  stake in one lot; it references `ProductionLot` and `FormulaVersion` by id,
  it does not own them.
- **Settlement** is computed *from* a lot + its allocations + a formula
  version, and once finalized is itself an immutable aggregate (append a new
  `REVERSAL`/adjustment settlement to correct, never mutate — ADR-004).
- **LedgerEntry** is the single source of truth for all money movement;
  every other "amount" the UI shows is a read model over it (ADR-003).

## Core entities (see `EXISTING_SITE_INTEGRATION.md`/ADR-001 for exact
planned table names — `investment_`-prefixed, additive migrations only)

| Entity | Key fields (illustrative) |
|---|---|
| ParticipantProfile | `user_id` (→ `auth.users`), `kyc_status`, `bank_account_masked`, `agreement_accepted_at` |
| ProductionLot | `code` (e.g. `PB-BOG-GPA-2026-008`), `beer_style`, `destination`, `total_units_produced`, `total_eligible_units`, `case_size_units`, `status` |
| ProductionEvent | `lot_id`, `event_type`, `previous_state`, `new_state`, `occurred_at`, `actor_id`, `evidence_document_id` |
| FundingAllocation | `lot_id`, `participant_id`, `case_equivalent_units`, `capital_committed_cents`, `formula_version_id` |
| FormulaVersion | `version`, `effective_from`, `effective_to`, `participant_profit_share`, `ctg_profit_share`, `status` |
| InventoryMovement | `lot_id`, `movement_type`, `quantity_units`, `resulting_stock_state`, `occurred_at` |
| Sale / SaleItem | `lot_id`, `sales_channel_id`, `quantity`, `unit_price_cents`, `gross_amount_cents`, `recognized_revenue_cents` |
| Settlement | `lot_id`, `formula_version_id`, `net_distributable_profit_cents`, `snapshot` (jsonb), `settlement_date`, `approvers` |
| LedgerEntry | `participant_id`, `lot_id`, `allocation_id`, `type`, `amount_cents`, `actor`, `reference` |
| WithdrawalRequest / ReinvestmentRequest | `participant_id`, `amount_cents`, `status`, timestamps |
| Document | `owner_type`, `owner_id`, `storage_path`, `document_type`, `hash` |
| AuditLog | `actor`, `action`, `entity`, `entity_id`, `previous_value`, `new_value`, `reason` |

`PB-BOG-GPA-2026-008` is a display identifier only (Production Batch /
Bogotá / Golden Pale Ale / year / sequence) — never the DB primary key
(section 21 of the brief).

## Traceability chain (must always be reconstructible end to end)

```
Participant → FundingAllocation → ProductionLot → Production → Inventory
→ Sales → Financial Result → Settlement → Withdrawal / Reinvestment
```

---
**Implementation status:** this document is the target model for the first
domain milestone (see `92-first-domain-milestone` in the master brief). The
PR that introduces this file does **not** yet create these tables — it ships
the UI-skeleton milestone (`91` in the brief) against demo/seed data only,
per the "do not build the entire platform in one uncontrolled pass"
philosophy in `PRODUCT_CONSTITUTION.md`. See the final report for this PR's
`NEXT TASK` recommendation.
