# CTG One Wallet — Unification Architecture

Status: **FOUNDATION / FAIL-CLOSED**  
Tracker: #259  
Legacy Web3 client: `VladPhil92/CTG-Wallet`

## 1. Purpose

CTG One must expose one wallet product, not two independent wallets. The existing web platform and the legacy `CTG-Wallet` implementation solve different parts of the same problem:

- `ctg_one_website` already owns authenticated CTG identity, KYC, COP balance controls, reconciled payment evidence, Investment OS ledgers, payout controls and auditability.
- `CTG-Wallet` already owns substantial Web3 capability: Privy embedded wallets, EVM signing, Polygon assets, send/receive, swaps, CTG ecosystem contract reads, multi-chain portfolio concepts and a Capacitor mobile shell.

The target is therefore a **single logical CTG One Wallet** with multiple authoritative asset sources behind one user identity and one UX.

## 2. Canonical identity decision

The canonical CTG identity is:

```text
Supabase auth.users.id
        ↓
public.profiles.id
        ↓
CTG One user
```

A Privy user is an **external wallet identity attached to the CTG user**, not a second CTG account and not the primary application identity.

```text
CTG user (profiles.id)
  ├─ KYC / permissions / account state
  ├─ COP ledger
  ├─ Investment positions
  └─ external wallet identity
       └─ Privy user
            └─ embedded EVM wallet(s)
```

### Invariant

`profiles.id` must remain stable across the migration. A legacy Privy user and its existing embedded wallet must be linked to that identity rather than replaced by a newly-created wallet.

## 3. Source-of-truth matrix

| Domain | Authoritative source | Client role |
| --- | --- | --- |
| CTG user identity | Supabase Auth / `profiles.id` | Session presentation only |
| KYC | CTG One database | Read status only |
| COP available balance | CTG One money ledger / controlled balance projection | Display only |
| Bank/Bre-B deposits | Reconciled server-side receipts | Submit evidence/intent only |
| Investment ownership | Investment OS ledger | Display and initiate allowed actions |
| Blockchain balances | Chain state | Query/cache/display |
| Blockchain transaction finality | Chain state + CTG reconciliation record | Optimistic UX allowed, never authoritative |
| Privy embedded wallet | Privy/key infrastructure | Request signatures |
| Prices / portfolio valuation | Market-data derived read model | Display only |
| Zustand/localStorage | None | Ephemeral UX cache only |

A single wallet experience does **not** mean one physical datastore or one mutable `balance` field. It means one identity and one normalized wallet domain that respects the authority of each underlying rail.

## 4. Legacy CTG-Wallet capability disposition

### Keep and port

- Privy embedded-wallet integration.
- EVM signer acquisition.
- Polygon balance and token services.
- CTG / USDC / USDT / POL asset registry concepts.
- Send and receive flows.
- Portfolio and transaction presentation patterns.
- 0x swap integration, after server-side secret review.
- CTG Token / Rewards / Staking / Booking / Accounting contract reads.
- Ethereum and BNB concepts after Polygon is stable.
- Capacitor/mobile shell as a future client of the same backend.

### Retire as authority

- Privy as an independent CTG login system.
- `WalletUser.id = privyUser.id` as the application identity.
- Wallet-local KYC state.
- LocalStorage/Zustand transaction history as financial truth.
- Local PIN/biometric checks as sufficient money-movement authorization.
- Mock bank accounts and fallback financial records.
- Any provider secret that would be shipped in a browser bundle.

## 5. Target logical architecture

```text
                        CTG ONE IDENTITY
                     Supabase Auth + KYC
                              │
                        profiles.id
                              │
              ┌───────────────┴───────────────┐
              │                               │
        CTG FINANCIAL CORE              WALLET IDENTITY BRIDGE
       PostgreSQL / Supabase                    │
              │                                 └── Privy user
      ┌───────┼────────┐                            │
      │       │        │                      Embedded EVM wallet
     COP   Investment  Rails                         │
      │       │        │                      Polygon / EVM chains
      └───────┴────────┴──────────────┬──────────────┘
                                      │
                              UNIFIED WALLET DOMAIN
                                      │
                         Portfolio / History / Actions
```

## 6. Identity bridge data contract

The first database slice introduces two non-client-writable records:

1. `wallet_identity_links`: maps a canonical CTG user to a provider identity such as Privy.
2. `wallet_external_accounts`: records blockchain account addresses associated with the canonical user and, where applicable, the provider identity.

