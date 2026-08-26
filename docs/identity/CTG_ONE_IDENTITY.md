# CTG One Unified Identity

Phase 0 architecture reference for the CTG One unified-identity
initiative. The decision record is
`docs/identity/adr/ADR-001-unified-identity-for-nvet-care.md` — read
that first for the reasoning; this document is the target-state map and
phased plan. Threats are covered separately in `THREAT_MODEL.md`.

**Status:** Accepted with narrowed scope (product owner, 2026-08-26) —
see `ADR-001` §Status. Ships as **"Continuar con mi cuenta CTG One,"** an
additional, optional login button on `/nvetcareapp/iniciar-sesion` —
not a forced migration. No existing Nvet user is affected, no feature
flag is needed, and Phases 5-7 below (account linking, legacy-login
deprecation, rollout cutover) are deferred indefinitely — revisit only
once there's a real, measured population of users with both a
`ctgone.com` account and an independent Nvet password already set.
No code, schema, or configuration has been changed yet — that starts at
Phase 1.

## The pattern, already proven once

```
                     Supabase Auth (auth.users)
                              │
                    CTG One Identity (Supabase session)
                              │
              ┌───────────────┼──────────────────┐
              │                                    │
       ctgone.com core                      CTG Craft Beer
       profiles (id = auth.users.id)        Inversión
       (ADR-011, shipped)                   investment_participant_profiles
                                             (1:1 auth.users, lazy-created)
                                             (ADR-011, shipped)
```

Investment already validated this exact shape in production: reuse the
Supabase session for *identity*, keep a separate per-product profile
table for *domain data*, never conflate the two. `ADR-001` proposes
extending the same shape to Nvet Care — not inventing a new one.

## Target state

```
                     Supabase Auth (auth.users)
                              │
                    CTG One Identity (Supabase session)
                              │
      ┌────────────────┬──────┴───────────┬──────────────────┐
      │                │                  │                  │
ctgone.com core   Investment          Nvet Care         (future products)
profiles          investment_         User.ctgUserId
                  participant_        (nullable, unique,
                  profiles            additive FK — new)
                                            │
                                  ┌─────────┼─────────┐
                                  │         │         │
                               CLIENT      VET      ADMIN
                                        VetProfile
                                        (licensing, verification —
                                         unchanged, one layer below
                                         identity)
```

Nvet's `User` row remains a real table with real columns — this is not
"Nvet becomes a view over `auth.users`." `ctgUserId` is an optional
link, not a replacement identity. A Nvet `User` can exist unlinked
(today's status quo, and Phase 3's open question #3 in the ADR), and
once linked, `ctgUserId` — never email — is the permanent join key.

## Request flow (web)

```
Browser                Next.js BFF              Nvet Backend (NestJS)
   │                   (ctg_one_website)          (Nvet-Care-App)
   │                          │                          │
   │  1. Supabase session      │                          │
   │  already established      │                          │
   │  (AuthContext)             │                          │
   │                          │                          │
   │  2. GET /nvetcareapp ────►│                          │
   │                          │  3. no Nvet cookie,       │
   │                          │  Supabase session exists  │
   │                          │  ─────────────────────────►│
   │                          │  POST /auth/               │
   │                          │  ctg-identity-exchange     │
   │                          │  { supabaseAccessToken }   │
   │                          │                          │  4. verify JWKS,
   │                          │                          │     extract sub,
   │                          │                          │     find/provision
   │                          │                          │     User.ctgUserId
   │                          │  ◄─────────────────────────│
   │                          │  { accessToken,           │
   │                          │    refreshToken }          │
   │  ◄── httpOnly cookies ────│  (or TWO_FACTOR_REQUIRED)  │
   │  set (session.ts,                                     │
   │  ADR-002 — unchanged                                  │
   │  cookie shape)                                        │
```

Every step after "4" is exactly what `POST /auth/login` already does
today — the exchange endpoint is a new *front door* onto the same,
already-hardened session-issuance code, not a parallel system.

## Request flow (future mobile)

```
Android/iOS app
   │
   │  1. Authenticate with Supabase's own mobile SDK
   │     (no ctgone.com, no Next.js BFF involved)
   │
   │  2. POST https://api.nvetcare.../auth/ctg-identity-exchange
   │     { supabaseAccessToken }   ── same endpoint, called directly
   │
   │  3. { accessToken, refreshToken } ── same Nvet token pair the
   │     app already knows how to use (Nvet-Care-App/mobile's
   │     existing API client, unchanged)
```

No cookie-only design decision anywhere in this plan blocks native
clients — the exchange endpoint is a plain, stateless HTTP call from
day one.

## Phased implementation — accepted scope (Phases 0-4 only)

Each phase is its own PR. Phases 5-7 are **not scheduled** — see
"Deferred indefinitely" below.

| Phase | Deliverable | Repo(s) | Touches production? |
|---|---|---|---|
| 0 | This document + `ADR-001` + `THREAT_MODEL.md` | `ctg_one_website` | No |
| 1 | Additive migration: `User.ctgUserId` (nullable, unique), `User.passwordHash` nullable + null-safety audit of every path that assumes it | `Nvet-Care-App` | No (schema only, unused column) |
| 2 | JWKS verification service + `POST /auth/ctg-identity-exchange` + tests (valid/expired/wrong-issuer/wrong-audience/replay/disabled-profile) | `Nvet-Care-App` | No (new endpoint, not wired to any UI yet) |
| 3 | Provisioning-on-first-visit (transactional, race-safe) — new `CLIENT` accounts only; an email collision with an existing password-holding account returns a message pointing to the existing login, not a link attempt | `Nvet-Care-App` | No (still not called from the BFF) |
| 4 | Next.js BFF integration: adds "Continuar con mi cuenta CTG One" as a second button on `/nvetcareapp/iniciar-sesion`, alongside the untouched existing form. No feature flag needed — purely additive. | `ctg_one_website` | Yes — this is the actual ship. Existing users unaffected. |

### Deferred indefinitely (not scheduled — revisit only once real overlap justifies the cost)

| Phase | Deliverable | Why deferred |
|---|---|---|
| 5 | Explicit, authenticated account-linking flow for an existing Nvet user with a matching email | Highest-risk item in the whole design (see `THREAT_MODEL.md`); not worth building until there's a real population needing it |
| 6 | Legacy `/nvetcareapp/iniciar-sesion` form or `/auth/login` marked deprecated | Nothing in the accepted scope requires this — Nvet Care keeps working standalone, indefinitely, by design |
| 7 | Any rollout flag flip changing default behavior for existing users | No cutover moment exists in the accepted scope — there's nothing to flip |

## What this initiative explicitly does not do

- Does not touch `/inversion`, its KYC, ledger, settlement, or admin
  surfaces.
- Does not create a second Supabase project or duplicate `auth.users`.
- Does not revive the retired standalone `dashboard/` (Vite) or create
  a new subdomain — `ctgone.com/nvetcareapp` stays the only web
  platform (`Nvet-Care-App` PR #19, `ctg_one_website` PR #203).
- Does not remove `VetProfile`'s licensing/verification workflow or
  `UserSession`'s refresh-token theft detection — both stay exactly
  where they are (see `ADR-001` §Reconciling with ADR-002).
- Does not delete, disable, or deprecate the existing email/password
  login form or `/auth/register` — not scheduled, not planned, since
  the accepted scope is purely additive with no cutover moment.
