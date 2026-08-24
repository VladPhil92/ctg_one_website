# ADR-000: Existing ctgone.com Integration Boundary

## Status
Accepted

## Context
`ctgone.com/nvetcareapp` already exists as a live presentation subsite in
this repo. The user has now asked whether the Nvet Care **web app**
(admin dashboard, and eventually vet/owner-facing web features) should
also be mounted here, and confirmed it should, choosing to rebuild the
dashboard natively in this repo while keeping the already-built NestJS
backend as its API (see ADR-001).

## Decision
The Nvet Care dashboard is developed as an isolated application area
inside `ctgone.com`, at `src/app/nvetcareapp/dashboard/**`, without
rebuilding, redesigning, or migrating the existing site — same discipline
`/inversion` already established (its own ADR-000).

Concretely:
- New dashboard routes live under `src/app/nvetcareapp/dashboard/**`.
- New BFF route handlers live under `src/app/api/nvetcareapp/**`.
- New domain code, if any lands in this repo, is namespaced
  (`nvetcareapp_*` if a table is ever needed here — none is planned; see
  ADR-001) and documented under `docs/nvetcareapp/**`.
- No existing route, component, global style, or migration is modified
  except where an ADR in this series states a specific, minimal,
  explicitly-justified exception.
- The global site navigation, homepage, and the existing accounts system
  (`AuthContext`, `/registro`, `/iniciar-sesion`, `/dashboard`) are not
  modified by this initiative — the Nvet dashboard gets its own,
  separate sign-in (ADR-002), for reasons that don't apply to
  `/inversion`.

## Consequences
The dashboard can be built, reviewed, and deployed incrementally without
putting the existing marketing site, the existing accounts system, or the
already-shipped `/nvetcareapp` presentation page at risk. Every future ADR
in this series must state explicitly which existing files, if any, it
needs to touch, and why the touch is unavoidable.
