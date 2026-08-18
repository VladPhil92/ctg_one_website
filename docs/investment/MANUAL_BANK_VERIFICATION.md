# Manual Bancolombia Verification — CTG Craft Beer Investment

Status: current production operating policy introduced by migration `0037_manual_bancolombia_bank_verification.sql`.

## Principle

The current investment operation does not depend on a paid banking API, PSE integration or payment gateway. Participants transfer directly using the approved Bancolombia savings-account QR.

A payment proof is **evidence submitted by the participant**, not proof that CTG received funds.

```text
Investment order
  ↓
Bancolombia QR shown to participant
  ↓
Participant transfer
  ↓
Private payment-proof upload
  ↓
PENDING_BANK_VERIFICATION
  ↓
Finance independently checks Bancolombia
  ↓
Human confirmation of real credit
  ↓
Authoritative payment receipt
  ↓
Funding allocation + ledger
  ↓
Contract activation
```

## Authority hierarchy

```text
Movement independently observed in Bancolombia
  > human Finance verification stored by CTG One
  > participant payment proof
  > OCR / AI extraction or fraud hints
```

No OCR, image classifier, LLM, document parser or other automated analysis may call the investment approval command.

## QR configuration

The application expects the approved public QR asset through:

```text
NEXT_PUBLIC_INVESTMENT_BANCOLOMBIA_QR_URL
```

The source repository deliberately does not invent or embed banking account numbers. Until the approved QR asset URL is configured, the investment payment UI remains fail-closed after order creation.

## Proof upload controls

`POST /api/investment/orders/[orderId]/payment-proof`:

- requires the authenticated participant session;
- confirms the order belongs to that participant and is `AWAITING_PAYMENT`;
- accepts only JPEG, PNG, WEBP or PDF;
- enforces an 8 MB maximum;
- computes SHA-256 on the server, not in the browser;
- stores the proof in the private `payment-proofs` bucket;
- passes the server-computed digest into `submit_investment_order_bank_proof()`.

`investment_orders.payment_proof_sha256` has a unique index, so the exact same file cannot finance two orders.

This does not prove authenticity. A forged file that has never been seen before can still have a unique hash.

## Human verification command

`verify_investment_bancolombia_transfer()` requires `finance.manage` and accepts:

- order ID;
- Bancolombia reference independently observed by Finance;
- exact amount actually credited;
- bank credit date/time;
- optional audit note.

The database requires:

- order state = `PENDING_BANK_VERIFICATION`;
- participant proof exists;
- payment rail = `bank_transfer`;
- credited amount = exact order capital requirement;
- Bancolombia reference has not already been used;
- KYC and all existing allocation/money-rail guards still pass.

The function temporarily moves the order through the internal `PAYMENT_SUBMITTED` state and delegates to the existing authoritative Payment Rail. The receipt trigger only permits `BANCOLOMBIA_MANUAL` when the same current Finance actor has already recorded the independent bank verification in that transaction.

Therefore provider reconciliation, a proof upload, OCR or an AI worker cannot independently create `FUNDING_RECEIVED`.

## Contract activation

On successful reconciliation the order receives:

```text
contract_reference
contract_activated_at
```

This is the operational contract-activation record. It occurs in the same transaction after authoritative receipt/allocation/ledger creation succeeds. It is not a substitute for the eventual versioned legal-document/PDF layer.

## Rejection

`reject_investment_bank_proof()` requires `finance.manage` and moves a proof-submitted order to `REJECTED` without creating:

- payment receipt;
- allocation;
- funding ledger entries;
- contract activation.

## Future AI assistance

Future proof analysis may extract or flag:

- displayed amount;
- displayed date/time;
- apparent bank/reference;
- exact-file duplicates;
- visual near-duplicates;
- inconsistencies or possible manipulation.

The result must remain advisory, e.g. `analysis complete — pending bank verification`. It must never become a payment-confirmation source.

## Future provider integration

The provider-neutral engine in `0034–0036` is retained for a future authenticated bank/payment-provider integration. During the present operating mode, inbound authoritative receipts are constrained to manual Bancolombia verification. A later migration may deliberately change that policy only after a real provider, authentication/signature rules and operational controls are available.
