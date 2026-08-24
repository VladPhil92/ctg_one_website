# ADR-001: The NestJS Backend Stays a Separate Service

## Status
Accepted

## Context
`/inversion`'s ADR-002 established a modular monolith: new business logic
ships inside the same Next.js app, on the same Render service, as
`src/app/inversion/**` + Route Handlers + Supabase migrations. That
worked because `/inversion` started from nothing and Supabase Postgres
was already the site's one database.

Nvet Care is not starting from nothing. `Nvet-Care-App/backend/` is a
working NestJS + Prisma + PostgreSQL + Redis API: 8 controllers (auth,
admin, appointments, chat, payments, pets, reviews, vets), password
hashing, email verification, 2FA, refresh-token rotation with reuse
detection, an audit log, idempotency keys, a PSE payment integration, and
a CTG-token (Polygon) payment integration. Rebuilding that inside Next.js
API routes on Supabase would mean either re-implementing all of it
(re-introducing bugs into already-hardened auth and payment code for no
functional gain) or running a NestJS process inside a Next.js Route
Handler, which NestJS isn't built for.

## Decision
The NestJS backend, its Postgres database, and its Redis instance stay in
`Nvet-Care-App` and deploy as their own service — not merged into the
`ctg_one_website` Next.js app or its Render deployment, and not ported to
Supabase. This is a deliberate departure from `/inversion`'s modular
monolith precedent (ADR-002 in that series), justified by the fact that
real, working, security-sensitive code already exists in a different
runtime.

`ctgone.com`'s Next.js app talks to that service as a client, through a
thin Backend-for-Frontend layer under `src/app/api/nvetcareapp/**`
(Route Handlers that call the NestJS API server-side and shape the
response for the dashboard pages — see ADR-003). The browser never calls
the NestJS API directly.

The mobile app keeps calling the NestJS API directly, unchanged by this
decision — it was already doing so before this plan existed.

## Consequences
- Two deployments to operate instead of one: `ctgone.com` (Render,
  unchanged) and the NestJS backend (hosting TBD — `Nvet-Care-App/README.md`
  names Railway; not confirmed as part of this plan). A backend outage
  degrades the Nvet dashboard and the mobile app together, but does not
  affect the rest of `ctgone.com`.
- The BFF layer is the only place that needs the backend's base URL and
  any server-to-server secret — set via `CTG_NVETCARE_API_URL` and
  `CTG_NVETCARE_API_KEY`-style env vars (namespaced like the investment
  module's `CTG_INVESTMENT_*`, never reusing an existing variable name),
  configured on the Render service for `ctgone.com`.
- Schema changes to the Nvet data model happen in `Nvet-Care-App`'s own
  Prisma migrations, reviewed and deployed independently of this repo's
  `supabase/migrations/**` — the two migration histories never interleave.
- If a future need arises to run backend logic on ctgone.com's own
  infra (e.g. cost, latency, or ownership reasons), that's a new ADR with
  its own justification — not assumed here.
