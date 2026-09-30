# Wallet Crypto Address Pool Operations V1

## Purpose

Address Pool Operations V1 is the operational control plane for claimant-specific crypto receiving addresses used by CTG One direct crypto top-ups.

It does **not** create, derive, store, or custody private keys. CTG One accepts only public receiving addresses plus non-secret provenance metadata (`derivation_reference` and `source_fingerprint`). Seeds, xprv values and private keys must remain outside CTG One.

## Fail-closed lifecycle

1. A SUPER_ADMIN imports a batch of public receiving addresses.
2. Every imported address starts as `available + pending`.
3. Pending addresses are never eligible for quote assignment.
4. An operator validates each address against the external custody/provider record and supplies a validation reference.
5. The asset/network rail remains disabled until at least the configured minimum number of validated addresses is available (default: 5).
6. Enabling a rail permits only `available + validated` addresses to be leased.
7. Leasing changes the address to `assigned`; application code never recycles assigned addresses.
8. If the rail is disabled, no validated address is available, or any precondition fails, quote creation falls back to the existing shared operator address and manual reconciliation.

## Supported rails

- BTC — Bitcoin
- ETH — Ethereum (ERC20)
- BNB — BNB Smart Chain (BEP20)
- USDT — BNB Smart Chain (BEP20)
- USDC — BNB Smart Chain (BEP20)

The USDC rail intentionally remains BSC-only in this phase because the current on-chain validator is configured for BSC USDC.

## Administrative boundary

The Admin OS surface is `/admin/finance/crypto-address-pool` and requires both the global admin role and `SUPER_ADMIN` investment role.

The route creates the service-role Supabase client only after normal-user authorization succeeds. Operational RPCs are `SECURITY INVOKER`, executable by `service_role` only, with `anon` and `authenticated` execution revoked.

## Operational hardening V1.1

Migration `0159_wallet_crypto_address_pool_operational_hardening_v1_1` hardens the original V1 control plane without changing its custody model:

- quote allocation locks the asset/network control row with `FOR SHARE`, while administrative enable/disable uses `FOR UPDATE`; a disable operation therefore serializes against an in-flight claimant-specific allocation instead of reporting completion before the lease commits;
- the Admin OS snapshot is paginated (`100` addresses by default, maximum `200`) and returns `addressTotal`, `addressOffset`, `addressLimit` and `hasMore`, so addresses beyond the first page remain inspectable and operable;
- failed batch provisioning preserves the operator's pasted input so it can be corrected and retried safely;
- a dedicated CI contract freezes the locking, privilege, pagination, batch-preservation and schema-authority invariants.

The paginated snapshot remains server-only. Its RPC is executable by `service_role`; direct `anon` and `authenticated` execution is revoked.

## Activation checklist

Before enabling automatic assignment for any rail:

- import real public addresses from the approved custody/provider source;
- verify address/network compatibility;
- verify derivation/provider provenance outside CTG One;
- validate each address in Admin OS with a traceable reference;
- maintain at least the configured ready-address minimum;
- confirm quote and on-chain validation provider configuration for that rail;
- enable only the intended asset/network control;
- observe first production assignments and settlement evidence before broad use.

## Schema authority

Address Pool Operations V1 is logical migration `0158`, production remote version `20260930135346`, following `0157_public_read_model_browser_execution_revocation` (`20260930134358`).

Operational hardening V1.1 is logical migration `0159`, production remote version `20260930151850`. The repository-wide runtime authority is therefore `0159` with `158` database migrations, matching Supabase production.
