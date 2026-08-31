# CTG One Wallet — Polygon Canary Runbook

## Purpose

This runbook controls the first real Polygon crypto-send canary for the canonical CTG One Wallet lifecycle. It does not authorize a public launch.

Reviewed lifecycle:

`created -> authorized -> durable canary client binding -> execution revalidation -> Privy signature/broadcast -> submitted -> pending_external -> confirmed_external -> reconciled`

The client provenance binding and evidence system are audit controls only. They never sign, broadcast, derive balances or post COP journal entries.

## Server rollout controls

CTG One uses server-only environment variables:

```env
WALLET_CRYPTO_SEND_EXECUTION_MODE=disabled
WALLET_CRYPTO_SEND_CANARY_USER_IDS=
WALLET_CANARY_CLIENT_COMMIT_SHA=<reviewed-40-char-ctg-wallet-commit>
```

Allowed execution modes in this phase are intentionally limited to:

- `disabled` — default kill-switch; fresh execution-enabling authorization/revalidation is rejected.
- `canary` — authorization, provenance binding and execution revalidation succeed only for exact canonical Supabase user UUIDs in `WALLET_CRYPTO_SEND_CANARY_USER_IDS`.

There is deliberately no public execution mode in this phase.

`WALLET_CANARY_CLIENT_COMMIT_SHA` pins the exact reviewed CTG-Wallet commit that is allowed to enter the canary path. It is not a secret, but the reviewed expectation is server-controlled. A client cannot select a different commit and still pass preflight/binding.

## Preconditions

Before changing execution mode to `canary`, verify:

1. CTG One deployment includes migration `0089_wallet_canary_evidence_provenance` or a compatible later schema.
2. `SUPABASE_SERVICE_ROLE_KEY` is available only to server runtime.
3. Trusted Polygon RPC is HTTPS, healthy and reports chain id `137`.
4. `WALLET_POLYGON_MIN_CONFIRMATIONS` is explicitly reviewed; safe default is 12.
5. Canary CTG user has exactly one verified primary Privy embedded EVM account in canonical identity tables.
6. Canary wallet has only the minimal POL/assets needed for the test.
7. Reviewed CTG-Wallet artifact embeds its exact Git commit as `VITE_CTG_WALLET_BUILD_COMMIT`.
8. `WALLET_CANARY_CLIENT_COMMIT_SHA` exactly equals that reviewed client commit.
9. General staging, production web and signed mobile builds remain broadcast-disabled.

## Authenticated infrastructure/client preflight

Before enabling `canary`, the intended user calls:

`POST /api/wallet/canary/preflight`

with:

```json
{
  "version": "ctg-wallet-canary-preflight-v1",
  "clientCommitSha": "<embedded-ctg-wallet-commit>"
}
```

The server first verifies `clientCommitSha` against `WALLET_CANARY_CLIENT_COMMIT_SHA`; a different reviewed-build claim is rejected. The endpoint then evaluates only the authenticated canonical Supabase user and checks:

- runtime schema compatibility;
- canary allowlist membership;
- reviewed client commit;
- exactly one verified primary Privy embedded EVM account and verified identity link;
- Polygon RPC health and chain id 137;
- block/gas availability;
- non-zero native POL gas balance;
- reviewed minimum-confirmation policy.

The preflight is read-only. It cannot create/authorize an intent, bind provenance, sign, broadcast, register a hash or modify financial state.

With execution mode `disabled`, a prepared user can return `ready_for_activation`. After mode changes to `canary` and CTG One is redeployed, the same call must return `ready_for_canary_execution` before any real-broadcast artifact is used.

## Durable client provenance binding

Once a specific crypto-send intent is durably `authorized`, but **before any signer/provider access in the broadcast path**, the reviewed client calls:

`POST /api/wallet/intents/<intentId>/canary-client`

with:

```json
{
  "version": "ctg-wallet-canary-client-v1",
  "clientCommitSha": "<embedded-ctg-wallet-commit>"
}
```

The server:

1. authenticates the canonical owner;
2. verifies the supplied commit exactly matches `WALLET_CANARY_CLIENT_COMMIT_SHA`;
3. re-checks the current execution kill-switch and canary-user allowlist;
4. locks the owned intent;
5. requires status `authorized`, Polygon chain 137, trusted authorization evidence and **no tx hash/submission/settlement state**;
6. writes `canary_client_commit_sha` and `canary_client_bound_at` exactly once;
7. permits idempotent replay only for the same commit;
8. rejects a different commit with `WALLET_CANARY_CLIENT_COMMIT_CONFLICT`.

