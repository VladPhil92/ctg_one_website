# ADR-003: Dashboard Pages Are Rebuilt Native, Data Flows Through a BFF

## Status
Accepted

## Context
`Nvet-Care-App/dashboard/` already has 5 working pages (AdminDashboard,
TiersPage, VetPanel, TrackingPage, AccountingPage — ~900 lines of TSX)
built with Vite + React Router + Zustand + inline CSS-in-JS, calling the
NestJS API directly from the browser with an `axios` client that reads
the JWT from `localStorage`.

The user chose, over the alternative of just embedding/linking to that
existing Vite build, to rebuild the pages natively inside `ctgone.com` —
so the dashboard looks and feels like part of the same product as the
already-shipped `/nvetcareapp` marketing page, not a second app bolted on
behind a link.

## Decision
Each dashboard page is rebuilt as a Next.js page under
`src/app/nvetcareapp/dashboard/**`, using this repo's conventions (App
Router, Server Components where the data doesn't need client
interactivity, `'use client'` only where it does — same pattern as the
rest of the site). None of `Nvet-Care-App/dashboard/`'s Vite/React-Router
scaffolding, CSS-in-JS, or Zustand stores are ported as-is; the pages are
rewritten against this repo's component conventions.

Data does not flow browser → NestJS directly. Each page's data need is
served by a Route Handler under `src/app/api/nvetcareapp/**`
(e.g. `GET /api/nvetcareapp/admin/metrics` mirrors
`admin.service.ts::getMetrics()`), which:
1. Reads the session cookie (ADR-002),
2. Calls the corresponding NestJS endpoint server-side with the bearer
   token,
3. Returns the shaped JSON the page needs.

This mirrors why `/inversion` funnels its financial reads through
`SECURITY DEFINER` Postgres functions rather than raw table access from
the client (`CLAUDE.md`) — the principle carries over even though the
underlying data store here is NestJS/Prisma, not Postgres RLS: the
browser is never trusted with the credential that talks to the system of
record.

Real-time chat (`ChatGateway`, Socket.io) is the one piece that doesn't
fit this pattern — a Next.js Route Handler can't hold a persistent
WebSocket connection. That's an open decision, not resolved here: either
the browser connects to the NestJS WebSocket endpoint directly with a
short-lived, narrowly-scoped token issued by the BFF, or chat is
deferred to a later phase. See `ROADMAP.md` Phase 5.

## Consequences
- Every dashboard page needs its own BFF route before it can be ported —
  more files than a direct-call approach, but it's the only way to keep
  ADR-002's cookie-based auth working and to keep the NestJS bearer token
  out of client JS.
- Visual identity comes from the same page-scoped Poppins/palette
  constants already established in `NvetCareAppSection.tsx`
  (see ADR-004), not from `Nvet-Care-App/dashboard`'s own styling.
- Porting order matters for risk: start with the lowest-stakes,
  read-only page (AdminDashboard) to validate the whole
  page → BFF → NestJS → Prisma → Postgres path before touching anything
  that writes (tier changes, transfer verification, dispute resolution).
