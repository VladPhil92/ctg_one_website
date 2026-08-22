# Domain Model — CTG Craft Beer Inversión

Status: **IMPLEMENTED**

This document describes the domain model as it actually exists in the
database today. It is a reading aid, not the authority — the authority is
`supabase/migrations/` (schema/constraints/RPCs) and `src/types/investment.ts`
(TypeScript row shapes kept in sync with them). If this file and the
migrations ever disagree, the migrations win; fix this file.

## Bounded contexts

```
Funding      — investment_participant_profiles, investment_orders,
                investment_funding_allocations, investment_formula_versions
Production   — investment_production_lots, investment_production_events,
                investment_beer_styles
Inventory    — investment_bottle_units, investment_inventory_locations,
                investment_inventory_movements, investment_inventory_movement_units
Sales        — investment_sales_channels, investment_sales, investment_sale_items,
                investment_sales_credit_notes, investment_sales_credit_note_items
Finance      — investment_lot_financial_entries, investment_settlements,
                investment_ledger_entries, investment_payouts, investment_payout_events,
                investment_financial_provider_events, investment_financial_event_matches,
                investment_financial_event_retry_state
Withdrawal   — investment_withdrawal_requests
Reinvestment — investment_reinvestment_requests
Documents    — investment_documents, investment_payment_receipts
Audit        — investment_audit_log
```

Transversal (not owned by one context): Auth/RBAC (shared with CTG One, see
ADR-011; investment roles live on `investment_participant_profiles.investment_role`),
`system_domain_event_outbox`, `system_notification_*`, observability.

## Aggregate boundaries

- **ProductionLot** is the aggregate root for everything physical (events,
  bottle units, inventory movements, sales against that lot).
- **FundingAllocation** is the aggregate root for one participant's economic
  stake in one lot; it references `ProductionLot` and `FormulaVersion` by id,
  it does not own them. An `investment_orders` row is the checkout-time
  precursor to an allocation — an order becomes exactly one allocation once
  payment is verified (`approve_investment_order`).
- **Settlement** is computed *from* a lot + its allocations + a formula
  version. `investment_settlements` has no `UPDATE` policy for any role and a
  unique constraint on `lot_id` — once finalized it is immutable; correct it
  with a new `REVERSAL` ledger entry, never a mutation (ADR-004).
- **LedgerEntry** (`investment_ledger_entries`) is append-only and the single
  source of truth for all participant money movement; every balance the UI
  shows is a read model over it (ADR-003). `investment_lot_financial_entries`
  is the separate, lot-level (not participant-level) revenue/tax/cost feed
  into the Net Distributable Profit calculation.

## Core entities (illustrative fields — see the migration file for full DDL)

| Table | Key fields |
|---|---|
| `investment_participant_profiles` | `user_id` (→ `auth.users`), `investment_role`, `kyc_status`, `bank_account_masked`, `agreement_accepted_at` |
| `investment_orders` | `participant_user_id`, `lot_id`, `case_equivalent_units`, `capital_required_cents`, `status`, `payment_method`, `payment_proof_*`, `bank_verified_*`, `allocation_id` |
| `investment_funding_allocations` | `lot_id`, `participant_user_id`, `is_ctg_internal`, `case_equivalent_units`, `capital_committed_cents`, `formula_version_id` |
| `investment_formula_versions` | `version`, `effective_from/to`, `participant_profit_share`, `ctg_profit_share` (constrained to sum to 1), `status` (`DRAFT`/`ACTIVE`/`RETIRED`, one `ACTIVE` at a time) |
| `investment_production_lots` | `code` (display id, e.g. `PB-BOG-GPA-2026-008`, never the join key), `beer_style_id`, `destination`, `status` (see `LOT_STATE_MACHINE.md`), `case_size_units`, `total_cases`, `total_eligible_units`, cost/price fields in cents |
| `investment_production_events` | `lot_id`, `previous_status`, `new_status`, `actor_id`, `evidence_document_id`, `occurred_at` |
| `investment_bottle_units` | `lot_id`, `unit_number`, `serial_code`, `status` (`GENERATED`…`RECALLED`), `current_location`, `sold_at`, `sale_price_cents` |
| `investment_sales` / `investment_sale_items` | `lot_id`, `channel_id`, `idempotency_key`, `status` (`CONFIRMED`/`VOID`), `gross_revenue_cents`; items reference one `bottle_unit_id` each |
| `investment_lot_financial_entries` | `lot_id`, `entry_type` (`REVENUE`/`TAX`/`PRODUCTION_COST`/`COMMERCIAL_COST`/`ADJUSTMENT`), `amount_cents` |
| `investment_settlements` | `lot_id` (unique), `formula_version_id`, `net_distributable_profit_cents`, `total_eligible_units`, `snapshot` (jsonb, full per-allocation breakdown), `finalized_by/at` |
| `investment_ledger_entries` | `participant_user_id`, `lot_id`, `allocation_id`, `entry_type` (15 values, e.g. `SETTLEMENT_CREDIT`, `WITHDRAWAL_DEBIT`, `REVERSAL`), `amount_cents` (signed), `reference`, `metadata` |
| `investment_withdrawal_requests` | `participant_user_id`, `amount_cents`, `status` (`REQUESTED`…`PAID`/`REJECTED`/`CANCELLED`), `reviewed_by/at` |
| `investment_reinvestment_requests` | `participant_user_id`, `source_settlement_id`, `target_lot_id`, `amount_cents`, `status` — preserves the full genealogy: Lot A Settlement → Reinvestment → Lot B Allocation |
| `investment_documents` | `owner_type` (`PARTICIPANT`/`LOT`/`SETTLEMENT`), `owner_id`, `document_type`, `storage_path` |
| `investment_audit_log` | actor/action/entity/previous+new value, per the shared audit convention |

## Authoritative operations (`SECURITY DEFINER` RPCs, not direct table writes)

Representative examples — the RPC re-checks authorization itself, the route
handler's own check is a UX fast-path only (see `SECURITY_MODEL.md`):
`create_funding_allocation`, `approve_investment_order`, `transition_lot_status`,
`finalize_settlement`, `request_withdrawal` / `approve_withdrawal` /
`reject_withdrawal` / `mark_withdrawal_paid`, `request_reinvestment` /
`approve_reinvestment_request` / `reject_reinvestment_request` /
`cancel_reinvestment_request`, `approve_deposit`, `approve_kyc`.

## Traceability chain (must always be reconstructible end to end)

```
Participant → Order → FundingAllocation → ProductionLot → Production → Inventory
→ Sales → Financial Result (LotFinancialEntries) → Settlement
→ Withdrawal / Reinvestment (→ new FundingAllocation on the target lot)
```

The `Operational Golden Journey` (`docs/architecture` / Phase 17,
`scripts/investment-operational-golden-journey.sql`,
`scripts/test-investment-operational-golden-journey-invariants.mjs`)
reconstructs and asserts this exact chain against a clean database in CI.

---
**Implementation status:** implemented across `supabase/migrations/0004`
through the current latest migration (see
`src/lib/observability/schema-version.ts` for the exact expected count/name —
never infer it from prose, per `docs/architecture/SYSTEM_STATE.md`).
Related reading: `LOT_STATE_MACHINE.md` (full status graph),
`FINANCIAL_MODEL.md` (settlement math), `SALES_ALLOCATION.md`,
`INVENTORY_MODEL.md`, and `docs/investment/ROADMAP.md` for what's still
outstanding on top of this model.
