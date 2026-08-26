# CTG One Unified Identity

Phase 0 architecture reference for the CTG One unified-identity
initiative. The decision record is
`docs/identity/adr/ADR-001-unified-identity-for-nvet-care.md` — read
that first for the reasoning; this document is the target-state map and
phased plan. Threats are covered separately in `THREAT_MODEL.md`.

**Status:** Phase 0 (audit + design) complete as of this document.
No code, schema, or configuration has been changed by this initiative.
Every phase below requires its own PR and explicit sign-off before the
next begins, per `ADR-001`.

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

## Phased implementation (each phase = its own PR, per ADR-001 §Rollout)

| Phase | Deliverable | Repo(s) | Touches production? |
|---|---|---|---|
| 0 | This document + `ADR-001` + `THREAT_MODEL.md` | `ctg_one_website` | No |
| 1 | Additive migration: `User.ctgUserId` (nullable, unique), `User.passwordHash` nullable + null-safety audit of every path that assumes it | `Nvet-Care-App` | No (schema only, unused column) |
| 2 | JWKS verification service + `POST /auth/ctg-identity-exchange` + tests (valid/expired/wrong-issuer/wrong-audience/replay/disabled-profile) | `Nvet-Care-App` | No (new endpoint, not wired to any UI yet) |
| 3 | Provisioning-on-first-visit (transactional, race-safe) | `Nvet-Care-App` | No (still not called from the BFF) |
| 4 | Next.js BFF integration behind `NVET_UNIFIED_IDENTITY_ENABLED=false` by default | `ctg_one_website` | No (flagged off) |
| 5 | Explicit, authenticated account-linking flow (never auto-link by email) | Both | No (flagged off) |
| 6 | Legacy `/nvetcareapp/iniciar-sesion` + `/auth/login` marked deprecated (not removed) once flag is validated on in staging/canary | Both | Flag flip only, reversible |
| 7 | Production rollout: flag on, monitored, immediate rollback path documented in `docs/identity/IDENTITY_ROLLBACK.md` (to be written alongside Phase 7, not now) | Both | Yes, gated and reversible |

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
- Does not delete or disable legacy Nvet login before the new path is
  proven — the feature flag exists specifically so this is never an
  all-or-nothing cutover.
