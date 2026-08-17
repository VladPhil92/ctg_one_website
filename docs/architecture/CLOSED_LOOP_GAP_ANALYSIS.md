# CTG One Closed Loop — Gap Analysis

Date: 2026-08-16

## Target loop

```text
Identity
→ KYC
→ Investment Order
→ Payment
→ Funding Allocation
→ Production Lot
→ Bottle Serialization
→ Inventory
→ Sale
→ Lot Financial Facts
→ Participant Ledger
→ Settlement
→ Withdrawal / Reinvestment
→ Reporting
```

The objective is not merely that each screen exists. The objective is that each stage creates durable, authorized and auditable evidence linked to the next stage.

## 1. Identity / KYC

### Current
- Supabase Auth exists.
- `profiles`, KYC submissions/documents and protected admin review exist.
- Private document access is handled with signed URLs.
- Administrative KYC approval works in production.

### Gap
- Review history is represented mainly by final fields/audit patterns rather than a dedicated immutable review-event stream.
- Automated E2E coverage is missing.

### Required
- Add KYC integration/E2E tests before higher-risk payment activation.
- Preserve all review actions in audit/domain events.

## 2. Investment order / payment

### Current
- Investment checkout/order migration and user interfaces exist.
- Payment channels use fail-closed behavior where production configuration is unavailable.

### Gap
- Full production payment-provider flow is not yet a closed automated loop.
- Idempotency/replay guarantees must be explicit for every provider callback or manual approval command.

### Required
- Standard payment command model with unique external/internal references.
- No allocation until payment state is authoritatively approved.
- Tests for duplicate payment submission/approval.

## 3. Funding allocation

### Current
- `investment_funding_allocations` represents economic interest in cases, not ownership of physical bottles.
- Formula version is pinned to allocations.
- Participant and CTG internal allocations are explicitly modeled.

### Gap
- Allocation creation must remain strictly tied to approved funding/order facts as checkout evolves.
- Reconciliation surface between paid orders and allocations should be explicit in Admin OS.

### Required
- Reconciliation query: approved paid capital vs allocated capital per lot and participant.
- Alert on mismatch.

## 4. Production lot

### Current
- Rich production state machine exists.
- Production events preserve transition history.
- Admin Production OS exists.
- Lot code and beer style are stored on the lot.

### Gap
- Beer styles are UI hard-coded rather than authoritative master data.
- Lot code sequencing is currently assisted by frontend logic and uniqueness constraint, but generation should be database-authoritative.
- Large Production OS page mixes state, calculations and presentation.

### Required
- `beer_style_master` or equivalent configuration table.
- database function/transaction for next lot code.
- split production UI into command panels and read models.

## 5. Bottle serialization

### Current
- `investment_bottle_units` provides immutable unique serials and unit number uniqueness within lot.
- Capacity is checked against lot cases × case size.
- Public bottle trace RPC and `/beer/[serial]` exist.

### Gap
- Generated units are inserted directly as `PACKAGED`; finer generated-vs-packaged semantics should be intentional.
- Batch RPC currently accepts a serial array and can partially update eligible rows; caller does not receive a per-input rejection list.

### Required
- Decide whether GENERATED and PACKAGED are distinct business events.
- For bulk sale/status commands, validate requested count against eligible count or return accepted/rejected serial detail.
- Add concurrency tests for serialization.

## 6. Inventory

### Current
- Movement-based inventory table exists.
- Bottle status and inventory movements are linked operationally by RPCs.

### Gap
- Inventory movement rows do not yet include location_from/location_to/reference identifiers.
- Current stock by location/state is not a first-class authoritative read model.
- Some coarse invariants are documented as deferred.

### Required
- Add movement references and locations.
- Define stock derivation by lot/location/state.
- Prevent impossible negative derived stock transitions.
- Add reconciliation: bottle states vs movement totals.

## 7. Sales

### Current
- `record_bottle_sales` marks eligible bottle units SOLD.
- It creates SOLD inventory movement.
- It creates lot-level `REVENUE` financial entry.
- It writes audit evidence.

### Critical gap
There is no normalized sales aggregate. A sale is currently represented indirectly by unit attributes + inventory movement + financial entry + free-text reference.

This is insufficient for a mature commercial/financial closed loop because it cannot cleanly model:
- sale header;
- customer;
- channel;
- payment status/method;
- multiple lines/SKUs;
- discounts;
- taxes by sale;
- returns/credit notes;
- idempotent external POS/import references.

