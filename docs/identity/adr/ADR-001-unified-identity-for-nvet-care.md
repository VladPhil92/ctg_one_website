# ADR-001: CTG One Unified Identity — Nvet Care Integration

## Status
**Accepted, with the scope narrowed further than the original proposal**
(product owner, 2026-08-26). This ADR reopens and partially revises
`docs/nvetcareapp/adr/ADR-002-authentication-strategy.md`. No code,
schema, or config in either repo has been changed by this ADR — that
starts at Phase 1.

**The accepted scope is "Sign in with CTG One" as an additional,
optional login method — not a forced migration.** Rationale, in plain
terms: today, almost nobody is simultaneously a `ctgone.com` user and a
Nvet Care user — Nvet Care is still early, and `ctgone.com`'s accounts
are mostly investment-KYC participants. Forcing a full identity merge
(mandatory account linking, deprecating legacy login, migrating
existing Nvet users) pays a real engineering and security cost — see
`THREAT_MODEL.md`'s account-linking/takeover section — to solve a
problem that barely exists yet at this stage. A visitor who lands on
Nvet Care directly (the common case — most people arrive searching for
a vet, not from `ctgone.com`) also shouldn't be asked to understand a
"CTG One" umbrella brand just to book an appointment.

What ships instead: `/nvetcareapp/iniciar-sesion` gets a **second,
additional** button — "Continuar con mi cuenta CTG One" — next to the
existing email/password form, not replacing it. Someone who already has
a `ctgone.com` session gets a Nvet account with one click (no form to
fill). Someone who doesn't, or who prefers not to, uses the existing
flow exactly as it works today. **No existing Nvet user is required to
do anything.**

Deferred **indefinitely**, not scheduled — revisit only once there's a
real, measured population of users who have both a `ctgone.com` account
and an independent Nvet account with a password already set (the actual
condition that would make forced linking or legacy-login deprecation
worth their cost):
- Explicit account-linking flow for an *existing* Nvet user with a
  matching email (originally Phase 5) — until it ships, that edge case
  simply doesn't resolve: clicking "Continuar con mi cuenta CTG One"
  when a Nvet account with the same email already has a password
  returns a clear message pointing back to the existing login, not an
  auto-link and not a dead end.
- Deprecating `/auth/login` or the existing email/password form
  (originally Phase 6).
- Any production rollout flag flip that changes *default* behavior for
  existing users (originally Phase 7) — this feature is additive from
  day one, so there is no cutover moment to gate.

## Context

### What exists today, verified against the real repos (not assumed)

**`ctgone.com` (repo `ctg_one_website`)**: Supabase Auth is the
identity provider for the site. `src/contexts/AuthContext.tsx` calls
`supabase.auth.getUser()` to bootstrap validated identity (not the
locally cached session) and exposes `userId`/`email`/`profile`.
`supabase/migrations/0001_init.sql` defines `public.profiles` with
`id uuid primary key references auth.users (id) on delete cascade` —
one row per Supabase user, auto-created by `handle_new_user()`, `role`
and `kyc_status` never client-writable. `src/proxy.ts` delegates to
`src/lib/supabase/middleware.ts`'s `updateSession()`, which protects
`/dashboard`, `/admin`, `/knowledge`, `/inversion/app`,
`/inversion/admin` by checking `supabase.auth.getUser()` and, for admin
routes, `profiles.role`.

**CTG Craft Beer Inversión already solved this exact problem** —
`docs/investment/adr/ADR-011-authentication-integration.md`: Investment
reuses the existing Supabase session/`AuthContext` for identity (`a
participant is the same person whether they're using CTG One deposits
or CTG Craft Beer Inversión`), but does **not** reuse `profiles` for
investment data — it gets its own `investment_participant_profiles`
row, 1:1 with `auth.users`, created lazily on first visit to
`/inversion/app` or first allocation, holding investment-specific KYC,
bank info, and agreement acceptance. `middleware.ts` was extended
additively (new `if` branch) rather than rewritten. This is a proven,
production pattern — it is the direct precedent for what this ADR
proposes for Nvet Care.

