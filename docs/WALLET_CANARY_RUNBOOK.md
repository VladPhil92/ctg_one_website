# CTG One Wallet — Polygon Canary Runbook

## Purpose

This runbook controls the first real Polygon crypto-send canary for the canonical CTG One Wallet lifecycle. It does not authorize a public launch.

Canonical lifecycle:

`created -> authorized -> execution revalidation -> Privy signature/broadcast -> submitted -> pending_external -> confirmed_external -> reconciled`

## Server rollout controls

CTG One uses server-only environment variables:

```env
WALLET_CRYPTO_SEND_EXECUTION_MODE=disabled
WALLET_CRYPTO_SEND_CANARY_USER_IDS=
```

Allowed execution modes in this phase are intentionally limited to:

- `disabled` — default and kill-switch; pre-broadcast execution revalidation is rejected.
- `canary` — execution revalidation succeeds only for exact canonical Supabase user UUIDs listed in `WALLET_CRYPTO_SEND_CANARY_USER_IDS`.

There is deliberately no `public` mode in Canary Readiness.

`WALLET_CRYPTO_SEND_CANARY_USER_IDS` is a comma-separated list of canonical `auth.users.id` UUIDs. It is server-only configuration and must never be exposed through `NEXT_PUBLIC_*`, `VITE_*`, browser logs, screenshots or client telemetry.

## Why the gate is on execution revalidation

Normal intent creation and trusted authorization remain available for non-money validation. Immediately before the reviewed CTG-Wallet client obtains a signer, it replays the durable authorization against:

`POST /api/wallet/intents/:intentId/authorize?execution=canary`

That request checks the current server kill-switch and canonical user allowlist. Disabling the rollout therefore blocks new official-client broadcasts at the last server checkpoint before signing.

Submission and reconciliation are intentionally not rollout-gated. If a transaction was already broadcast before the kill-switch closes, CTG One must still be able to register the exact hash and reconcile it to a terminal state.

## Preconditions

Before changing execution mode to `canary`, verify all of the following:

1. Target CTG One deployment includes migration `0088_wallet_chain_reconciliation_v1` or a compatible later schema.
2. `SUPABASE_SERVICE_ROLE_KEY` is available only to the server runtime.
3. The trusted Polygon RPC is HTTPS, returns chain id `137`, and is healthy.
4. `WALLET_POLYGON_MIN_CONFIRMATIONS` is explicitly reviewed; the safe default is 12.
5. The canary CTG user has exactly one verified primary Privy embedded EVM account in the canonical wallet identity tables.
6. The canary wallet has only the minimal amount of POL/assets needed for the test.
7. CTG-Wallet canary artifact was built from the reviewed commit with both canary and broadcast build gates enabled.
8. General staging, production web and signed mobile release workflows remain broadcast-disabled.

## Activation

Set:

```env
WALLET_CRYPTO_SEND_EXECUTION_MODE=canary
WALLET_CRYPTO_SEND_CANARY_USER_IDS=<canonical-user-uuid>
```

Redeploy CTG One and verify a non-allowlisted authenticated user receives a fail-closed execution revalidation response while normal read/overview endpoints remain healthy.

## Canary evidence

Record, without secrets or sensitive KYC data:

- CTG One deployment commit/schema version;
- CTG-Wallet canary commit;
- canonical intent id;
- asset, base-unit amount and destination used for the canary;
- server authorization timestamp and evidence digest;
- Polygon transaction hash;
- submission timestamp;
- first observed block and confirmation progression;
- terminal reconciliation status;
- any error codes and latency observations.

Never record access tokens, Privy secrets, private keys, seed phrases, service-role keys or full sensitive identity records.

## Success criteria

A canary is green only when:

1. a non-allowlisted user cannot pass execution revalidation;
2. the allowlisted user passes execution revalidation immediately before signing;
3. exactly one Polygon transaction is broadcast;
4. the exact returned hash is persisted before server registration;
5. `/submit` binds that same hash idempotently;
6. `/reconcile` derives evidence from trusted Polygon RPC without client-supplied chain outcome;
7. the lifecycle reaches `reconciled` or an explainable fail-closed `failed` state;
8. no second broadcast occurs during registration/reconciliation retries;
9. canonical history agrees with the final server lifecycle state.

## Rollback

At any sign of unexpected behavior, set:

```env
WALLET_CRYPTO_SEND_EXECUTION_MODE=disabled
```

and redeploy CTG One. Also stop distributing/using the canary client artifact.

Do not disable `/submit` or `/reconcile` during rollback. Already-broadcast transactions must remain recoverable and observable.

Public production enablement is a later phase and requires a new reviewed rollout mode, explicit operational approval and successful canary evidence.
