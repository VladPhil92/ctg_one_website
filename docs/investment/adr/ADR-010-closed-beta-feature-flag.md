# ADR-010: Closed-Beta Feature Flags

## Status
Accepted

## Decision
`/inversion` ships behind conservative, explicit feature flags rather than
an environment-wide "is this live" boolean:

```
CTG_INVESTMENT_PUBLIC_REGISTRATION_ENABLED=false
CTG_INVESTMENT_PUBLIC_FUNDING_ENABLED=false
CTG_INVESTMENT_PAYMENT_GATEWAY_ENABLED=false
CTG_INVESTMENT_AUTOMATIC_SETTLEMENT_ENABLED=false
CTG_INVESTMENT_AUTOMATIC_WITHDRAWALS_ENABLED=false
CTG_INVESTMENT_KYC_PROVIDER_ENABLED=false
CTG_INVESTMENT_WHATSAPP_NOTIFICATIONS_ENABLED=false
```

Read server-side via a single `src/lib/investment/flags.ts`, defaulting every
flag to `false` when unset (fail closed) so a missing env var never
accidentally opens public funding. The `/inversion` route tree itself is
always reachable (it's marketing/demo content in MVP 0/1); it's the
money-moving actions gated behind these flags.

## Consequences
Turning on real public funding later is a config change once the business
and legal decisions in `BUSINESS_MODEL.md` (§Pending Business Decisions) are
actually resolved — not a code deploy.
