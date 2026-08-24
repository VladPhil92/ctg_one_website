# ADR-002: The Nvet Dashboard Gets Its Own Sign-In (Not Supabase Auth)

## Status
Accepted

## Context
`/inversion`'s ADR-011 reused `ctgone.com`'s existing Supabase Auth
session: a participant is the same person whether they're using CTG One
deposits or Craft Beer Inversión, and no bespoke auth existed yet, so
building a second one would have been pure duplication.

Nvet Care is the opposite starting condition. `Nvet-Care-App/backend/src/auth/`
already has a complete, working identity system of its own: its own
`User` table (independent of Supabase's `auth.users`), password hashing,
email verification, 2FA (TOTP), refresh-token rotation with theft
detection, brute-force lockout, and an append-only audit trail. Its
`VetProfile` model encodes something Supabase's `profiles` table has no
concept of: professional licensing (COMVEZCOL number, degree, manual
document verification with a 24-48h review queue) — a fundamentally
different identity than "a person who signed up on ctgone.com."

Forcing Nvet identities into Supabase Auth would mean re-implementing
2FA, verification-document review, and refresh-token theft detection on
top of `auth.users`, discarding already-working code, for a unification
benefit that doesn't actually apply here (a ctgone.com visitor and a
licensed veterinarian are not "the same person" in the way a CTG One
depositor and an investment participant are).

## Decision
The Nvet dashboard does **not** reuse `ctgone.com`'s `AuthContext` or
Supabase session. It gets its own sign-in screen
(`src/app/nvetcareapp/dashboard/iniciar-sesion`), separate from
`/iniciar-sesion`.

The browser never holds the NestJS JWT directly. Sign-in posts to
`POST /api/nvetcareapp/auth/login` (a Next.js Route Handler), which calls
the NestJS `/auth/login` server-side and sets the access/refresh tokens
as `httpOnly`, `secure`, `sameSite=lax` cookies scoped to
`/nvetcareapp/dashboard` — not `localStorage`, which is what the existing
`dashboard/src/services/auth.service.ts` in `Nvet-Care-App` currently
does client-side. Every subsequent BFF route reads those cookies
server-side and attaches the bearer token when calling the NestJS API.
Token refresh is likewise proxied, so refresh-token rotation stays
server-to-server.

`src/middleware.ts` is extended additively (a new `if` branch, no
existing branch altered) to require a valid Nvet session cookie for
`/nvetcareapp/dashboard/**`, the same way it already protects
`/inversion/app/*` — but checking the Nvet cookie, not the Supabase
session.

## Consequences
- One extra login for anyone who is both a ctgone.com user and a Nvet
  Care vet/admin — accepted, because unlike investment participants,
  most Nvet dashboard users (licensed vets going through document
  verification) are not expected to already have a ctgone.com account,
  and conflating the two would blur two different identity and
  authorization models.
- Moving tokens from `localStorage` to `httpOnly` cookies is a real
  security improvement over what `Nvet-Care-App`'s dashboard does today —
  worth doing here regardless of where the pages end up living.
- CORS stays simple: the browser only ever talks to `ctgone.com`. Only
  the BFF's server-side `fetch` calls cross to the NestJS API's origin,
  which is what `CORS_ORIGIN` in the backend's `.env` needs to allow.
