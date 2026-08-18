# Payment Reconciliation & Payout Rails — CTG Craft Beer Investment OS

Schema contract: `0031_payment_reconciliation_payout_rails.sql` through `0033_payment_rails_rls_performance.sql`.

## Principle

The investment platform distinguishes facts that must never be conflated:

```text
PARTICIPANT PAYMENT CLAIM
  method / declared reference / uploaded proof
  ≠ authoritative cash receipt

AUTHORITATIVE INBOUND RECEIPT
  verified provider reference + settled timestamp
  → funding allocation
  → FUNDING_RECEIVED / CAPITAL_COMMITTED

WITHDRAWAL REQUEST
  reserves spendable participant balance
  ≠ money paid

AUTHORITATIVE OUTBOUND PAYOUT
  PROCESSING → CONFIRMED external reference
  → PAID
  → WITHDRAWAL_DEBIT
```

A UI button, screenshot or participant-entered reference is never sufficient evidence that money moved.

## Migration sequence

### `0031_payment_reconciliation_payout_rails.sql`

Introduces the core money-rail model:

- fail-closed cutover when monetary history already exists;
- immutable inbound payment receipts;
- immutable payout documents and append-only provider events;
- receipt/payout source genealogy in participant ledger entries;
- authoritative inbound reconciliation;
- payout initiation, confirmation and failure workflows;
- withdrawal destination prerequisite;
- inbound/outbound reconciliation read models and health counters;
- fail-closed legacy funding/payment shortcuts.

### `0032_payment_rails_hardening.sql`

Closes review and concurrency gaps without rewriting `0031`:

- server-side masked-destination validation;
- rejection of long unmasked digit sequences;
- normalized provider/reference values;
- bounded future provider timestamps;
- payout lifecycle ordered by append time (`created_at`), not provider business time;
- terminal confirmation regardless of provider timestamp ordering;
- failed payout recovery by immutable `withdrawal_request_id` after browser reload;
- idempotent payout confirmation when external reference, `PAID` state and debit already reconcile.

### `0033_payment_rails_rls_performance.sql`

Optimizes the three new read policies so `auth.uid()` and RBAC context are evaluated once per statement through initplans rather than once per candidate row.

## Safe cutover

`0031` changes the monetary semantics of orders, allocations and withdrawals. It therefore aborts if the target environment already contains investment orders, funding allocations, participant ledger entries, withdrawal requests or settlements. Existing history must be backfilled from real source documents; the migration never fabricates receipts or payouts.

## Inbound rail

### Participant payment claim

`submit_investment_order_payment()` records only the participant claim:

- payment rail;
- declared reference;
- optional proof path;
- submission timestamp.

It does **not** write `FUNDING_RECEIVED`, `CAPITAL_COMMITTED` or an allocation.

### `investment_payment_receipts`

One immutable authoritative receipt per order. This MVP intentionally requires an exact one-receipt-to-one-order match instead of partial or split funding.

The receipt captures order, participant, reconciled rail, provider code, external reference, exact COP amount, provider settlement timestamp, idempotency key and reconciliation actor. `unique(order_id)` prevents duplicate receipts and `(provider_code, external_reference)` prevents one external movement from financing two orders.

### `reconcile_investment_order_payment()`

The supported activation path is atomic:

```text
validate funding.manage / finance.manage
→ normalize provider evidence
→ lock PAYMENT_SUBMITTED order
→ require current VERIFIED investment KYC
→ require reconciled rail = participant claim rail
→ require receipt amount = exact order capital
→ create immutable receipt
→ create checked funding allocation
→ receipt-backed FUNDING_RECEIVED
→ receipt-backed CAPITAL_COMMITTED
→ order = ALLOCATED
→ audit
```

Legacy `approve_investment_order()` and direct participant `create_funding_allocation()` deliberately raise exceptions after this cutover.

## Ledger genealogy

`investment_ledger_entries` adds `source_payment_receipt_id` and `source_payout_id`. A database trigger independently enforces:

```text
FUNDING_RECEIVED   → authoritative receipt required
CAPITAL_COMMITTED  → authoritative receipt required
WITHDRAWAL_DEBIT   → confirmed payout required
```

Participant, lot and amount must equal the source facts. Unrelated ledger types may not carry money-rail references.

