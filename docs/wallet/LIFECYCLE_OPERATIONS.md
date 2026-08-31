# CTG One Wallet — Canonical Correlation & Stuck-State Operations V1

## Purpose

This phase adds a protected operational health view across the canonical Polygon `crypto_send` lifecycle without creating another financial authority.

It deliberately complements migration 0090 rather than duplicating it:

- migration 0090 and the existing reconciliation worker own durable alerts after a transaction hash has been submitted;
- the operations-health layer adds visibility for `authorized` intents before submission, surfaces open durable alerts, and includes recent terminal failures;
- neither layer can sign, broadcast, synthesize chain evidence, mutate balances, or post to the COP journal.

## Two correlation identifiers, two different jobs

Migration 0090 creates `operational_correlation_id`, an opaque PostgreSQL UUID. It is the durable server-side identifier stored with operational alerts.

For client-to-server diagnostics, CTG One also derives a non-reversible `intent_fingerprint` from the canonical intent UUID:

1. trim and lowercase the UUID;
2. SHA-256 hash the normalized UUID;
3. retain the first 16 hexadecimal characters.

CTG Wallet computes the same fingerprint locally before emitting lifecycle telemetry. The raw intent UUID is never attached to client telemetry or protected operational logs.

The server may log both `intent_fingerprint` and the opaque `wallet_correlation_id`; neither grants authentication, idempotency, signing, settlement, or reconciliation authority.

## Operational sources

`GET /api/internal/wallet/operations-health` combines three bounded, read-only sources:

1. `wallet_intents_v2` rows still in `authorized` status;
2. open durable alerts from `wallet_chain_operational_alerts_v1` created by migration 0090 / the reconciliation worker;
3. recent terminal `failed` Polygon intents for operator review.

The endpoint does not independently recreate post-submit alerts. The durable alerts remain canonical for `submitted`, `pending_external`, and `confirmed_external` stuck-state persistence.

Default operational policy:

- `authorized` without submission for 10 minutes -> warning;
- `submission_stuck` durable alert -> critical;
- `reconciliation_stuck` durable alert -> warning;
- `confirmation_stuck` durable alert -> critical;
- recent terminal chain failure within 24 hours -> warning.

The authorized threshold and failed lookback are server configuration only and bounded between five minutes and 24 hours.

## Broadcast-before-submit boundary

A server-side `authorized` row does not prove that the client never broadcast. There is an unavoidable boundary after the wallet provider returns a transaction hash and before `/submit` successfully registers it with CTG One.

CTG Wallet therefore persists the exact returned hash locally before attempting submission. If client telemetry shows a successful `broadcast` for the same 16-character fingerprint while CTG One still reports `authorized`, operators must treat this as possible registration loss.

Recovery after a hash exists is **registration-only recovery** using that exact persisted hash. The client and operators must never rebroadcast because an alert fired, telemetry is missing, an API response was lost, or CTG One still shows `authorized`.

## Protected endpoint

The operations-health endpoint is scheduler-only and reuses `WALLET_CHAIN_RECONCILIATION_WORKER_SECRET`:

- secret minimum length: 32 characters;
- timing-safe comparison;
- no browser CORS surface;
- service-role reads only;
- bounded samples;
- no database writes or RPC mutations;
- no signer/provider access;
- no transaction broadcast.

The scheduled worker runs at minute 5, 15, 25, 35, 45 and 55, offset from the existing reconciliation worker. It prints aggregate health only. Warning severity remains visible without failing the run; critical severity fails the run so stuck states cannot remain silent.

## Privacy boundary

The operational read model intentionally excludes canonical user IDs, authentication tokens, wallet addresses, destination addresses, transaction hashes, amounts, balances, simulation digests, reconciliation evidence digests, private keys, seeds and signing payloads.

Per-intent logs use the deterministic fingerprint and, where a durable alert exists, the opaque server correlation UUID. GitHub Actions output remains aggregate-only.

## Safety gates

This phase does not activate money movement. General CTG Wallet builds remain fail-closed:

- `VITE_CANONICAL_WALLET_CANARY_BUILD=false`
- `VITE_CANONICAL_WALLET_BROADCAST_ENABLED=false`

CTG One must keep `WALLET_CRYPTO_SEND_EXECUTION_MODE=disabled` except during an explicitly controlled canary procedure. An operational warning or critical alert never authorizes changing these gates.

## Operator procedure

When an alert appears:

1. use the 16-character `intent_fingerprint` to correlate CTG Wallet telemetry and CTG One protected logs;
2. use `wallet_correlation_id` for durable server alert history when present;
3. verify the canonical server status and the last successful client lifecycle stage;
4. for `authorized`, determine whether the client stopped before broadcast or whether local recovery contains an already-broadcast hash;
5. if a hash already exists, perform registration-only recovery with the same hash;
6. for post-submit alerts, let the existing trusted reconciliation worker remain the sole chain-observation authority;
7. never invent or rewrite a hash, synthesize confirmations, alter balances, or rebroadcast to clear an alert.

## Rollback

This supplemental layer is reversible without financial repair:

1. disable the lifecycle-operations scheduled workflow;
2. remove/rotate its worker credential if immediate fail-closed behavior is required;
3. revert the read-only health endpoint and deterministic fingerprint logging;
4. leave migration 0090 and the canonical reconciliation worker intact unless they are independently implicated in an incident;
5. keep public broadcast gates false.

## Exit criteria

This tranche is complete when:

- migration 0090 durable alerts are green in CI;
- the protected health endpoint remains bounded and read-only;
- `authorized` pre-submit ageing is visible;
- CTG Wallet and CTG One use the same SHA-256 16-character fingerprint for cross-runtime correlation;
- the reconciliation worker logs both safe correlation forms without raw intent IDs;
- static invariants, TypeScript and repository CI pass;
- no real-money broadcast or public-send gate is enabled.
