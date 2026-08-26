# ADR-001: CTG One Unified Identity — Nvet Care Integration

## Status
Proposed — Phase 0 output. This ADR reopens and partially revises
`docs/nvetcareapp/adr/ADR-002-authentication-strategy.md`; it should not
be treated as decided until a product owner has read the "Reconciling
with ADR-002" section below and confirmed the narrower scope it
recommends. No code, schema, or config in either repo has been changed
by this ADR.

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

Feature flag `NVET_UNIFIED_IDENTITY_ENABLED` on both sides. While
`false`, `/nvetcareapp/iniciar-sesion` and `POST /auth/login` keep
working exactly as today — nothing about this ADR requires removing
the legacy path before the new one is validated. Legacy login is marked
deprecated (not deleted) only after the flag is on in production and
stable, per the megaprompt's own Phase 6 gate.

### Open questions this ADR deliberately does not resolve

1. Does a first-time CTG→Nvet `CLIENT` provisioning need any additional
   verification step, or is a valid Supabase session sufficient on its
   own? (Recommendation: sufficient, matching Investment's
   `investment_participant_profiles` lazy-creation precedent — but this
   is a product call, not an engineering one.)
2. For a Nvet user who links their existing account to a CTG identity
   and already has `twoFactorEnabled = true`: keep challenging 2FA on
   every exchange (recommended — it's already free, since the exchange
   endpoint can call the same branch `login()` uses), or treat the
   Supabase session as sufficient going forward? Needs a product
   decision before Phase 2.
3. Whether Nvet should ever allow account creation *without* a CTG One
   account at all (e.g., a future Nvet-only mobile install with no
   `ctgone.com` relationship) — the megaprompt doesn't rule this out,
   and Option B doesn't block it (legacy `/auth/register` keeps
   working while flagged deprecated), but it's worth an explicit
   product decision rather than defaulting silently either way.

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
