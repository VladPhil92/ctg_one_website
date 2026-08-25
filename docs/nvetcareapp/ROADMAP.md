# Nvet Care Dashboard — Roadmap

Phased plan for mounting the Nvet Care dashboard inside `ctgone.com/nvetcareapp`,
per the decisions recorded in `adr/ADR-000` through `ADR-004`. Each phase
should ship as its own small, reviewable PR (per `CLAUDE.md`'s "small,
reviewable PRs, not one giant pass" — applied here by extension even
though this repo's `CLAUDE.md` only names it for `/inversion`).

## Phase 0 — Palette correction (independent, do first)

**Status: Done.**

Fix the three drifted hex values in the already-shipped
`NvetCareAppSection.tsx` (see `adr/ADR-004`): `#1E9C6C → #34B27A`,
`#FF8F2E → #FF8A3D`, `#0A1B2E → #0D1B2A`. No dependency on anything
else in this roadmap — can land as its own one-file PR immediately.

## Phase 1 — Get the backend actually running somewhere

**Status: Done.** Deployed to Railway; `CTG_NVETCARE_API_URL` is
`https://backend-production-a476.up.railway.app`. `GET /api/health/ready`
confirmed responding with the database check `up` and the schema pushed
to a real Postgres instance via `prisma db push` (this repo has no
committed Prisma migration history, only `manual/*.sql` patch files
already reflected in `schema.prisma` — `db push` is the correct sync
command here, not `migrate deploy`).

Original brief, for reference — what this phase had to decide and stand
up before any dashboard page could call the backend:
- Hosting for the NestJS API (Railway, per its own `README.md`, or
  another provider — **open decision, not made by this plan**). Went
  with Railway.
- A real PostgreSQL instance and `DATABASE_URL`, with the schema
  applied (`npx prisma migrate deploy` was the original plan; see the
  status note above on why `db push` was used instead).
- A real Redis instance (or accept the in-memory fallback the code
  already supports, with its documented multi-instance caveat). Went
  with Railway's Redis add-on.
- Real secrets for every `REPLACE_ME_*` value in `.env.example`
  (JWT secrets, 2FA encryption key, session salt) — generated with the
  repo's own `scripts/generate-secrets.mjs`, never reused from
  `ctgone.com`'s secrets.
- `CORS_ORIGIN` including `https://ctgone.com`.
- Confirm `GET /health` responds from the public URL.

This phase produces one artifact this plan needs: a real base URL to put
in `CTG_NVETCARE_API_URL`.

## Phase 2 — The auth bridge (ADR-002)

**Status: Done.** Verified against the Phase 1 Railway deployment: a real
login round-trip (`POST /api/nvetcareapp/auth/login` against a registered
test account), a silent refresh via the middleware's expiry-triggered
branch (confirmed it actually calls `POST /auth/refresh` and rotates the
session cookies, not just that the cookie was merely present), and that
missing/unreadable-token requests redirect to
`/nvetcareapp/iniciar-sesion` instead of rendering the dashboard shell.
Checked end to end with a headless browser (real form fill-in, submit,
landing on the dashboard, sign-out) — zero console errors. A minimal
placeholder dashboard page (`src/app/nvetcareapp/dashboard/page.tsx`)
exists only to make this phase's login round-trip testable; Phase 3
replaces it wholesale, not extends it.

- `POST /api/nvetcareapp/auth/login`, `POST /api/nvetcareapp/auth/refresh`,
  `POST /api/nvetcareapp/auth/logout` Route Handlers that proxy to the
  NestJS backend and manage the `httpOnly` cookies.
- `src/app/nvetcareapp/iniciar-sesion` page (outside `dashboard/**` —
  see `adr/ADR-002` on why), styled per `adr/ADR-004`.
- The additive branch in `src/lib/supabase/middleware.ts` (delegated to
  from `src/proxy.ts`) protecting `/nvetcareapp/dashboard/**`, excluding
  the sign-in page.
- Verify: a real login round-trip against the Phase 1 deployment, a
  refresh after the 15-minute access-token expiry, and that a request
  with no/expired cookie is redirected to sign-in, not served stale data.

## Phase 3 — First vertical slice: AdminDashboard

Lowest-stakes page (read-only metrics) — port it in full, end to end, to
prove out the page → BFF → NestJS → Prisma → Postgres path before
touching anything that writes:
- `GET /api/nvetcareapp/admin/metrics` (mirrors `admin.service.ts::getMetrics()`).
- `src/app/nvetcareapp/dashboard/page.tsx` rebuilt against this repo's
  component conventions (`Container`, local `NodeIcon`/`StatusPill` per
  ADR-004), not the existing Vite page's CSS-in-JS.
- Headless-browser check (per the site's established verification
  pattern) against a real logged-in session.

## Phase 4 — Remaining pages, write operations included

In order of increasing risk (read-heavy first, financial writes last):
1. `TrackingPage` (appointment status, mostly read).
2. `VetPanel` (a vet's own agenda/prices — writes scoped to the
   authenticated vet only).
3. `TiersPage` (tier changes — admin-only write, changes a vet's
   commission rate).
4. `AccountingPage` (transfer verification, dispute resolution — the
   highest-stakes writes; needs explicit test coverage per the same bar
   `CLAUDE.md` sets for the investment ledger, even though this data
   isn't in this repo's schema).

Each page gets its own BFF route(s) per `adr/ADR-003`, ported natively,
not copy-pasted from the Vite version.

## Phase 5 — Real-time chat (open design question)

`ChatGateway` (Socket.io) doesn't fit the Route-Handler BFF pattern — a
serverless-style Next.js API route can't hold a persistent WebSocket.
Two options, not decided here:
- The browser connects directly to the NestJS WebSocket endpoint with a
  short-lived, narrowly-scoped token minted by a BFF route (keeps the
  long-lived session cookie server-side only).
- Defer chat to a later milestone; ship Phases 3-4 without it.

## Phase 6 — Hardening and rollout

- `npm test` / `npx tsc --noEmit` / `npm run build` clean, same bar as
  every other change in this repo.
- Discoverability: whether/how the dashboard is linked from the
  marketing page or elsewhere — not decided here, mirrors `/inversion`'s
  ADR-000 deferral of the same question.
- Confirm the mobile app's `API_URL` still points at the Phase 1
  deployment and isn't affected by any of this.

## Explicitly out of scope for this roadmap

- The CTG Token / Polygon payment rail's production readiness — it's
  already coded, but `CTG_CONTRACT_ADDRESS` is still a placeholder. Not
  this plan's decision to make live.
- Any change to `Nvet-Care-App/mobile/`.
- Coordinating with whoever else may be actively developing
  `Nvet-Care-App` in parallel — do that before Phase 1 starts, not as
  part of it.
