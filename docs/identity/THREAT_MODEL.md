# CTG One Unified Identity — Threat Model

Companion to `ADR-001` and `CTG_ONE_IDENTITY.md`. Covers the new trust
boundary this initiative introduces: `POST /auth/ctg-identity-exchange`
in the Nvet Care backend, and the CTG-session-aware branch added to the
Next.js BFF. Every item below is a design requirement for Phase 2
onward, not yet implemented.

## New trust boundary

```
Untrusted            Trusted (server-to-server only)          Existing trust boundary
  │                            │                                    │
Browser / mobile app  ──────►  Next.js BFF / native app  ──────►  Nvet backend
  (never calls the                (holds the Supabase              (unchanged: JwtAuthGuard,
   exchange endpoint               access token server-side          RolesGuard, session/refresh
   directly from a                 for web; mobile SDK holds         model exactly as today)
   browser tab for the             it for native)
   web case)
```

The only genuinely new thing an attacker gets to send is a Supabase
access token to `POST /auth/ctg-identity-exchange`. Everything
downstream of a successful exchange is the existing, already-audited
Nvet session model — this document focuses on that one new surface.

## Threats and required mitigations

**JWT verification correctness (signature, issuer, audience,
expiration).** The exchange endpoint must verify the Supabase access
token against Supabase's published JWKS — not just decode it. Reject if
`iss` doesn't match the expected Supabase project URL, `aud` doesn't
match the expected value, or the token is expired. Mirrors the caution
already documented in `src/lib/nvetcareapp/session.ts`:
`decodeJwtExpiryMs` is explicitly UX-only there because the real check
happens server-side — the same discipline applies here in reverse
(Nvet backend must be the one doing real verification, not trusting a
decode).

**Key rotation.** Fetch Supabase's JWKS via its `.well-known` endpoint
with caching and a background refresh, not a hardcoded key — Supabase
rotates signing keys periodically; a pinned key silently breaks
authentication until redeployed.

**Replay of a captured Supabase token against the exchange endpoint.**
A replayed token can only mint a normal Nvet session for the account it
already belongs to — same blast radius as replaying any login. No
special mitigation beyond the token's own short Supabase-issued
lifetime; do not build bespoke single-use-nonce infrastructure for
this, it would be disproportionate to the actual risk.

**CSRF on the exchange endpoint.** None — it's server-to-server only
(Next.js Route Handler → NestJS, or native app → NestJS with its own
credential). No browser ever submits a cross-origin form or fetch
directly to it. If a future change ever exposes it to direct browser
calls, CSRF protection becomes mandatory at that point — flagged so it
isn't forgotten if the design changes.

**Privilege escalation / role spoofing.** The exchange endpoint must
never accept a `role` field from the caller, matching
`backend/src/auth/dto/auth.dto.ts`'s existing
`@IsIn([CLIENT, VET])`-with-ADMIN-excluded pattern. Provisioning always
creates `role = CLIENT`. `VET`/`ADMIN` remain reachable only through
existing, separately-reviewed paths untouched by this ADR.

**IDOR on `ctgUserId`.** Never accept `ctgUserId` as a request
parameter anywhere — it is derived exclusively from the verified
token's `sub` claim inside the exchange endpoint, and from the
authenticated session in every other Nvet route. No endpoint should
ever let a caller specify *whose* `ctgUserId` to look up or link.

**Account linking / takeover.** The single highest-risk item in this
design. An existing Nvet account must never be linked to a CTG identity
on the strength of a matching email alone (this is explicitly called
out in the megaprompt and is a real, common vulnerability class). The
linking flow (Phase 5) must require proving control of the *existing*
Nvet credential — current password, or a successful 2FA challenge if
enabled — in the same authenticated request that establishes the link,
not a follow-up "click this email link" flow that can be raced or
phished independently of the original account's own credential. Log
`NVET_ACCOUNT_LINKED` (see Audit logging below) with both identifiers
on every successful link.

**Session fixation.** Not newly introduced — the exchange endpoint
mints a fresh access/refresh pair through the same code path
`login()` uses, which already generates new tokens rather than reusing
any client-supplied value.

**Refresh-token rotation / theft detection.** Unaffected by this
initiative by design (see `ADR-001`'s Option A/B comparison) —
`UserSession.previousTokenHashes`-based reuse detection keeps working
exactly as it does today, because Option B never bypasses it.

**CORS.** The exchange endpoint's caller set doesn't change the
existing trust model: the browser only ever talks to `ctgone.com`
directly (per ADR-002); only the BFF's own server-side `fetch` calls
cross to the Nvet backend's origin, exactly as `refreshNvetSession()`
already does today. `CORS_ORIGIN` on the backend does not need to grow
to include any new browser-facing origin for the web case. A future
native mobile client calling the endpoint directly is not
CORS-relevant (CORS governs browsers, not native HTTP clients) but does
need its own rate-limiting/abuse consideration below.

**Rate limiting.** The exchange endpoint is a new unauthenticated(-ish)
entry point — reachable by anyone holding *any* valid Supabase access
token, including one for an account with no prior Nvet relationship —
so it needs the same "aggressive rate limiting on sensitive auth
endpoints" the existing `README`/controller comments already call for
on `register`/`login`/`forgot-password`. Apply the same policy here.

**Disabled/deactivated account.** If a linked Nvet `User.isActive` is
`false`, the exchange must reject exactly like `JwtStrategy` already
does for a normal session (`ForbiddenException('Account deactivated')`)
— a CTG-valid session must not be able to bypass a Nvet-side account
deactivation.

**Password-change / token invalidation interaction.** `JwtStrategy`
already invalidates access tokens issued before a subsequent password
change (`passwordChangedAt` vs. `iat`). A CTG-provisioned `User` with no
`passwordHash` has no `passwordChangedAt` to compare against — verify
this comparison degrades safely (treats "never had a password" as "no
invalidation-by-password-change condition applies") rather than
throwing or, worse, silently skipping a check it should perform for
users who *do* later set a password.

## Audit logging

Add, without ever logging the token itself, a password, or a raw
refresh token:

- `NVET_PROFILE_CREATED` — CTG-provisioned `CLIENT` created, with
  `ctgUserId` and new Nvet `User.id`.
- `NVET_ACCOUNT_LINKED` — existing Nvet account linked to a CTG
  identity, with both identifiers and which credential (password vs.
  2FA) proved control.
- `NVET_IDENTITY_EXCHANGE_FAILURE` — verification failed (expired,
  wrong issuer/audience, disabled account) — no PII beyond what's
  already in the existing `AuditLog` model's conventions.

These extend the existing `AuditAction`/`AuditLog` model already in
`backend/prisma/schema.prisma` rather than introducing a parallel
logging mechanism.

## Explicitly out of scope for this threat model

- Supabase's own infrastructure security (key management, `auth.users`
  storage) — outside this initiative's control surface, already
  Supabase's responsibility as the identity provider.
- `/inversion`'s existing authorization model — untouched by this ADR,
  not re-reviewed here.