**Nvet Care (repo `Nvet-Care-App`, `backend/`)** made the *opposite*
choice, deliberately — `docs/nvetcareapp/adr/ADR-002-authentication-strategy.md`:
the NestJS backend already had (and still has) a complete, independent
identity system:
- `User` model (`backend/prisma/schema.prisma`): own `id` (UUID,
  unrelated to `auth.users`), `passwordHash` (`NOT NULL` today),
  email verification (hashed token + expiry), TOTP 2FA
  (`twoFactorSecret` encrypted AES-256-GCM, `recoveryCodesHash` —
  Argon2), brute-force lockout (`failedLoginAttempts`/`lockedUntil`),
  account lifecycle (`isActive`/`deactivatedAt`).
- `UserSession` model: refresh-token rotation with **theft detection** —
  `previousTokenHashes` stores prior rotation hashes; if a client
  presents a hash matching a *previous* (not current) token, every
  session for that user is revoked and a CRITICAL audit event fires.
- `VetProfile` model: real professional-licensing data with no Supabase
  equivalent — unique `licenseNumber`, unique `comvezcolNumber`,
  `universityName`, `graduationYear`, a `verificationStatus` enum, and a
  `VerificationDocument` model backing a manual document-review queue.
- `JwtStrategy` (`backend/src/auth/strategies/jwt.strategy.ts`) verifies
  against the backend's own `JWT_SECRET` (HMAC), re-fetches the `User`
  row on every request (fresh `isActive`/`emailVerified`), and
  invalidates tokens issued before a subsequent password change
  (`passwordChangedAt` vs. `iat`).