### Required — Sales OS

Entities:
- `sales_channels`
- `customers`
- `sales`
- `sale_items`
- `sale_payments`
- `sale_adjustments` / credit notes as needed

A confirmed sale must atomically or transactionally cause:
1. sale persistence;
2. bottle/stock transition;
3. inventory movement;
4. lot financial recognition;
5. audit/domain event.

Do not allow the frontend to independently write each consequence.

## 8. Lot financial facts

### Current
- `investment_lot_financial_entries` stores revenue, tax, production/commercial costs and adjustments.
- Settlement logic is based on real financial facts rather than a UI projection.

### Gap
- Entries currently have description/actor but limited structured source linkage.
- Sale revenue can be recorded without a normalized sale entity.
- Reversal/adjustment genealogy should be explicit at lot-financial-fact level as the model matures.

### Required
- `reference_type`, `reference_id`, optional `reverses_entry_id`.
- enforce source idempotency where applicable.
- link revenue/tax/cost facts to originating sale/cost document.

## 9. Participant ledger

### Current
- Append-only participant ledger.
- Signed amounts.
- lot/allocation references.
- no direct client writes.

### Gap
- Need stronger automated regression suite for balance and settlement scenarios.
- Need reconciliation between lot financial result, settlement snapshot and participant ledger credits.

### Required
- ledger invariant tests.
- reconciliation query/report.
- operational alert if settlement snapshot and ledger distribution diverge.

## 10. Settlement

### Current
- one settlement per lot unique constraint.
- immutable settlement row.
- largest-remainder distribution design.
- formula version pinned.

### Gap
- End-to-end settlement must be validated against real sales/cost facts before broad production use.
- Correction process needs explicit operational runbook.

### Required
- settlement preview/checklist.
- automated regression fixtures.
- reversal/adjustment procedure documented.

## 11. Withdrawals / reinvestment

### Current
- request models exist.
- participant balance comes from ledger semantics.

### Gap
- real payout rails and provider confirmation should remain disabled until configured.
- idempotent payout reference and reconciliation required before activation.

### Required
- payout command state machine.
- unique provider reference.
- ledger debit only at defined authorized transition.
- reconciliation report.

## 12. Reporting / User OS

### Current
- dashboard surfaces wallet, capital, allocations, activity and identity.
- investment-specific pages provide operational tracking.

### Gap
- user-facing performance must distinguish projected, provisional/recognized and realized/settled values.
- active investment card should consolidate production progress, sales progress and financial state from authoritative read models.

### Required
- typed participant portfolio read model.
- explicit labels: projection vs recognized vs settled.

## 13. Audit / events

### Current
- investment audit log and production event history exist.

### Gap
- no generic domain-event/outbox layer yet.

### Required
Introduce only when needed by notifications/observability:

```text
domain_events
id
domain
event_type
entity_type
entity_id
actor_id
payload
occurred_at
```

Start as database persistence; do not introduce Kafka or distributed brokers.

## 14. Testing exit criteria

Before declaring Closed Loop production-ready, automated tests must prove at least:

1. user registration/session protection;
2. KYC submit/review;
3. investment order creation;
4. duplicate payment protection;
5. payment approval → allocation;
6. lot creation and legal transitions;
7. serial generation without capacity/uniqueness violation;
8. inventory movement invariants;
9. sale confirmation without duplicate financial recognition;
10. settlement exact distribution;
11. withdrawal cannot exceed available ledger balance;
12. role matrix denies unauthorized commands.

## 15. Implementation sequence

### Milestone A — Foundation
- repository hygiene;
- domain service/query-command boundaries;
- master beer styles;
- DB-authoritative lot codes;
- test harness.

### Milestone B — Physical operations
- Production OS decomposition;
- inventory locations/references;
- bottle/inventory reconciliation.

### Milestone C — Commercial close
- Sales OS;
- structured sale → financial facts;
- return/adjustment semantics.

### Milestone D — Financial close
- reconciliation;
- settlement regression suite;
- payout/reinvestment hardening.

### Milestone E — Platform operations
- Document OS;
- Notification OS;
- domain events;
- Incident Center;
- backup/restore and security hardening.

### Milestone F — Intelligence
- read-only CTG Operations Intelligence over authorized read models;
- human-controlled actions only;
- evidence/citations required.

## Final invariant

The user interface must never be the source of truth for a fact that can be calculated or verified from persisted domain evidence.
