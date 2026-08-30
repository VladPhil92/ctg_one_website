# Wallet Intent V1 creation boundary

This change operationalizes only the first durable transaction-engine state: `created`.

The authenticated wallet client sends a reviewed Polygon crypto-send request to `POST /api/wallet/intents`. The route derives the canonical CTG user from the authenticated request, rate-limits the caller and invokes a service-role-only RPC. Browser roles retain no direct write permission on `wallet_intents_v2`.

The stored immutable request includes the idempotency key, Polygon chain ID, asset symbol, positive base-unit amount and destination EVM address. Reusing an idempotency key with the identical payload replays the existing intent. Reusing it with a different payload fails closed.

This boundary does **not** authorize, sign, broadcast, register a transaction hash, reconcile, post journal entries or mutate a balance. `journalPosting` and `moneyMovement` remain disabled. The next lifecycle state requires a separately reviewed authorization/signing boundary.
