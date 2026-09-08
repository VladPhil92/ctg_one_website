# CTG One Crowdfunding Settlement V1

## Decision

CTG One is the financial authority for VÉRTICE crowdfunding. VÉRTICE owns campaign discovery, civic compliance, milestones, evidence and impact. CTG Wallet remains the crypto execution/signing client. Neither VÉRTICE nor CTG Wallet becomes a second financial ledger.

## Supported V1 rails

- **Bold / COP**: closed-amount payment link created server-side by CTG One.
- **CTG Wallet / crypto**: Polygon (chain 137), USDC only in V1, using the existing canonical `wallet_intents_v2` lifecycle.

Additional assets/chains/providers require a separately reviewed allowlist change. V1 intentionally excludes equity, debt, revenue share, profit share, token sales, APY, staking and political campaign finance.

## Trust boundaries

1. VÉRTICE registers a campaign attestation over the existing service federation secret.
2. CTG One independently requires the campaign subject to have verified KYC.
3. Only `donation` and `reward` funding models are admitted.
4. Crypto treasury address is server-registered and immutable once set; a donor cannot choose or override it.
5. Crypto contributors must have a verified CTG One identity. The contribution creates the existing `crypto_send` wallet intent with the certified campaign treasury.
6. Bold receives a server-derived closed amount. Browser-supplied currency, provider reference and checkout URL are rejected by contract.
7. A Bold webhook is only an untrusted notification inbox item. It cannot settle a contribution.
8. The internal reconciler verifies the exact event against Bold's notification-query API before invoking the settlement RPC.
9. Crypto settlement can materialize only after the canonical wallet intent reaches `reconciled` with tx hash, block, confirmations and reconciliation digest.
10. Settlement stores a COP accounting valuation and valuation source/time. This is evidence for accounting/tax review, not a hard-coded tax conclusion.

## Endpoints

### VÉRTICE service federation

- `POST /api/federation/vertice/crowdfunding/campaigns`
- `POST /api/federation/vertice/crowdfunding/contributions`

Both require `x-ctg-federation-secret`, bounded JSON, strict keys and durable service rate limiting.

### Bold

- Public inbox: `POST /api/payments/bold/crowdfunding/events`
- Internal reconciliation: `POST /api/internal/crowdfunding/reconcile/bold`

The public endpoint deliberately does **not** call the settlement RPC.

## Required server configuration

```env
VERTICE_FEDERATION_SECRET=<high entropy shared service secret>
BOLD_CROWDFUNDING_ENABLED=false
BOLD_API_KEY=<server only>
BOLD_API_BASE_URL=https://integrations.api.bold.co
BOLD_CROWDFUNDING_CALLBACK_URL=https://vertice.ctgone.com/crowdfunding/payment-return
CROWDFUNDING_RECONCILIATION_SECRET=<independent high entropy worker secret>
```

Keep `BOLD_CROWDFUNDING_ENABLED=false` until the Bold merchant account, sandbox tests, webhook registration and provider certification are complete. No secret may use a `NEXT_PUBLIC_` prefix.

## Settlement states

`created -> pending_external/submitted -> settled`

Failure paths remain explicit: `failed`, `cancelled`, `expired`, `reversed`. A provider redirect, wallet UI state or VÉRTICE client response cannot independently produce `settled`.

## Accounting evidence

Every settlement records an `amount_cop_cents`, `valuation_source` and `valuation_observed_at`. Crypto evidence additionally includes transaction hash and block number, while the linked wallet intent retains chain confirmations and reconciliation digest. The final accounting and Colombian tax treatment must be approved by the responsible accountant/tax adviser before production certification.

## Reputation neutrality

There is no trigger, foreign key or RPC from these financial tables into civic reputation or ranking. Donation amount, payment rail, crypto value, subscription or campaign revenue must never buy civic influence.

## Production gates still manual

- Activate/configure Bold API credentials and complete Bold certification.
- Register the production Bold webhook URL.
- Configure the independent reconciliation worker secret and scheduler.
- Register certified crypto treasuries for eligible campaigns.
- Approve the accounting valuation source/process for crypto settlements.
- Complete legal/compliance review for KYC/KYB, AML/KYT thresholds, refunds, chargebacks and beneficiary payouts.

Until those gates are cleared, the code remains fail-closed rather than silently accepting real money.
