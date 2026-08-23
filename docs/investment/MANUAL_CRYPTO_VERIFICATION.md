# Manual Crypto Verification — CTG Craft Beer Investment

Status: current operating policy implemented by migration `0069_investment_manual_crypto_verification.sql`.

This is the second **manual** inbound rail, added alongside manual Bancolombia.
It is the deliberate policy change reserved by
`MANUAL_BANK_VERIFICATION.md` §Future provider integration.

## Principle

Like the bank rail, this depends on no payment provider, custody service,
exchange API or automated confirmation. The participant transfers on-chain to
the configured destination wallet, and Finance independently confirms the
movement on a public block explorer before any funding fact exists.

Crypto qualifies as a manual rail for one specific reason: the movement is
independently checkable by CTG without a commercial relationship with anyone.
That is what PSE lacks, and why PSE remains unbuilt.

```text
Investment order
  ↓
Destination wallet shown to participant
  ↓
On-chain transfer
  ↓
Private payment-proof upload
  ↓
PENDING_BANK_VERIFICATION
  ↓
Finance independently checks the public block explorer
  ↓
Human confirmation of the real received movement
  ↓
Authoritative payment receipt
  ↓
Funding allocation + ledger
  ↓
Contract activation
```

## Authority hierarchy

```text
Transaction independently observed on the public explorer
  > human Finance verification stored by CTG One
  > participant payment proof
  > OCR / AI extraction or fraud hints
```

No OCR, image classifier, LLM, document parser, chain indexer or other
automated analysis may call the investment approval command.

## Why there is no `PENDING_CRYPTO_VERIFICATION` status

`PENDING_BANK_VERIFICATION` is the *stage* "participant evidence submitted,
awaiting independent human Finance verification". It is rail-agnostic in
meaning and retained under its historical name. The rail is discriminated by
`investment_orders.payment_method`, which `reconcile_investment_order_payment()`
already validates against the receipt rail.

A second status for the same stage would have forked the reserved-capacity
state list — `('AWAITING_PAYMENT','PENDING_BANK_VERIFICATION',
'PAYMENT_SUBMITTED','PAYMENT_VERIFIED')` — across every public-availability,
admin, operations-intelligence and participant-liquidity read model, each of
which would then have to be kept in sync forever.

## Wallet configuration

The application expects the approved destination through:

```text
NEXT_PUBLIC_INVESTMENT_CRYPTO_NETWORK
NEXT_PUBLIC_INVESTMENT_CRYPTO_ASSET
NEXT_PUBLIC_INVESTMENT_CRYPTO_ADDRESS
```

The source repository deliberately does not invent or embed wallet addresses.
Until all three are configured, checkout does not offer the crypto rail at all
and continues to present the single Bancolombia rail it has today.

## Proof upload controls

`POST /api/investment/orders/[orderId]/payment-proof` is shared with the bank
rail and keeps every control documented in `MANUAL_BANK_VERIFICATION.md`
(pre-body authentication, 8 MB streamed limit, allow-listed MIME with file
signature match, server-computed SHA-256, private bucket, service-role-only
persistence). The rail is declared through the `X-Payment-Rail` request header
and dispatches to `submit_investment_order_crypto_proof_server()`, which is
executable only by `service_role`.

`investment_orders.payment_proof_sha256` remains globally unique across both
rails, so the same evidence file cannot finance two orders. As on the bank
rail, this is a duplicate/reuse control — not proof of authenticity.

## Human verification command

`verify_investment_crypto_transfer()` requires `finance.manage` and accepts:

- order ID;
- transaction hash independently observed on the explorer;
- network on which it was observed;
- exact amount actually received;
- on-chain confirmation date/time;
- optional audit note.

The database requires:

- order state = `PENDING_BANK_VERIFICATION`;
- participant proof exists;
- `payment_method = 'crypto'`;
- received amount = exact order capital requirement;
- transaction hash has not already been used;
- KYC and all existing allocation/money-rail guards still pass.

Transaction hashes are canonicalized to uppercase alphanumerics before
storage, and uniqueness is enforced on that same normalized representation
within the `CRYPTO_MANUAL` provider namespace. Uppercasing a case-sensitive
(base58) signature can only merge two distinct references, never split one, so
the control stays fail-closed: it can block a legitimate order, never admit a
duplicate.

The function moves the order through the internal `PAYMENT_SUBMITTED` state and
delegates to the existing authoritative Payment Rail. The receipt trigger
permits `CRYPTO_MANUAL` only when the same current Finance actor has already
recorded the independent on-chain verification in that transaction, and only
for a `crypto` rail receipt with an observed network recorded.

## Amount semantics

Orders are priced in integer COP cents. Finance enters the COP value actually
received, which must equal the exact order capital requirement. Converting an
on-chain amount to COP is an operational judgement made by Finance at
verification time; the system stores what Finance attests to receiving, and
records the transaction hash and network so the attestation stays auditable
against the public chain.

There is no automated exchange-rate source, and adding one would be a new
policy decision — not a bug fix.

## Rejection

`reject_investment_bank_proof()` is shared by both rails: it moves a
proof-submitted order to `REJECTED` without creating a payment receipt,
allocation, funding ledger entry or contract activation. Its audit entry
records the order's `payment_method`, so a rejected crypto claim is
unambiguous in the log despite the function's historical name.

## Operational health

`get_manual_crypto_verification_health()` mirrors the Bancolombia counters for
the crypto rail: pending verifications, allocations missing human verification,
allocations missing a receipt, allocations missing an observed network, and
duplicated normalized transaction hashes.

## What is deliberately not here

- No exchange, custody provider, wallet-as-a-service or bridge integration.
- No automated chain indexer, webhook or confirmation listener.
- No automatic COP conversion.
- No refund/return path for a wrong-asset or wrong-network transfer. Checkout
  warns the participant that such a transfer cannot be verified or returned.

Any of those would be a new provider integration and falls back under the
deliberate ADR-010 brake, exactly like `paymentGatewayEnabled`.
