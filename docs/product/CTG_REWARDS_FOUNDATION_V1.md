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

Append-only audit history reserved for future approved commercial rules. The schema can represent positive `earn` records, operator `adjustment` records, or negative `reversal` records, but Foundation v1 exposes no mutation path that can create them.

No `redeem`, `transfer`, `cashback`, `token`, or fiat transaction type exists in Foundation v1.

`created_by` is retained as an immutable UUID snapshot rather than a foreign key to `profiles`; deleting an identity therefore cannot rewrite historical ledger rows.

## Security boundary

Authenticated users receive `SELECT` only and RLS restricts reads to `(select auth.uid()) = user_id`.

`anon`, `authenticated`, and `service_role` receive no direct INSERT, UPDATE, or DELETE privilege on Rewards tables in Foundation v1. There is deliberately no public Rewards mutation RPC in this phase.

Automatic creation of an empty Rewards account is performed only by the profile-insert trigger `private.rewards_create_account_for_profile()`. That trigger function lives in the non-exposed `private` schema, uses narrowly scoped `SECURITY DEFINER` authority, and has EXECUTE revoked from application roles.

The authenticated account read endpoint uses the normal CTG One user JWT through `createAuthenticatedRequestContext`; it does not use the admin/service-role client.

## Accounting and future mutation policy

Foundation v1 creates account and ledger structures but no commercial mutation boundary. This is intentional: no server process should be able to award points before earning economics, eligibility, anti-abuse rules, reversals, and redemption accounting have been approved.

A future activation migration must introduce the canonical atomic write boundary together with idempotency, reconciliation, and end-to-end tests. That future boundary must not depend on direct table mutation privileges from application code.

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
4. an approved atomic server-side mutation boundary with idempotency and reconciliation;
5. end-to-end tests for earn, reversal, redemption and idempotency;
6. production evidence that balances reconcile to the immutable ledger;
7. updated user-facing terms and privacy disclosures;
8. explicit decision on whether cross-business utility remains off-chain or interoperates with CTGO.

Until those gates are met, Foundation v1 remains infrastructure, not an active Rewards program.
