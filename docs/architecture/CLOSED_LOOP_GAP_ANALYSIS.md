# CTG One Closed Loop — Gap Analysis

Date: 2026-08-17

## Target loop

```text
Identity
→ KYC
→ Investment Order
→ Payment Evidence
→ Admin Verification
→ Funding Allocation
→ Production Lot
→ Bottle Serialization
→ Inventory
→ Sales OS
→ Lot Financial Facts
→ Settlement
→ Participant Ledger
→ Withdrawal / Reinvestment
→ Reporting
```

The objective is not that every screen exists. The objective is that every transition creates durable, authorized, idempotent and auditable evidence that the next transition can verify.

## Current integrity baseline

The following are implemented and must be treated as architectural invariants rather than roadmap ideas:

- Supabase Auth + participant-specific KYC.
- Order checkout with server-derived capital requirement.
- Allocation only after administrative payment verification in the canonical flow.
- Beer Style Master Data and database-authoritative lot codes.
- Lot economics snapshots and versioned financial formulas.
- Production state machine + immutable event history.
- Bottle-level unique serialization.
- Bottle-state + inventory movement workflow.
- Sales OS headers/items, channels and idempotency keys.
- Append-only participant ledger.
- One immutable settlement per lot.
- Withdrawal and reinvestment request models.
- RBAC, RLS, audit log and System Health.
- CI invariants + browser E2E baseline.

Migration `0022_closed_loop_integrity.sql` hardens the transactional chain before live financial records exist.

## 1. Identity / KYC

### Implemented
- Supabase Auth.
- KYC submissions/documents and protected admin review.
- Private document access through signed URLs.
- Participant investment profile and investment-specific KYC status.

### Remaining
- Full isolated staging E2E for registration → KYC → approval is paused until a non-production Supabase environment is available.
- A dedicated immutable KYC review-event stream is optional future hardening; current audit evidence remains the source.

## 2. Investment order / payment

### Implemented
- `investment_orders` represents participant intent and reserves lot capacity.
- Capital is derived from the persisted lot economics snapshot in PostgreSQL.
- Payment evidence is submitted separately.
- `approve_investment_order()` creates allocation + ledger consequences transactionally.
- `0022` revokes the old participant-callable `create_funding_allocation()` bypass.
- Approval revalidates investment KYC.

### Remaining
- Real payment provider callbacks/rails remain fail-closed until production credentials and commercial instructions are configured.
- Provider-specific idempotency and reconciliation must be implemented with the provider integration, not guessed in advance.

## 3. Funding allocation

### Implemented
- Allocations are economic interests in case-equivalent units, never ownership of individual bottles.
- Allocation capital must match the lot snapshot exactly.
- Active order reservations are included in capacity checks.
- First allocation pins the lot FormulaVersion; later allocations on the same lot reuse it.
- `FUNDING_OPEN → FUNDED` is blocked until allocations cover all cases and no active funding orders remain.

### Remaining
- Admin reconciliation views should expose paid-order capital vs allocated capital by participant and lot.
- CTG internal funding workflow should receive a dedicated explicit command if internal capital will be used operationally.

## 4. Production lot

### Implemented
- Beer Style Master Data.
- Database-authoritative lot codes.
- Complete immutable economic snapshot per lot.
- Legal sequential production state machine with exceptional states.
- Production events and audit trail.

### New invariant in 0022
`SETTLEMENT_PENDING → SETTLED` cannot be executed through the generic state transition command. Only `finalize_settlement()` may create the settlement and move the lot to `SETTLED`.

### Remaining
- Production OS should eventually be decomposed into smaller command/read-model components.
- Evidence-document requirements can be made mandatory for selected high-risk transitions after operational policy is defined.

## 5. Bottle serialization

### Implemented
- Unique `serial_code` globally.
- Unique `(lot_id, unit_number)`.
- Generation cannot exceed physical lot capacity.
- Public `/beer/[serial]` trace.

### Remaining
- Decide whether `GENERATED` and `PACKAGED` represent distinct physical events; current generation enters bottles as `PACKAGED`.
- Add isolated database concurrency fixtures when staging is available.

## 6. Inventory

### Implemented
- Bottle state and inventory movements are written by controlled RPCs.
- Sale writes a `SOLD` inventory movement atomically.
- `SOLD_OUT` now rejects lots with non-terminal bottle units.

### Remaining
- `location_from`, `location_to` and structured movement references.
- First-class stock-by-location read model.
- Reconciliation dashboard between bottle states and movement aggregates.

## 7. Sales OS

### Implemented
- `investment_sales_channels`.
- `investment_sales` sale header.
- `investment_sale_items` one bottle per sale item.
- Unique idempotency key.
- One bottle cannot belong to two sale items.
- Sale atomically updates bottle state, inventory movement, revenue/tax financial facts and audit evidence.

