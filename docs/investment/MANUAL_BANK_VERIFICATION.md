# Manual Bancolombia Verification — CTG Craft Beer Investment

Status: current operating policy implemented by migrations `0037_manual_bancolombia_bank_verification.sql`, `0038_payment_proof_server_trust_boundary.sql` and `0039_manual_bank_reference_normalization.sql`.

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

- authenticates the participant and confirms order ownership **before consuming the upload body**;
- receives the file as a raw body rather than multipart `FormData`;
- rejects `Content-Length` above 8 MB when provided and independently enforces the same limit while streaming the request body;
- accepts only JPEG, PNG, WEBP or PDF;
- verifies that the actual file signature matches the declared MIME type;
- computes SHA-256 on the Next.js server, never from a digest supplied by the browser;
- after session/ownership verification, uses the server-only service-role client only for the approved private upload and proof-persistence RPC;
- stores the proof in the private `payment-proofs` bucket;
- persists the server-computed digest through `submit_investment_order_bank_proof_server()`.

Migration `0038` revokes the browser-executable proof-persistence RPC from `authenticated`. `submit_investment_order_bank_proof_server()` is executable only by `service_role`, preventing a participant from fabricating a SHA-256 value through a direct Supabase RPC call.

`investment_orders.payment_proof_sha256` has a unique index, so the exact same file cannot finance two orders. Concurrent identical submissions use a deterministic storage path; cleanup never deletes a proof that another successful request has already made authoritative on the order.

This does not prove authenticity. A forged file that has never been seen before can still have a unique hash. The hash is a duplicate/reuse control, not a bank-confirmation mechanism.

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

Migration `0039` canonicalizes Finance-entered bank references to uppercase alphanumerics before storage and enforces uniqueness on the same normalized representation. Variants such as `ABC-123`, `abc123` and `ABC 123` therefore cannot be used to fund different orders from the same observed bank movement.

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

The provider-neutral engine in `0034–0036` is retained for a future authenticated bank/payment-provider integration. A later migration may deliberately change that policy only after a real provider, authentication/signature rules and operational controls are available.

Migration `0069` made the first such deliberate change, and it did **not** add a provider: it added a second *manual* rail with the same evidence chain and the same human-verification authority hierarchy — see `MANUAL_CRYPTO_VERIFICATION.md`. Inbound authoritative receipts are now constrained to manual Bancolombia **or** manual crypto verification; everything else still fails closed in `guard_investment_payment_receipt()`.
