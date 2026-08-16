# CTG One User Dashboard OS

## Purpose

`/dashboard` is the authenticated user's primary hub across CTG One. It is not a wallet screen and it must not imply that roadmap capabilities are already available.

## Current live surfaces

- Identity and profile from `profiles`.
- KYC status and submission flow.
- Operational account balance from `wallets`.
- Account deposits and recent `transactions` under RLS.
- CTG Craft Beer Investment participant dashboard.
- CTG Knowledge pilot for authenticated users.

## Roadmap surfaces

- CTG Rewards.
- Web3 wallet / CTGO functionality.
- Cross-business documents, notifications and permissions.

Roadmap modules can be discoverable from the dashboard but must remain explicitly labeled and must not be represented as productive functionality.

## Design principle

One identity, multiple products.

The dashboard should progressively become the personal surface of CTG One OS, connecting identity, permissions, activity, investments, knowledge and future benefits without collapsing security boundaries between systems.

## Financial separation

The CTG One operational wallet and CTG Craft Beer Investment ledger are separate financial contexts. The dashboard may summarize both, but it must not merge balances or imply that they are interchangeable.

Web3 wallets are also separate from both contexts and remain roadmap-only until there is verifiable on-chain utility.

## Data rules

- All authenticated reads remain scoped by Supabase RLS.
- The dashboard does not receive service-role credentials.
- Investment values are read through existing participant-safe hooks/RPCs.
- Account transactions are read from `transactions` for the authenticated user's own `user_id`.
- No write path for balances, settlements, withdrawals or ledger entries is introduced by this dashboard redesign.
