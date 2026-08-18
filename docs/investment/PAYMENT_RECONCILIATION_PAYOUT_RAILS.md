# Payment Reconciliation & Payout Rails — CTG Craft Beer Investment OS

Status: implementation baseline in `0031_payment_reconciliation_payout_rails.sql`.

## Principle

The investment platform distinguishes three different facts that must never be conflated:

```text
PARTICIPANT CLAIM
  payment method / reference / uploaded proof
  ≠ authoritative cash receipt

AUTHORITATIVE INBOUND RECEIPT
  verified external provider reference
  → funding allocation
  → FUNDING_RECEIVED / CAPITAL_COMMITTED

WITHDRAWAL REQUEST
  reserved participant balance
  ≠ money paid

AUTHORITATIVE OUTBOUND PAYOUT
  PROCESSING → CONFIRMED external reference
  → PAID
  → WITHDRAWAL_DEBIT
```

A UI button or uploaded screenshot is never sufficient evidence that money moved.

## Safe cutover

`0031` changes the monetary semantics of orders, allocations and withdrawals. It therefore starts fail-closed when any of these already contain monetary history:

- investment orders;
- funding allocations;
- participant ledger entries;
- withdrawal requests;
- settlements.

Production was audited with zero rows across those surfaces before the migration was authored. If rows appear before deployment, the migration must abort and an explicit source-document backfill must be designed instead of silently inventing receipts or payouts.

## Inbound rail

### Participant payment claim

`submit_investment_order_payment()` continues to record the participant claim:

- payment rail;
- declared reference;
- optional proof path;
- submission timestamp.

It does not write `FUNDING_RECEIVED`, `CAPITAL_COMMITTED` or an allocation.

### `investment_payment_receipts`

One immutable authoritative receipt per investment order. The MVP intentionally requires one exact receipt rather than partial/split payments.

The receipt contains:

- order and participant;
- reconciled rail;
- provider/bank code;
- external provider reference;
- exact amount in COP cents;
- provider settlement timestamp;
- idempotency key;
- reconciliation actor and timestamp.

`unique(order_id)` prevents multiple receipts for the same order. `(provider_code, external_reference)` is also unique so one bank/provider movement cannot finance two orders.

### `reconcile_investment_order_payment()`

This is the only supported funding activation path:

```text
validate funding.manage / finance.manage
→ normalize provider reference + idempotency key
→ lock order
→ require PAYMENT_SUBMITTED
→ require verified investment KYC
→ require reconciled rail = participant claim rail
→ require receipt amount = exact order capital requirement
→ create immutable payment receipt
→ create checked funding allocation
→ write receipt-backed FUNDING_RECEIVED
→ write receipt-backed CAPITAL_COMMITTED
→ mark order ALLOCATED
→ audit log
```

Everything commits or rolls back together.

The following legacy pathways are intentionally disabled:

- `approve_investment_order()`;
- `create_funding_allocation()`.

Neither can create money facts after `0031`.

## Ledger genealogy

`investment_ledger_entries` adds:

- `source_payment_receipt_id`;
- `source_payout_id`.

A database trigger enforces:

```text
FUNDING_RECEIVED   → payment receipt required
CAPITAL_COMMITTED  → payment receipt required
WITHDRAWAL_DEBIT   → confirmed payout required
```

The participant, lot and amount must equal the source document. Other ledger types may not carry these source references.

## Payout destination

The platform deliberately does **not** store raw bank-account credentials in this phase.

The participant registers only:

- a human-readable masked destination, e.g. `Bancolombia ****1234`;
- a non-secret stable fingerprint.

The actual banking credential remains with the external financial provider/process.

`set_investment_payout_destination()` refuses destination changes while any withdrawal is active (`REQUESTED`, `UNDER_REVIEW`, `APPROVED`, `PAYMENT_PROCESSING`). This freezes the payment target for the duration of the withdrawal workflow.

`request_withdrawal()` now requires a registered destination before creating a reservation.

## Outbound rail

### `investment_payouts`

One immutable payout document per withdrawal request. It snapshots:

- participant;
- exact approved withdrawal amount;
- rail and provider;
- masked destination and fingerprint;
- idempotency key;
- actor and timestamp.

### `investment_payout_events`

Append-only provider lifecycle:

```text
(no event)
   ↓
PROCESSING
   ├──→ CONFIRMED  [terminal]
   └──→ FAILED
          ↓ retry
       PROCESSING
```

A `CONFIRMED` event requires an external reference. A provider/reference pair may confirm only one payout.

### `initiate_investment_payout()`

Requires:

- `finance.manage`;
- an `APPROVED` withdrawal;
- a still-covered participant balance after other reservations;
- an exact match with the participant's frozen payout destination.

It creates the payout document, writes `PROCESSING`, and moves the withdrawal to `PAYMENT_PROCESSING`. No ledger debit exists yet.

Idempotent retries reuse the same payout. After a `FAILED` event, the same document may return to `PROCESSING`.

### `confirm_investment_payout()`

Requires the latest event to be `PROCESSING`, locks the payout and withdrawal, re-checks participant balance, then atomically:

```text
write CONFIRMED provider event
→ withdrawal = PAID
→ WITHDRAWAL_DEBIT = -payout amount
→ audit log
```

The debit cannot exist before the confirmation event because the ledger guard checks it independently.

### `fail_investment_payout()`

Writes a `FAILED` event and returns the withdrawal to `APPROVED` for retry. It does **not** debit the ledger.

The legacy `mark_withdrawal_paid()` pathway is disabled.

## Reconciliation read models

`get_investment_inbound_reconciliation()` compares:

```text
order capital
↔ authoritative receipt
↔ allocation
↔ FUNDING_RECEIVED
↔ CAPITAL_COMMITTED
```

`get_investment_payout_reconciliation()` compares:

```text
withdrawal amount/status
↔ payout document
↔ latest provider event
↔ WITHDRAWAL_DEBIT
```

`get_investment_money_rail_health()` exposes explicit mismatch counters for operational health checks:

- allocated orders without receipt;
- receipt/funding-ledger mismatches;
- paid withdrawals without confirmed payout;
- confirmed payout/ledger mismatches.

## Admin OS

### Inbound

`/inversion/admin/orders` no longer offers generic payment approval. Finance must record:

- provider/bank;
- external reference;
- provider settlement timestamp.

The order amount and participant-reported rail are fixed by the source order.

### Outbound

`/admin/finance/rails` manages:

- withdrawal approval;
- payout initiation;
- provider confirmation;
- payout failure/retry;
- reconciliation state.

## Participant OS

`/dashboard/inversion` exposes:

- spendable settled balance;
- masked payout-destination registration;
- withdrawal requests;
- withdrawal/payout lifecycle history.

The UI explicitly warns users not to enter full bank-account credentials.

## Non-goals

This phase does not integrate a specific bank/PSE/Bre-B/crypto API. Provider calls remain external/manual until a future connector-specific implementation exists. The database contract is designed so a future webhook or provider adapter can call the same authoritative reconciliation functions rather than redesigning the ledger model.
