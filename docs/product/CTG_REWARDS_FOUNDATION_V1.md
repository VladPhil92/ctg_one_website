# CTG Rewards Foundation v1

## Purpose

CTG Rewards Foundation v1 creates the technical substrate for a future cross-ecosystem loyalty program without pretending that the commercial program is already live.

The phase establishes one off-chain Rewards account per CTG One identity, an immutable points ledger, ownership-scoped authenticated reads, and a dedicated Personal OS surface.

## Product truth

Foundation v1 **does not activate**:

- earning rules;
- cashback;
- redemption;
- referrals;
- transfers between users;
- conversion to CTGO or any blockchain asset;
- a COP or fiat value for points;
- retroactive rewards for historic activity.

A Rewards account existing with `0 pts` is infrastructure state, not a marketing promise.

## Domain model

### `reward_accounts`

One row per CTG One profile. It stores only aggregate non-monetary points state and lifecycle status.

The default account status is `foundation`, deliberately different from `active` so schema deployment cannot silently promote the commercial product.

### `reward_ledger_entries`

Append-only audit history. Entries can be positive `earn` records, operator `adjustment` records, or negative `reversal` records. Existing rows cannot be updated or deleted; corrections are represented by new compensating entries.

No `redeem`, `transfer`, `cashback`, `token`, or fiat transaction type exists in Foundation v1.

## Security boundary

Authenticated users receive `SELECT` only and RLS restricts reads to `(select auth.uid()) = user_id`.

Authenticated/anonymous roles receive no mutation privileges. The canonical atomic ledger RPC is `SECURITY INVOKER`, executable only by `service_role`, and Foundation v1 exposes no HTTP route that calls it.

The authenticated account read endpoint uses the normal CTG One user JWT through `createAuthenticatedRequestContext`; it does not use the admin/service-role client.

## Idempotency and accounting

`apply_reward_ledger_entry` serializes on the user's account row, rechecks its unique idempotency key under the lock, prevents negative balances, updates account aggregates, and appends the immutable ledger entry in one database transaction.

This write boundary exists for future approved integrations. It is not an active earning rule.

## UX contract

`/dashboard/rewards` shows only verified account state and recorded ledger entries. It explicitly states that points are not money, are not CTGO, are not transferable, and cannot currently be redeemed.

`/rewards` remains the public source of product maturity truth. It may describe Foundation v1 as infrastructure in development, but must not advertise an active loyalty campaign.

## Activation policy

Rewards Foundation is visible inside the ecosystem but does **not** participate in Personal OS next-best-action ranking while earning/redemption rules are inactive. A user should not be pushed into an unavailable commercial loop.

## Promotion gate

Moving CTG Rewards from `DEVELOPMENT` to a stronger public maturity requires, at minimum:

1. approved earning economics for at least one real operating business;
2. published eligibility and anti-abuse rules;
3. approved redemption economics and accounting treatment;
4. end-to-end tests for earn, reversal, redemption and idempotency;
5. production evidence that balances reconcile to the immutable ledger;
6. updated user-facing terms and privacy disclosures;
7. explicit decision on whether cross-business utility remains off-chain or interoperates with CTGO.

Until those gates are met, Foundation v1 remains infrastructure, not an active Rewards program.
