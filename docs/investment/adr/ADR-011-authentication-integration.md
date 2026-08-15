# ADR-011: Authentication Integration

## Status
Accepted

## Context
Section 55 of the product brief requires inspecting existing auth first and
only building an isolated auth boundary if the existing one is not
appropriate. `ctgone.com` already has a working Supabase Auth system
(`AuthContext`, `/registro`, `/iniciar-sesion`, `middleware.ts`,
`profiles` table with `kyc_status`) shipped and merged.

## Decision
CTG Craft Beer Inversión reuses the existing Supabase Auth session and the
existing `AuthContext` for identity (a signed-in user is the same person
whether they're using CTG One deposits or CTG Craft Beer Inversión). It does
**not** reuse the existing `profiles.kyc_status`/`wallets`/`transactions` for
investment purposes — those belong to the unrelated deposits feature and mix
their semantics with investment KYC/ledger would violate the isolation
principle (ADR-000) and the domain separation in `DOMAIN_MODEL.md`.

A participant gets a separate `investment_participant_profiles` row
(1:1 with `auth.users`, created on first visit to `/inversion/app` or on
first allocation, not automatically for every CTG One user) holding
investment-specific KYC status, bank info, and agreement acceptance.

`src/middleware.ts` is extended (additively — new `if` branch, no existing
branch altered) to also protect `/inversion/app/*` (session required) and
`/inversion/admin/*` (investment admin role required — see
`SECURITY_MODEL.md` for how that role differs from the existing
`profiles.role`).

## Consequences
One login for the whole site (good UX — a participant doesn't create two
accounts). Investment KYC/role state is tracked separately from CTG One
deposits KYC/role state, which is intentional: being verified for CTG One
deposits does not imply being verified for Craft Beer Inversión, and vice
versa — they are different regulated activities.
