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
Supabase session. It gets its own sign-in screen at
`src/app/nvetcareapp/iniciar-sesion` — a sibling of `dashboard/`, not
nested inside it, so the protection rule below can't intercept the
sign-in page itself and loop.

The browser never holds the NestJS JWT directly. Sign-in posts to
`POST /api/nvetcareapp/auth/login` (a Next.js Route Handler), which calls
the NestJS `/auth/login` server-side and sets the access/refresh tokens
as `httpOnly`, `secure`, `sameSite=lax` cookies with `Path=/` — not
`localStorage`, which is what the existing
`dashboard/src/services/auth.service.ts` in `Nvet-Care-App` currently
does client-side, and not path-scoped to `/nvetcareapp/dashboard` either:
the BFF routes that need to read the cookie live under
`/api/nvetcareapp/**`, a sibling path the browser wouldn't attach a
`/nvetcareapp/dashboard`-scoped cookie to. Every subsequent BFF route
reads the cookie server-side and attaches the bearer token when calling
the NestJS API. Token refresh is likewise proxied, so refresh-token
rotation stays server-to-server.

This repo's request-interception entry point is `src/proxy.ts`, which
delegates to `src/lib/supabase/middleware.ts` — that's the file that
already protects `/inversion/app/*` and `/inversion/admin/*` with
`pathname.startsWith(...)` checks (there is no `src/middleware.ts`).
The same file gets a new, additive branch requiring a valid Nvet session
cookie for `/nvetcareapp/dashboard/**` — explicitly excluding
`/nvetcareapp/iniciar-sesion` — checking the Nvet cookie, not the
Supabase session.

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
