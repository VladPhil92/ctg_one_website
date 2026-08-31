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

- `disabled` — default and kill-switch; new `created -> authorized` transitions and pre-broadcast execution revalidation are rejected.
- `canary` — new authorization and execution revalidation succeed only for exact canonical Supabase user UUIDs listed in `WALLET_CRYPTO_SEND_CANARY_USER_IDS`.

There is deliberately no `public` mode in Canary Readiness.

`WALLET_CRYPTO_SEND_CANARY_USER_IDS` is a comma-separated list of canonical `auth.users.id` UUIDs. It is server-only configuration and must never be exposed through `NEXT_PUBLIC_*`, `VITE_*`, browser logs, screenshots or client telemetry.

## Non-bypassable authorization gate

The rollout gate is not optional client metadata. Every first `created -> authorized` transition checks the server execution mode and canonical-user allowlist even when the caller omits the `execution` query parameter. This prevents an older or modified client from creating fresh execution-enabling authorization evidence outside the canary.

Durable `authorized` replays remain available because they create no new authorization evidence. This is necessary for idempotent lost-response recovery. A replay requested specifically as `?execution=canary` checks the current rollout gate again before the reviewed client may continue toward signing.

Intent creation, read-only client preflight and other non-signing validation remain usable while execution mode is disabled, but a new intent cannot cross into `authorized` outside the canary gate.

## Why there is a second gate on execution revalidation

Immediately before the reviewed CTG-Wallet client obtains a signer, it replays the durable authorization against:

`POST /api/wallet/intents/:intentId/authorize?execution=canary`

That request checks the current server kill-switch and canonical user allowlist again. Disabling the rollout therefore blocks the official client at the last server checkpoint before signing even when an authorization had been issued earlier during an active canary window.

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

## Authenticated preflight

Before enabling `canary`, the intended canary user must call:

`POST /api/wallet/canary/preflight`

with body:

```json
{ "version": "ctg-wallet-canary-preflight-v1" }
```

The endpoint is authenticated and evaluates only the canonical Supabase user represented by the caller's access token. It does not accept another user id, transaction amount, destination, intent id or transaction hash from the browser.

The preflight performs read-only checks for:

- runtime schema compatibility;
- whether the authenticated canonical user is present in the server-only canary allowlist;
- exactly one verified primary Privy embedded EVM account and verified Privy identity link;
- trusted Polygon RPC health and chain id `137`;
- current Polygon block availability and gas-price availability;
- a non-zero native POL balance for gas;
- the reviewed minimum-confirmation policy.

It never creates or authorizes an intent, signs a message/transaction, broadcasts a transaction, registers a hash or mutates COP/crypto balances.

With `WALLET_CRYPTO_SEND_EXECUTION_MODE=disabled`, a fully prepared user returns `ready_for_activation`. Only then should the operator switch the server mode to `canary` and redeploy. After redeploy, the same authenticated preflight must return `ready_for_canary_execution` before a canary artifact is used.

## Activation

The safe activation order is:

1. Keep `WALLET_CRYPTO_SEND_EXECUTION_MODE=disabled`.
2. Configure only the reviewed canonical user UUID in `WALLET_CRYPTO_SEND_CANARY_USER_IDS`.
3. Redeploy and require authenticated preflight status `ready_for_activation`.
4. Set `WALLET_CRYPTO_SEND_EXECUTION_MODE=canary` without changing the allowlist.
5. Redeploy and require authenticated preflight status `ready_for_canary_execution`.
6. Build the reviewed CTG-Wallet canary artifact from the pinned client commit.
7. Execute exactly one minimal-value Polygon send and capture the evidence below.

Server activation values:

```env
WALLET_CRYPTO_SEND_EXECUTION_MODE=canary
WALLET_CRYPTO_SEND_CANARY_USER_IDS=<canonical-user-uuid>
```

A non-allowlisted authenticated user must remain unable to create a new authorization or pass execution revalidation, while read/overview, preflight and intent-creation endpoints remain healthy.

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

### Canonical evidence bundle

After authorization, and again after submission/finality, the authenticated owner can request:

`GET /api/wallet/intents/<intentId>/evidence`

The response is `ctg-wallet-canary-evidence-v1`. It is generated entirely from CTG One's durable intent state plus deployment/schema metadata. The route is owner-scoped by the authenticated canonical user and is read-only: it never signs, broadcasts, reconciles, updates an intent or posts a financial journal entry.

The bundle intentionally omits the canonical user id, stored signer address, access token, Privy identity records and all server secrets. It contains the reviewed canary fields required by this runbook: deployment commit, schema observation, intent id/status, asset, base-unit amount, destination, authorization timestamp/digest, exact submitted transaction hash, reconciliation timestamps/block/confirmations/digest/failure and terminal state.

Each response also includes `bundleDigestSha256`, calculated over the deterministic canonical evidence payload before the non-deterministic `generatedAt` field is added. Capture the terminal bundle and digest with the canary record. Re-requesting the bundle after chain state changes is expected to produce a different digest; re-requesting the same durable state on the same deployment should reproduce the same digest.

## Success criteria

A canary is green only when:

1. a non-allowlisted user cannot create fresh authorization evidence or pass execution revalidation;
2. the allowlisted user can authorize and passes execution revalidation immediately before signing;
3. exactly one Polygon transaction is broadcast;
4. the exact returned hash is persisted before server registration;
5. `/submit` binds that same hash idempotently;
6. `/reconcile` derives evidence from trusted Polygon RPC without client-supplied chain outcome;
7. the lifecycle reaches `reconciled` or an explainable fail-closed `failed` state;
8. no second broadcast occurs during registration/reconciliation retries;
9. canonical history agrees with the final server lifecycle state;
10. the terminal authenticated evidence bundle is captured with its `bundleDigestSha256` and contains no secret/KYC material.

## Rollback

At any sign of unexpected behavior, set:

```env
WALLET_CRYPTO_SEND_EXECUTION_MODE=disabled
```

and redeploy CTG One. Also stop distributing/using the canary client artifact.

Do not disable `/submit` or `/reconcile` during rollback. Already-broadcast transactions must remain recoverable and observable.

Public production enablement is a later phase and requires a new reviewed rollout mode, explicit operational approval and successful canary evidence.