The binding RPC can modify only the provenance metadata for a bindable authorized intent. It cannot sign, broadcast, choose destination/amount, register a transaction hash or settle funds.

After successful binding, the client still performs the existing execution revalidation immediately before the signer boundary. This preserves the last-moment kill-switch.

## Reconciliation observation journal

Migration 0089 creates `wallet_chain_reconciliation_observations_v1`.

Every effective trusted reconciliation update appends a server-derived observation containing:

- intent and owner scope;
- exact transaction hash;
- observation status;
- server evidence digest;
- whether the chain transaction was observed;
- block number;
- confirmations;
- failure code, when applicable;
- trusted check timestamp.

The journal is append-only for ordinary application/service roles. Direct update/delete/truncate is revoked. Duplicate `(intent, evidence digest)` observations are ignored idempotently.

This preserves the observation progression instead of losing earlier states when the current `wallet_intents_v2` row advances.

## Canonical evidence bundle

The authenticated owner retrieves:

`GET /api/wallet/intents/<intentId>/evidence`

No client-build header is accepted or required by this endpoint. Client provenance is read only from the durable fields already bound to the intent:

- `canary_client_commit_sha`
- `canary_client_bound_at`

If durable provenance is absent, the route fails closed with `WALLET_CANARY_EVIDENCE_CLIENT_PROVENANCE_MISSING`.

The response version is `ctg-wallet-canary-evidence-v1` and contains only sanitized audit data:

- CTG One deployment/schema metadata;
- durable CTG-Wallet repository, commit and binding timestamp;
- intent id/status, asset, base-unit amount and destination;
- authorization timestamp and server simulation digest;
- exact submitted transaction hash/timestamp when present;
- latest trusted reconciliation state;
- ordered append-only observation progression;
- terminal state;
- `bundleDigestSha256`.

It intentionally omits canonical user id, stored authorized signer address, access tokens, Privy identity records, private keys, seed phrases, service-role credentials and KYC data.

`bundleDigestSha256` is calculated over the deterministic canonical payload, including the durable client commit **and `boundAt`**, plus the complete ordered reconciliation observation progression. `generatedAt` is added only after hashing and is not part of the digest.

The evidence route is read-only: no `.insert`, `.update`, `.delete`, mutation RPC, reconciliation side effect, signing or broadcast.

## Activation sequence

1. Keep `WALLET_CRYPTO_SEND_EXECUTION_MODE=disabled`.
2. Configure only the reviewed canonical user in `WALLET_CRYPTO_SEND_CANARY_USER_IDS`.
3. Configure `WALLET_CANARY_CLIENT_COMMIT_SHA` to the exact reviewed CTG-Wallet commit.
4. Redeploy CTG One.
5. Require authenticated preflight `ready_for_activation`.
6. Set execution mode to `canary` without changing allowlist or reviewed commit.
7. Redeploy CTG One.
8. Require authenticated preflight `ready_for_canary_execution` from that exact client build.
9. Build/use only the protected CTG-Wallet canary artifact for the same commit.
10. Prepare and authorize exactly one minimal-value intent.
11. Require successful durable `/canary-client` binding before signer access.
12. Require execution revalidation immediately before signer access.
13. Execute exactly one approved minimal-value Polygon send.
14. Register the exact returned hash once/idempotently.
15. Reconcile until terminal and capture the final evidence bundle/digest.

## Canary success criteria

A canary is green only when all are true:

1. non-allowlisted user cannot create fresh execution authority, bind client provenance or pass execution revalidation;
2. wrong/unreviewed client commit cannot pass preflight or provenance binding;
3. reviewed commit is durably bound to the authorized intent before signer access;
4. exactly one Polygon transaction is broadcast;
5. exact returned hash is persisted before server registration;
6. `/submit` binds that same hash idempotently;
7. `/reconcile` derives truth from trusted Polygon RPC without client-supplied outcome;
8. append-only journal preserves confirmation/observation progression;
9. lifecycle reaches `reconciled` or an explainable fail-closed `failed` state;
10. retries never create a second broadcast;
11. canonical history agrees with final server state;
12. final evidence bundle reproduces the durable client provenance and ordered observations and its digest validates.

## Rollback

At any unexpected behavior, restore:

```env
WALLET_CRYPTO_SEND_EXECUTION_MODE=disabled
```

and redeploy CTG One. Stop distribution/use of the canary client artifact.

Do **not** disable `/submit`, `/reconcile` or read-only `/evidence`: already-broadcast transactions must remain recoverable and observable.

Public production enablement is a later reviewed phase and requires successful canary evidence plus explicit operational approval.
