# ADR-000: Existing ctgone.com Integration Boundary

## Status
Accepted

## Context
CTG Craft Beer Inversión must launch from inside the already-live `ctgone.com`
production site (Next.js 14 App Router, Supabase-backed accounts system,
deployed on Render). The site is a protected production asset with real
traffic and a real accounts system already merged into `main`.

## Decision
CTG Craft Beer Inversión will be developed as an isolated application area
inside the existing `ctgone.com` domain, at `/inversion`, without rebuilding,
redesigning, or migrating the existing site.

Concretely:
- All new routes live under `src/app/inversion/**`.
- All new domain code is namespaced (`investment_*` DB tables, `/api/investment/**`
  Route Handlers, `docs/investment/**` documentation).
- No existing route, component, global style, or migration is modified except
  where this ADR series records a specific, minimal, explicitly-justified
  exception (none exist yet).
- The global site navigation and homepage are not modified by this initiative
  (see ADR-011 note on discoverability — deferred as a separate decision).

## Consequences
- `/inversion` can be built, reviewed, and deployed incrementally without
  putting the existing marketing site or accounts system at risk.
- Some short-term duplication is accepted (e.g. a second onboarding flow
  concept for "Participant") in exchange for isolation — see ADR-011 for why
  auth itself is still shared rather than duplicated.
- Every future ADR in this series must state explicitly which existing files,
  if any, it needs to touch, and why the touch is unavoidable.
