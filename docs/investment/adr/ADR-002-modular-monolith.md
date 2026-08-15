# ADR-002: Modular Monolith

## Status
Accepted

## Context
The project constitution explicitly forbids premature microservices, event
streaming, or distributed architecture. The existing site is a single Next.js
app on a single Render Web Service.

## Decision
CTG Craft Beer Inversión ships inside the same Next.js application and the
same deployment, as a bounded context under `src/app/inversion/**` and a
(future) `src/investment/**` domain module (`domain/`, `services/`,
`schemas/`, `permissions/`, `financial/`, `inventory/`, `types/` —
introduced incrementally as real logic lands, not scaffolded empty).

## Consequences
- One build, one deploy, one Render service — zero new infrastructure.
- The bounded context is enforced by code organization and naming
  (`investment_*` DB tables, `/inversion` routes, `/api/investment/**`
  handlers), not by process/network boundaries.
- Revisit only if a documented, demonstrated need arises (e.g. the financial
  engine needs to run on a schedule independent of request/response) — not
  speculatively.