The browser may read its own records, but it cannot create, replace, verify or revoke them directly. Linking requires a trusted server boundary that independently verifies both sides of the relationship.

### Why provider identity and blockchain account are separate

A provider user can own more than one blockchain account over time. Likewise, a CTG user may later connect an external wallet. Conflating `privy_user_id` and an address would make wallet rotation, migration and multi-account support unsafe.

## 7. Legacy migration protocol

Before changing authentication behavior in production:

1. Export or otherwise enumerate the existing Privy user identifiers and embedded wallet addresses through an authorized operator process.
2. Match a legacy user to a canonical Supabase user only with deterministic evidence.
3. Create the identity link in `PENDING` state.
4. Prove control/association using the approved Privy custom-auth/account-linking flow.
5. Record the pre-existing wallet address with `legacy_preserved = true`.
6. Mark both link and account `VERIFIED` only after the identity and address match the legacy record.
7. Stop the migration for any duplicate, ambiguous or conflicting relationship.

### Stop conditions

Do not auto-resolve any of the following:

- one Privy user mapped to two CTG users;
- one blockchain address claimed by two CTG users;
- a Supabase login causing Privy to return a different wallet than the expected legacy address;
- missing evidence for a legacy-user match;
- a wallet address changing during account linking.

These cases require explicit operator review. No wallet should be replaced silently.

## 8. Security boundaries

### Client can

- read its own identity/account link state;
- request a wallet action;
- submit payment or blockchain evidence;
- request a signature from the wallet provider;
- cache non-authoritative read models.

### Client cannot

- link a Privy identity directly in SQL;
- verify a blockchain account directly in SQL;
- write COP balance;
- mark a bank or crypto payment reconciled;
- mark a chain transaction confirmed without independent verification;
- change KYC state;
- treat local app-lock success as server authorization.

## 9. Transaction model direction

Every material action should converge on an intent/reconciliation lifecycle:

```text
USER INTENT
   ↓
SERVER-SIDE AUTHORIZATION / VALIDATION
   ↓
EXTERNAL RAIL OR BLOCKCHAIN ACTION
   ↓
EXTERNAL REFERENCE / TX HASH
   ↓
INDEPENDENT RECONCILIATION
   ↓
AUTHORITATIVE LEDGER / POSITION UPDATE
   ↓
UNIFIED HISTORY READ MODEL
```

Optimistic UI is allowed, but an optimistic record must remain distinguishable from an authoritative settled fact.

## 10. Rollout sequence

### Phase 0 — foundation

- Architecture and invariants.
- Identity-link schema.
- Shared wallet domain types.
- CI invariant checks.

### Phase 1 — trusted identity linking

- Server route/action for identity linking.
- Supabase session validation.
- Privy custom-auth configuration.
- Legacy Privy account-link preservation tests.

### Phase 2 — wallet domain V2

- Account/journal model for internal monetary balances.
- Compatibility projection from the current `wallets` table.
- Wallet intents and normalized transaction references.

### Phase 3 — Polygon Web3 port

- Privy provider in Next.js.
- Read balances.
- Send/receive.
- Transaction intent + tx hash registration + confirmation reconciliation.
- CTG ecosystem reads.

### Phase 4 — unified portfolio/history

- COP, crypto and Investment positions in one surface.
- Normalized transaction timeline.
- Derived valuation clearly separated from authoritative units.

### Phase 5 — COP inbound rails

- Independent enablement of Bancolombia/Bre-B.
- Existing proof and independent reconciliation controls reused.
- PSE/cards remain optional, not a global enablement dependency.

### Phase 6 — Investment integration

- Position visibility.
- Reinvestment/payout workflow visibility.
- Existing release gate #219 remains authoritative for Investment LIVE status.

### Phase 7 — multi-chain

- Ethereum/BNB after Polygon maturity.
- Bitcoin remains watch-only until a separately approved signing/key-management design exists.

### Phase 8 — mobile convergence

The legacy `CTG-Wallet` repository becomes a mobile client of the same CTG One identity/backend rather than a second wallet product.

## 11. Release boundary

This unification work is technical infrastructure. It does not itself authorize:

- public stored-value custody;
- unrestricted user withdrawals;
- public investment fundraising;
- automated settlement or payouts;
- regulatory classification claims.

Investment release governance remains tracked separately in #219.
