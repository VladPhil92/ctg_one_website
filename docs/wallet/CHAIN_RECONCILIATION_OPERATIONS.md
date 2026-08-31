# CTG One Wallet — Chain Reconciliation Operations V1

## Purpose

Wallet Chain Reconciliation V1 must keep progressing after a user closes CTG-Wallet. The canonical blockchain state cannot depend on the browser remaining online.

The operational worker therefore scans only durable Polygon intents already in one of these states:

- `submitted`
- `pending_external`
- `confirmed_external`

It never creates an intent, authorizes a signer, signs a transaction, broadcasts a transaction, changes COP balances or posts COP journal entries.

## Canonical execution path

Both interactive reconciliation and worker reconciliation use the same server-only function:

`reconcileWalletChainIntentV1()`

That function delegates transaction inspection to `inspectPolygonWalletIntentV1()` and persists the result only through the existing service-role RPC `record_wallet_chain_reconciliation_v1_server()` introduced by migration 0088.

The worker cannot submit a user-selected hash, confirmation count, receipt, signer, calldata or outcome. Those facts are read independently from Polygon.

## Scheduler

GitHub Actions invokes:

`POST https://ctgone.com/api/internal/wallet/reconcile-pending`

approximately every 10 minutes.

The request body is fixed to:

```json
{"version":"ctg-wallet-chain-worker-v1"}
```

A production invocation is enabled only when the exact same secret, at least 32 characters long, has been configured in both locations:

1. Render environment variable `WALLET_CHAIN_RECONCILIATION_WORKER_SECRET` for the `ctg-one-website` service.
2. GitHub Actions repository secret `WALLET_CHAIN_RECONCILIATION_WORKER_SECRET` for `VladPhil92/ctg_one_website`.

If either side is missing, the system fails closed. The GitHub scheduler exits without invoking production when its secret is absent; the website returns `503 WALLET_CHAIN_WORKER_NOT_CONFIGURED` when its secret is absent.

## Bounded workload

The default batch is 10 intents and the hard maximum is 25 per invocation. The optional server variable `WALLET_CHAIN_WORKER_BATCH_SIZE` may set a value from 1 to 25.

The worker processes intents sequentially to avoid an RPC burst and to stay below the per-user reconciliation rate boundary already enforced by PostgreSQL.

## Stuck-hash observability

An intent is considered operationally stuck when it remains non-terminal for at least 15 minutes after `submitted_at`. This is an observability threshold, not a financial-state transition.

The optional server variable `WALLET_CHAIN_STUCK_AFTER_SECONDS` may set the threshold between 300 seconds and 86,400 seconds.

Structured telemetry emits:

- `wallet.chain.worker.intent_observed`
- `wallet.chain.worker.stuck_intent`
- `wallet.chain.worker.intent_failed`
- `wallet.chain.worker.completed`

No transaction hash, access token, worker secret or canonical user ID is written to these events. Intents are represented by a short SHA-256 fingerprint.

The worker response contains only aggregate operational counts, the oldest submitted age, error-code counts, duration and the request correlation ID.

## Rollout sequence

1. Merge and deploy this operations slice with the worker secret unset.
2. Verify `/api/health` reports the exact merged commit and the production schema remains aligned to migration 0088.
3. Confirm `POLYGON_RPC_URL` is valid and production-safe.
4. Generate a high-entropy worker secret and set the exact same value in Render and GitHub Actions.
5. Manually dispatch **Wallet Chain Reconciliation Worker** once with no submitted intents and verify a zero-work `200` response.
6. Execute the controlled CTG-Wallet Polygon canary tracked in `VladPhil92/CTG-Wallet#27`.
7. Verify the same transaction hash progresses through registration and server-side reconciliation even if the client stops calling `/reconcile`.
8. Review stuck-hash and error telemetry before considering any broader broadcast rollout.

`VITE_CANONICAL_WALLET_BROADCAST_ENABLED` remains `false` until the controlled canary is reviewed.

## Incident / rollback

The safest operational rollback does not require a database rollback:

1. Remove or rotate the GitHub Actions worker secret to stop scheduled invocations immediately.
2. Keep `/submit` and the user-triggered `/reconcile` contract intact; migration 0088 remains authoritative and immutable.
3. If Polygon RPC health is suspect, unset or replace `POLYGON_RPC_URL`; trusted reconciliation then fails closed without declaring finality.
4. Do not alter `wallet_intents_v2` manually and do not rewrite transaction hashes.
5. Investigate using request IDs, intent fingerprints, status age and bounded error codes.
6. Resume the scheduler only after the cause is understood.

Disabling the worker does not reverse a broadcast transaction and does not change blockchain truth. It only pauses CTG One's independent observation of pending hashes.

## Security invariants

- The internal worker route has no browser CORS contract and no authenticated-user fallback.
- Worker authentication uses a constant-time comparison of a dedicated secret.
- The scheduler cannot choose intent IDs or transaction outcomes.
- The worker cannot access a signer, private key, `eth_sendTransaction` or `eth_sendRawTransaction`.
- COP ledger posting and balance mutation remain outside the chain reconciliation service.
- Terminal `reconciled` / `failed` states are not selected by the worker.
- User-triggered terminal replay semantics remain preserved by the shared service.