- The `ctgone.com` side already built the *correct* BFF security
  pattern around this independent backend — `src/lib/nvetcareapp/session.ts`:
  tokens are `httpOnly`/`secure`/`sameSite=lax` cookies (not
  `localStorage`, unlike the retired standalone `dashboard/`), refresh
  is proxied server-to-server, and the JWT's signature is never trusted
  client-side (`decodeJwtExpiryMs` is explicitly documented as
  UX-only — the real check is NestJS's `JwtAuthGuard` on every call).

ADR-002's stated reasoning for keeping these separate: *"a ctgone.com
visitor and a licensed veterinarian are not 'the same person' in the
way a CTG One depositor and an investment participant are"* and
*"[unifying] would mean re-implementing 2FA, verification-document
review, and refresh-token theft detection on top of `auth.users`,
discarding already-working code, for a unification benefit that
doesn't actually apply here."*

### The request

A CTG One-wide unified-identity megaprompt asks for: one email, one
password, one recovery mechanism, one CTG One identity, usable across
CTG Craft Beer Inversión, Nvet Care, and future products — while each
product keeps its own domain-scoped profile/role/permissions,
explicitly modeled (in the prompt's own words) as `CTG Identity →
NvetUserProfile → VetProfile → veterinary data`. It designates Supabase
Auth as the CTG One identity provider, forbids trusting
client-submitted `email`/`userId`/`role`, forbids a second dashboard or
second Supabase instance, requires Android/iOS compatibility from day
one, and mandates this exact Phase 0 (audit + ADR, no production
changes) before any implementation.

## Reconciling with ADR-002

ADR-002's reasoning is not wrong, and this ADR does not overturn it —
it narrows what "unify identity" should mean, because the megaprompt's
own model already anticipates the narrower scope without saying so
explicitly.

Split the question in two:

1. **"Who logs in?"** (authentication) — for a `CLIENT` (a pet owner),
   there is no domain-specific reason their Nvet identity should differ
   from their `ctgone.com` identity. This is exactly ADR-011's
   Investment precedent: same person, same login, separate per-product
   profile row.
2. **"What can they do, and what extra verification do they need?"**
   (authorization + domain data) — `VetProfile`'s licensing fields, the
   `VerificationDocument` review queue, and the professional
   verification workflow are genuinely Nvet-specific and already
   correctly modeled as data *below* identity, not identity itself.
   They do not need to move, and this ADR does not propose moving them.

So: **unify authentication for all Nvet users (identity = "who"),
while leaving `VetProfile`'s licensing/verification domain exactly
where it is** ("what they're additionally allowed/verified to do"
stays Nvet's own concern). This directly answers the megaprompt's
actual UX complaint (having to register twice) without discarding
`VetProfile`'s already-working, non-duplicative domain logic.

**2FA and refresh-token theft detection are the parts of ADR-002's
concern that a naive "just verify Supabase JWTs in Nvet" design (Option
A below) would genuinely break**, and are the deciding factor in the
Option A vs. B recommendation below.

## Decision

**Recommend Option B — token exchange — not Option A (direct JWKS
verification in Nvet's `JwtStrategy`).**

| | Option A: verify Supabase JWT directly in Nvet | Option B: token exchange (recommended) |
|---|---|---|
| `UserSession` refresh-token rotation + theft detection | Discarded or must be rebuilt against Supabase sessions | **Untouched** — still mints Nvet's own session on exchange, exactly like `POST /auth/login` does today |
| BFF cookie pattern (`session.ts`, ADR-002) | Would need to hold/forward a Supabase token instead | **Unchanged shape** — BFF still holds Nvet access/refresh cookies; only what mints them changes |
| 2FA (`twoFactorEnabled`) | No natural point to challenge it — Supabase already "logged the user in" | **Reusable** — exchange can return the same `TWO_FACTOR_REQUIRED` shape `auth.service.ts`'s `login()` already returns (`src/auth/auth.service.ts:206-212`) when the linked `User.twoFactorEnabled` is true |
| Existing guards (`JwtAuthGuard`, `RolesGuard`, `WsJwtGuard`) | Must accept a second, differently-shaped token | **Unchanged** — every downstream request still carries a normal Nvet JWT |
| Mobile (Android/iOS) | Same complexity either way | Plain HTTP endpoint; a native app authenticates with Supabase's own mobile SDK, then calls the same exchange endpoint directly — no BFF/cookie involvement needed for native clients |

**New endpoint**: `POST /auth/ctg-identity-exchange` in the NestJS
backend (`backend/src/auth/auth.controller.ts`), called **only**
server-to-server (Next.js BFF for web, native app for mobile — never a
bare fetch from a browser tab, since the input is a bearer token that
must be handled like any other credential).

Flow:
1. Caller sends a Supabase access token (obtained from the caller's own
   already-authenticated Supabase session — the BFF reads it the same
   way `updateSession()` already does via `@supabase/ssr`).
2. The endpoint verifies it against Supabase's JWKS (issuer + audience
   + expiry — see `THREAT_MODEL.md`), never trusting an unverified
   claim.
3. Extract `sub` (`auth.users.id`). Look up `User.ctgUserId`.
4. If found: mint a normal Nvet access/refresh token pair exactly as
   `login()` does today, including the existing 2FA challenge branch if
   `twoFactorEnabled`.
5. If not found and no existing Nvet account matches (see linking rules
   below): provision a new `User` with `role = CLIENT`,
   `ctgUserId` set, `emailVerified = true` (Supabase already verified
   it — do not re-verify), no password set.
6. If not found but an *existing* Nvet account matches by email:
   **do not auto-link.** Return a distinct response directing the
   client to an explicit linking flow that requires proving control of
   the existing Nvet credential (password or 2FA) in the same request —
   satisfies the megaprompt's explicit prohibition on email-as-proof-of-identity
   (§11) and mirrors the caution ADR-011 already exercises by keeping
   `profiles` and `investment_participant_profiles` from ever being
   conflated by email.

`role` is never accepted as input to this endpoint, matching the
existing discipline in `backend/src/auth/dto/auth.dto.ts`
(`RegisterDto.role` is `@IsIn([CLIENT, VET])` with ADMIN deliberately
excluded, provisioned out-of-band) — provisioning here always creates
`CLIENT`; VET remains a separate, manually-reviewed upgrade path
untouched by this ADR.

### Schema change (additive only, not yet applied)

- `User.ctgUserId String? @unique @db.Uuid` — nullable (existing Nvet
  users have none yet), unique once set. Not `NOT NULL`. This is the
  only new relational key; email is never used as a permanent join.
- `User.passwordHash` becomes nullable — a CTG-provisioned `CLIENT` has
  no Nvet password until/unless they explicitly set one (e.g., to use
  Nvet independently of a CTG session in the future). Every code path
  that currently assumes `passwordHash` is present (`login()`,
  `loginWithRecoveryCode()`, password-reset flows) needs an explicit
  audit in Phase 2 for null-safety — flagged here, not resolved.

### What does not change

- `ctgone.com`'s Supabase project, `AuthContext`, `profiles`,
  `/registro`, `/iniciar-sesion` — untouched. No second Supabase
  instance; no new auth tables in `ctg_one_website`.
- `middleware.ts`'s existing branches (`/dashboard`, `/admin`,
  `/inversion/app`, `/inversion/admin`) and `handleNvetSession()`'s
  cookie-based protection of `/nvetcareapp/dashboard/**` — this ADR
  proposes one new, additive code path (what the BFF calls when a
  Nvet-authenticated cookie is absent but a Supabase session exists),
  not a rewrite of either.
- `VetProfile`, `VerificationDocument`, the license-review queue — stay
  exactly where they are, one layer below identity, per the
  reconciliation above.
- The retired standalone `dashboard/` (Vite) — not reopened by this
  initiative; `ctgone.com/nvetcareapp` remains the sole web platform
  per `Nvet-Care-App` PR #19 / `ctg_one_website` PR #203.
- `/inversion` and its KYC/ledger/settlement code paths — not touched
  by any part of this proposal.

### Rollout

No feature flag needed for the BFF button itself — the accepted scope
(see Status above) is additive by construction: a new button on
`/nvetcareapp/iniciar-sesion` that either works or doesn't, with zero
effect on anyone not using it. `/nvetcareapp/iniciar-sesion`'s existing
form and `POST /auth/login` are not touched, gated, or scheduled for
deprecation.

**The backend endpoint itself needs a separate gate, though** (raised
in review of the Phase 0 docs — see `CTG_ONE_IDENTITY.md`'s phase
table note). `Nvet-Care-App`'s `main` auto-deploys to production
(Railway), so merging Phase 2/3 puts `POST /auth/ctg-identity-exchange`
live on the internet — reachable by anyone holding *any* valid
Supabase access token — before Phase 4 ships the BFF button that's
supposed to be the only caller. Once Phase 3 adds provisioning, that
window lets an uninvited caller create real `CLIENT` rows ahead of the
advertised launch, with no way to shut it off short of a revert.
Phase 2 must therefore add a backend-side kill switch — an
`NVET_CTG_IDENTITY_EXCHANGE_ENABLED` env var, default unset/`false` —
checked first in the endpoint handler; while unset it returns `404`
regardless of token validity. Phase 4's deploy flips it to `true`
alongside shipping the button. This is a deploy-time gate, not the
user-facing feature flag the paragraph above correctly says isn't
needed.

### Questions this ADR resolves under the accepted scope

1. Does first-time CTG→Nvet `CLIENT` provisioning need any additional
   verification step? **No** — a valid Supabase session is sufficient,
   matching Investment's `investment_participant_profiles`
   lazy-creation precedent. There is no forced-migration population to
   protect against, since nothing is forced.
2. Does Nvet still allow account creation without a CTG One account?
   **Yes, unconditionally** — the existing `/auth/register` form is
   untouched and not deprecated under the accepted scope. This was the
   deciding consideration, not a side effect.
3. 2FA for a user who happens to have both a password-based Nvet
   account and later clicks "Continuar con mi cuenta CTG One" with the
   same email: **out of scope for now** — that's exactly the
   account-linking case deferred above. Until linking ships, that
   click simply doesn't succeed for an account that already has a
   password; nothing about their existing 2FA is touched.

## Consequences

- One login for `CLIENT` users across `ctgone.com` and Nvet Care,
  closing the megaprompt's core UX gap, using the same reusable pattern
  Investment already validated in production (ADR-011).
- `VetProfile`'s licensing/verification domain, `UserSession`'s
  refresh-token theft detection, and existing 2FA all survive unchanged
  — this ADR adds one new entry point rather than rewriting the
  security investment ADR-002 already made.
- `passwordHash` becoming nullable is a real, non-trivial change
  touching several existing code paths (`login`, recovery-code login,
  password reset) — Phase 2 must audit every one of them for
  null-safety before this ships, not just add the column.
- Every future CTG One product can reuse the same
  `ctgUserId`-linked-profile shape Investment and (proposed) Nvet Care
  both now use, rather than re-deciding this per product.