## Payout destination safety

CTG One does **not** store raw bank-account credentials in this phase. A participant registers only a human-readable masked destination, such as `Bancolombia ****1234`, plus a non-secret fingerprint/token reference.

`0032` makes masking a server invariant rather than UI guidance: the destination must contain masking characters and cannot contain a five-or-more-digit unmasked sequence. The actual banking credential remains with the external financial provider/process.

`set_investment_payout_destination()` blocks changes while a withdrawal is active (`REQUESTED`, `UNDER_REVIEW`, `APPROVED`, `PAYMENT_PROCESSING`). `request_withdrawal()` requires a registered destination before reserving balance.

## Outbound payout rail

### `investment_payouts`

One immutable payout document per withdrawal request. It snapshots participant, exact amount, rail, provider, masked destination, destination fingerprint, idempotency key and actor.

### `investment_payout_events`

Provider lifecycle is append-only:

```text
(no event)
   ↓
PROCESSING
   ├──→ CONFIRMED [terminal]
   └──→ FAILED
          ↓ retry
       PROCESSING
```

Current lifecycle state is derived from append order (`created_at`, then `id`). `occurred_at` remains business evidence from the provider and is not allowed to reorder the state machine. A materially future provider timestamp is rejected.

### `initiate_investment_payout()`

Requires `finance.manage`, an `APPROVED` withdrawal, balance coverage after other reservations and an exact match with the frozen payout destination. It creates the payout document, appends `PROCESSING` and moves the withdrawal to `PAYMENT_PROCESSING`; no debit exists yet.

Retries recover the existing immutable payout by `withdrawal_request_id`. After `FAILED`, the same payout document can append a new `PROCESSING` event even after a browser reload or a new client operation key. A second payout document for the same withdrawal is not created.

### `confirm_investment_payout()`

Confirmation locks the payout and withdrawal, checks the latest append-state and participant balance, then atomically:

```text
CONFIRMED provider event
→ withdrawal = PAID
→ WITHDRAWAL_DEBIT = -payout amount
→ audit
```

A network retry is idempotent only when the same external reference, `PAID` state and exact debit already reconcile. Otherwise it fails closed.

### `fail_investment_payout()`

A processing payout may append `FAILED` and return its withdrawal to `APPROVED` for retry. No debit is created. A confirmed payout is terminal. Legacy `mark_withdrawal_paid()` is disabled.

## Reconciliation and health

`get_investment_inbound_reconciliation()` compares order capital, receipt, allocation, `FUNDING_RECEIVED` and `CAPITAL_COMMITTED`.

`get_investment_payout_reconciliation()` compares withdrawal amount/status, immutable payout, latest append-event and `WITHDRAWAL_DEBIT`.

`get_investment_money_rail_health()` exposes explicit mismatch counters:

- allocated orders without receipt;
- receipt/funding-ledger mismatches;
- paid withdrawals without confirmed payout;
- confirmed payout/ledger mismatches.

## Admin OS

`/inversion/admin/orders` no longer offers generic payment approval. Finance must record provider/bank, external reference and provider settlement timestamp; amount and claimed rail remain fixed by the order.

`/admin/finance/rails` manages withdrawal approval, payout initiation, provider confirmation, failure/retry and reconciliation. All active withdrawals are loaded independently from the capped recent-paid history, so historical volume cannot hide an outstanding obligation.

## Participant OS

Both `/dashboard/inversion` and the canonical `/inversion/app` use the same `InvestmentLiquidityPanel` flow for:

- spendable settled balance;
- masked payout-destination registration;
- withdrawal requests;
- payout lifecycle visibility.

The UI warns against entering a full bank-account number, while `0032` enforces the same rule server-side.

## RLS performance

The receipt, payout and payout-event read policies preserve the same authorization semantics but use scalar initplans such as `(select auth.uid())` and `(select public.has_investment_permission(...))`. This avoids per-row re-evaluation of request identity/RBAC context at scale.

## Non-goals

This phase does not integrate a specific bank, PSE, Bre-B or crypto provider API. Provider execution remains external/manual until a connector-specific adapter exists. A future webhook or provider adapter should call these same authoritative reconciliation functions instead of creating an alternate ledger path.
