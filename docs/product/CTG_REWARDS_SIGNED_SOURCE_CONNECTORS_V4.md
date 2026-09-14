# CTG Rewards Signed Source Connectors & Reconciliation v4

## Purpose

Signed Source Connectors v4 moves CTG Rewards from manual SUPER_ADMIN replay to cryptographically authenticated source-system ingestion while preserving the Shadow Earning Engine boundary.

A source such as a CTG One operating unit may submit an event only through a registered connector whose Ed25519 public key, source domain, event allowlist and operational state are controlled by CTG One.

Every accepted event remains **shadow-only**. It may produce a hypothetical earning decision, but it does not create, reserve, transfer, redeem or settle Rewards points.

## Cryptographic trust boundary

CTG One stores only the source's Ed25519 public key. The source keeps the private key outside CTG One.

The canonical signed message is exactly:

```text
ctg-rewards-source-v1
<connectorCode>
<unixTimestampSeconds>
<nonce>
<sha256(rawBody)>
```

Required headers:

- `x-ctg-rewards-timestamp`: Unix timestamp in seconds;
- `x-ctg-rewards-nonce`: source-generated nonce, 16–128 allowed characters;
- `x-ctg-rewards-signature`: Base64 Ed25519 signature over the canonical message.

The signature covers the digest of the raw HTTP body rather than a re-serialized JSON representation. This prevents semantically equivalent but byte-different payloads from sharing signature evidence accidentally.

## Replay and retry model

A valid signed request reserves `(connector_id, nonce)` together with the signed timestamp and payload digest.

A repeated nonce is accepted only as an idempotent retry when both signed timestamp and payload digest are identical to the original reservation. Reusing the same nonce with different signed facts fails as `SOURCE_NONCE_PAYLOAD_CONFLICT`.

Event identity remains independently protected by the Shadow Engine's `(source_domain, external_event_id)` uniqueness rule. A retried delivery can therefore converge on the same shadow event and evaluation without creating duplicate hypothetical points.

## Connector lifecycle

A connector begins as `draft` with `ingestion_enabled = false`.

Validation requires:

1. a non-archived pilot unit;
2. a validated pilot unit before connector validation;
3. at least one event code in the allowlist;
4. a valid Ed25519 public key.

Enabling ingestion requires all of the above plus the global v3 shadow-processing kill switch to be open.

`ingestion_enabled` is only a source-ingestion switch. It is not a commercial earning flag.

Archiving a connector disables ingestion. Rotating its public key also disables ingestion automatically so the new key must be deliberately re-enabled after operational verification.

## Event allowlist

Every signed event must match an explicit per-connector event code. The allowlist cannot be changed while ingestion is enabled.

This prevents a validly signed source from introducing a new event semantic without CTG One governance.

## Original events and reversals

v4 accepts two source event kinds:

- `original`: carries `externalEventId`, `eventCode`, CTG One `subjectUserId`, `amountCents` and `occurredAt`;
- `reversal`: carries its own `externalEventId`, the same `eventCode`, `reversalOfExternalEventId` and `occurredAt`.

A reversal is linked to the canonical original shadow event. Existing v3 constraints still permit at most one reversal and at most one evaluation per source event.

Reversal evidence remains hypothetical. It does not debit a user Rewards account.

## Delivery evidence

`reward_source_delivery_attempts` records append-only operational evidence for signed requests, including:

- key fingerprint;
- payload digest;
- nonce and signed timestamp;
- event identifiers when parseable;
- accepted/retry/rejected outcome;
- HTTP status and bounded detail code;
- linked shadow event when accepted.

Raw source payloads and private keys are not stored in these evidence rows.

## Reconciliation

A SUPER_ADMIN can reconcile a bounded source export window against CTG One shadow evidence.

The source provides:

- window start/end;
- SHA-256 digest of the source export;
- declared original-event count;
- declared reversal count;
- declared original amount in cents.

CTG One derives observed event counts, observed original amount, delivery attempts and hypothetical eligible points from its own shadow records. The immutable reconciliation run is classified as `matched` only when original count, reversal count and amount deltas are all zero.

Reconciliation does not settle points and does not prove accounting treatment by itself.

## Authority boundary

Connector creation, lifecycle changes, key rotation, allowlist management and reconciliation require a signed-in CTG One user with both:

- `profiles.role = admin`;
- `investment_participant_profiles.investment_role = SUPER_ADMIN`.

The public source endpoint does not trust browser authentication. Its authority is the registered Ed25519 key plus timestamp/nonce/replay controls.

Browser roles receive no direct table privileges over connector, nonce, delivery or reconciliation tables.

## Product truth

v4 does **not** activate commercial Rewards earning.

It does not:

- update `reward_accounts`;
- insert `reward_ledger_entries`;
- create cashback;
- enable redemption or transfer;
- assign a COP value to points;
- convert points to CTGO;
- make a source event financially binding.

An `eligible` evaluation still means only: **under the current validated shadow rule, this event would have produced this many points**.

## Promotion gate: Closed Earning Canary v5

A later phase may propose a narrowly scoped real earning canary only after signed-source evidence demonstrates, for an explicitly approved source and event contract:

1. repeated reconciliation windows with zero source-vs-shadow count and amount deltas;
2. zero unresolved idempotency divergence;
3. successful key-rotation and kill-switch drills;
4. reversal parity between source and shadow evidence;
5. bounded invalid-signature/replay operational rates;
6. accounting ownership of the loyalty liability;
7. approved user terms, eligibility and privacy disclosures;
8. a ledger-posting boundary with exactly-once credit/reversal semantics;
9. a global and per-source emergency stop;
10. production reconciliation from source event through ledger entry.

Even v5 must remain separate from redemption and CTGO interoperability decisions.