### New invariants in 0022
- Production OS uses `record_bottle_sale_document()` rather than legacy `record_bottle_sales()`.
- Legacy sale RPC loses client execution.
- Concurrent retries sharing an idempotency key are serialized by advisory lock.
- Reusing an idempotency key with a different payload fails instead of silently returning an unrelated sale.
- Revenue and tax financial entries retain `source_sale_id`.

### Remaining
- Customer master.
- Payment status/method per commercial sale where required.
- Discounts, returns, credit notes and sale void reversal workflow.
- External POS/import adapters.

## 8. Lot financial facts

### Implemented
- Revenue, tax, production cost, commercial cost and adjustment facts.
- `REVENUE` and `TAX` from Sales OS are linked to their sale document.
- Generic financial command is restricted to production cost, commercial cost and adjustment.

### Remaining
- Structured source documents for non-sales costs.
- Reversal genealogy for corrections rather than destructive edits.

## 9. Settlement

### Implemented
- One settlement per lot enforced by unique constraint.
- Settlement immutable after insert.
- Full allocation coverage required before settlement.
- Exactly one FormulaVersion required across the lot.
- Sales gross/tax are reconciled against lot financial facts before settlement.
- Manual/unbacked revenue and tax block settlement.
- Allocation distribution conserves exact NDLP cents for both positive and negative NDLP using numeric floor + largest remainder.
- Settlement generates participant ledger credits and transitions the lot to `SETTLED` transactionally.

### Remaining
- Operational preview/checklist UI before finalization.
- Explicit correction/reversal runbook.
- Business decision on how severe negative NDLP should affect capital recovery must remain contractual, not inferred by engineering.

## 10. Participant ledger / balance

### Implemented
- Append-only signed ledger.
- No direct client writes.
- Raw available balance derived from ledger.
- `0022` introduces spendable balance = ledger available balance − active withdrawal/reinvestment reservations.

### New concurrency invariant
Withdrawal and reinvestment commands serialize on a per-participant advisory lock, so two simultaneous requests cannot reserve the same peso twice.

### Remaining
- Portfolio read model separating active capital, pending settlement, settled capital, realized profit, reserved balance and spendable balance.
- Reconciliation report between settlement snapshot and resulting ledger credits.

## 11. Withdrawals

### Implemented
- Request, approval/rejection and paid states.
- Ledger debit happens only when marked paid.
- Requested/approved withdrawals reserve spendable balance before the debit occurs.
- Approval and payment revalidate the current ledger state under the participant financial lock.

### Remaining
- Real payout provider/rail.
- `PAYMENT_PROCESSING` command and provider reference.
- Provider callback idempotency and payout reconciliation.

## 12. Reinvestment

### Implemented
- Source settlement and target lot genealogy.
- Request reserves participant spendable balance.
- Source settlement must contain an actual settlement credit for the participant.
- Cumulative reinvestment attributed to one source cannot exceed that source settlement credit.
- Approval revalidates KYC, balance, lot capacity and exact lot capital requirement.
- Approval creates allocation + `REINVESTMENT_DEBIT` transactionally.

### Remaining
- Participant-facing reinvestment UI.
- Rejection/cancellation command surface.

## 13. Reporting / User OS

### Implemented
- Participant order/allocation tracking.
- Production progress.
- Participant dashboard now consumes spendable balance rather than presenting reserved funds as available.

### Remaining
- Consolidated portfolio read model.
- Explicit presentation labels for projected, recognized, reserved, settled and withdrawable values.

## 14. Testing

### CI-covered today
- Critical architecture/security invariants.
- Beer Style master-data invariants.
- Migration continuity.
- Git governance.
- Financial economics invariants.
- Closed-loop source-code/migration invariants.
- TypeScript.
- Production Next.js build.
- Non-destructive Chromium E2E baseline.

### Paused until isolated Supabase staging
Full destructive/integration E2E:

```text
register
→ KYC
→ order
→ payment evidence
→ approval
→ allocation
→ production
→ bottles
→ sale
→ settlement
→ withdrawal / reinvestment
```

Production data must not be used as a test fixture.

## 15. Next implementation sequence

### Milestone B — Inventory reconciliation
- structured inventory locations;
- movement references;
- bottle-state vs movement reconciliation queries;
- stock-by-location read model.

### Milestone C — Commercial completion
- customers;
- returns / credit notes;
- sale payments where needed;
- POS/import adapters.

### Milestone D — Financial operations
- settlement preview;
- payout provider lifecycle;
- ledger/settlement reconciliation surfaces;
- participant portfolio read model.

### Milestone E — Platform operations
- Document OS;
- Notification OS;
- domain events/outbox only when asynchronous consumers require it;
- Incident Center;
- backup/restore drills and security hardening.

## Final invariant

The UI may request a command, but it must never be the source of truth for funding, physical inventory, revenue, tax, settlement or participant balance. Every material state transition must be reconstructible from persisted domain evidence.
