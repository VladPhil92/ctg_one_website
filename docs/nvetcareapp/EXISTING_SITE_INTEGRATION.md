# Existing Site & Existing Repo Integration

`ctgone.com/nvetcareapp` (this repo) and `VladPhil92/Nvet-Care-App` (a
separate repo) are two different codebases that must work together without
either one absorbing the other.

## What already exists, on each side

**This repo (`ctg_one_website`)**: a presentation subsite at `/nvetcareapp`
(`src/app/nvetcareapp/**`, `src/components/sections/NvetCareAppSection.tsx`),
shipped and live. It has its own visual identity — Poppins typography, the
brand kit's navy/green/orange palette, a "línea + nodos" icon treatment —
deliberately distinct from the rest of `ctgone.com`'s dark theme (see
`adr/ADR-004-style-isolation.md`). It carries zero business logic: no
auth, no database tables, no API routes yet.

**`Nvet-Care-App`**: a monorepo with three parts, all further along than a
first look suggests:

- `backend/` — NestJS + Prisma + PostgreSQL + Redis. Real controllers for
  auth, admin, appointments, chat, payments (PSE + a CTG-token Polygon
  integration), pets, reviews, vets. Its own `User` model with password
  hashing, email verification, 2FA (TOTP), refresh-token rotation with
  reuse detection, an append-only audit log, and idempotency keys — this
  is hardened, not a stub.
- `dashboard/` — React + Vite admin panel (~1,650 lines across 5 pages +
  services + stores). Already re-themed to the same official brand-kit
  palette this repo uses (`dashboard/src/theme/tokens.ts` cites
  `/public/images/Corporative Images/` as its source), though the exact
  hex values drifted slightly from what this repo shipped — see Phase 0
  of `ROADMAP.md`.
- `mobile/` — React Native, ~40% built, calls the same backend at
  `API_URL/api`.

Nothing in `Nvet-Care-App` is deployed yet (no Railway/Vercel URL anywhere
in the repo) — there is no live traffic or real data to migrate, which is
why this plan can pick a target architecture up front instead of working
around an existing production system.

## The boundary this plan draws

- The NestJS backend, its Postgres database, and its Redis instance stay
  in `Nvet-Care-App` and deploy as their own service (ADR-001) — they do
  **not** move into this repo or onto Supabase.
- The **dashboard's pages** get rebuilt natively in this repo, under
  `src/app/nvetcareapp/dashboard/**`, calling the NestJS API as a client
  through a thin BFF layer (`src/app/api/nvetcareapp/**`) — see
  ADR-001 and ADR-003.
- The mobile app is untouched by this plan. It already calls the NestJS
  backend directly and keeps doing so; nothing here changes its contract
  except that the backend now also serves a second client (the ctgone.com
  dashboard).
- No existing route, component, global style, or migration in this repo
  is modified except where an ADR in this series states a specific,
  minimal, explicitly-justified exception.

## What this plan does not decide

- Where the NestJS backend, Postgres, and Redis actually get hosted
  (`Nvet-Care-App/README.md` names Railway; that is not confirmed here).
- Whether the CTG Token / Polygon payment rail is still an active
  requirement or deprioritized — it's already coded in `backend/src/payments/`,
  but no on-chain deployment or contract address is configured
  (`CTG_CONTRACT_ADDRESS="0x..."` is still a placeholder).
- Whether `Nvet-Care-App` continues to be developed by whoever built it
  so far (the repo's own docs credit "Oz AI Agent") in parallel with this
  work — coordinate before Phase 1 so nobody's changes get overwritten.
