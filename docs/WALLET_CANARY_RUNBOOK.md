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
WALLET_CANARY_CLIENT_COMMIT=<reviewed-40-char-ctg-wallet-commit>
```

Allowed execution modes in this phase are intentionally limited to:

- `disabled` — default and kill-switch; new `created -> authorized` transitions and pre-broadcast execution revalidation are rejected.
- `canary` — new authorization and execution revalidation succeed only for exact canonical Supabase user UUIDs listed in `WALLET_CRYPTO_SEND_CANARY_USER_IDS`.

There is deliberately no `public` mode in Canary Readiness.

`WALLET_CRYPTO_SEND_CANARY_USER_IDS` is a comma-separated list of canonical `auth.users.id` UUIDs. It is server-only configuration and must never be exposed through `NEXT_PUBLIC_*`, `VITE_*`, browser logs, screenshots or client telemetry.

`WALLET_CANARY_CLIENT_COMMIT` is also server-only rollout configuration. It pins the exact reviewed CTG-Wallet Git commit that may produce an accepted canary evidence bundle. It is not a secret, but keeping the expectation server-side prevents a modified browser from choosing which client commit the server will certify.

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

1. Target CTG One deployment includes migration `0089_wallet_canary_evidence_provenance` or a compatible later schema.
2. `SUPABASE_SERVICE_ROLE_KEY` is available only to the server runtime.
3. The trusted Polygon RPC is HTTPS, returns chain id `137`, and is healthy.
4. `WALLET_POLYGON_MIN_CONFIRMATIONS` is explicitly reviewed; the safe default is 12.
5. The canary CTG user has exactly one verified primary Privy embedded EVM account in the canonical wallet identity tables.
6. The canary wallet has only the minimal amount of POL/assets needed for the test.
7. CTG-Wallet canary artifact was built from the reviewed commit with both canary and broadcast build gates enabled and embeds that exact commit as `VITE_CTG_WALLET_BUILD_COMMIT`.
8. `WALLET_CANARY_CLIENT_COMMIT` on CTG One exactly equals that reviewed client commit.
9. General staging, production web and signed mobile release workflows remain broadcast-disabled.

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
3. Configure `WALLET_CANARY_CLIENT_COMMIT` to the exact reviewed CTG-Wallet commit.
4. Redeploy and require authenticated preflight status `ready_for_activation`.
5. Set `WALLET_CRYPTO_SEND_EXECUTION_MODE=canary` without changing the allowlist or pinned client commit.
6. Redeploy and require authenticated preflight status `ready_for_canary_execution`.
7. Build the reviewed CTG-Wallet canary artifact from the same pinned client commit.
8. Execute exactly one minimal-value Polygon send and capture the evidence below.

Server activation values:

```env
WALLET_CRYPTO_SEND_EXECUTION_MODE=canary
WALLET_CRYPTO_SEND_CANARY_USER_IDS=<canonical-user-uuid>
WALLET_CANARY_CLIENT_COMMIT=<reviewed-ctg-wallet-commit>
```

A non-allowlisted authenticated user must remain unable to create a new authorization or pass execution revalidation, while read/overview, preflight and intent-creation endpoints remain healthy.

## Canary evidence

Record, without secrets or sensitive KYC data:

- CTG One deployment commit/schema version;
- exact server-verified CTG-Wallet canary commit;
- canonical intent id;
- asset, base-unit amount and destination used for the canary;
- server authorization timestamp and evidence digest;
- Polygon transaction hash;
- submission timestamp;
- first observed block and full confirmation/observation progression;
- terminal reconciliation status;
- any error codes and latency observations.

Never record access tokens, Privy secrets, private keys, seed phrases, service-role keys or full sensitive identity records.

### Canonical evidence bundle

After authorization, and again after submission/finality, the authenticated owner can request:

`GET /api/wallet/intents/<intentId>/evidence`

The reviewed CTG-Wallet client sends its public build provenance in:

`X-CTG-Wallet-Build-Commit: <40-char-git-commit>`

CTG One does not trust that assertion by itself. The route requires it to match the server-side `WALLET_CANARY_CLIENT_COMMIT` exactly. Missing server provenance fails with `503`; a missing/invalid client commit fails with `400`; a different valid commit fails with `409`. The server-certified commit, not arbitrary client input, is written into the evidence bundle and bound into its digest.

The response is `ctg-wallet-canary-evidence-v1`. It is generated entirely from CTG One's durable intent state, the append-only reconciliation observation journal and server-controlled deployment/schema/client-provenance metadata. The route is owner-scoped by the authenticated canonical user and is read-only: it never signs, broadcasts, reconciles, updates an intent or posts a financial journal entry.

Migration 0089 creates `wallet_chain_reconciliation_observations_v1`. Every effective trusted reconciliation update appends a new observation containing the server-derived status, checked timestamp, block, confirmations, failure code and evidence digest. Ordinary application roles cannot update/delete/truncate the journal. This preserves the observation progression instead of losing earlier confirmation states when `wallet_intents_v2` advances.

The bundle intentionally omits the canonical user id, stored signer address, access token, Privy identity records and all server secrets. It contains the reviewed canary fields required by this runbook: server deployment commit, verified client artifact commit, schema observation, intent id/status, asset, base-unit amount, destination, authorization timestamp/digest, exact submitted transaction hash, ordered reconciliation observations, latest reconciliation state and terminal status.

Each response also includes `bundleDigestSha256`, calculated over the deterministic canonical evidence payload — including `clientArtifact` and the ordered append-only observation progression — before the non-deterministic `generatedAt` field is added. Capture the terminal bundle and digest with the canary record. Re-requesting the bundle after chain state changes is expected to produce a different digest; re-requesting the same durable state on the same server/client deployment pair should reproduce the same digest.

## Success criteria

A canary is green only when:

1. a non-allowlisted user cannot create fresh authorization evidence or pass execution revalidation;
2. the allowlisted user can authorize and passes execution revalidation immediately before signing;
3. exactly one Polygon transaction is broadcast;
4. the exact returned hash is persisted before server registration;
5. `/submit` binds that same hash idempotently;
6. `/reconcile` derives evidence from trusted Polygon RPC without client-supplied chain outcome;
7. the append-only observation journal preserves the reconciliation/confirmation progression;
8. the lifecycle reaches `reconciled` or an explainable fail-closed `failed` state;
9. no second broadcast occurs during registration/reconciliation retries;
10. canonical history agrees with the final server lifecycle state;
11. the evidence endpoint rejects a CTG-Wallet build commit that differs from `WALLET_CANARY_CLIENT_COMMIT`;
12. the terminal authenticated evidence bundle is captured with its `bundleDigestSha256` and contains no secret/KYC material.

## Rollback

At any sign of unexpected behavior, set:

```env
WALLET_CRYPTO_SEND_EXECUTION_MODE=disabled
```

and redeploy CTG One. Also stop distributing/using the canary client artifact.

Do not disable `/submit`, `/reconcile` or the read-only `/evidence` route during rollback. Already-broadcast transactions must remain recoverable and observable.

Public production enablement is a later phase and requires a new reviewed rollout mode, explicit operational approval and successful canary evidence.
