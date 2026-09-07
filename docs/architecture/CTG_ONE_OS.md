# CTG One OS — Shared Technology Layer

## Definition

CTG One OS is the architectural name for the shared technology layer used to connect CTG One business units and digital products.

It is **not** a conventional operating system and it must not be presented as a finished monolithic product. It is an evolving platform architecture built from reusable capabilities proven inside real bounded contexts.

Core principle:

> One technology layer. Multiple operating businesses and products.

For current runtime facts and maturity, use `docs/architecture/SYSTEM_STATE.md` and the authoritative sources it references.

## Architectural model

`ctg_one_website` is a **modular monolith**: shared infrastructure lives in one deployable application, while consequential business logic remains separated by bounded context.

```text
Experience surfaces
        ↓
Application / Route Handlers
        ↓
Domain boundaries
        ↓
PostgreSQL / Supabase authorities
        ↓
External providers / federated products
```

A shared repository does not make every domain equally mature or give one bounded context authority over another.

## Current bounded contexts

### Identity / Account / KYC

Shared account lifecycle, SSR session handling, profiles, protected routes, KYC state and identity assurance boundaries.

Identity elevation must fail closed: if canonical verification cannot be established consistently, downstream federation must not receive an elevated claim.

### Wallet / Saldo CTG

Canonical wallet authority is server/database-side. Balance and activity derive from the Wallet V2 ledger contract and reconciliation rules, not from browser-mutated balances.

Capability presence in UI does not imply an enabled rail. Client surfaces may be more restrictive than the server contract but must never widen it.

### CTG Craft Beer Investment

Transactional bounded context for investment orders, payment evidence, allocations, production, inventory, Sales OS, settlement, participant ledger, withdrawal/reinvestment workflows and operational evidence.

Authoritative financial calculations and settlement transitions remain server/database-side with explicit authorization and idempotency.

### JP Valderrama Education / Campus / Learning Center

Education is now a first-class bounded context spanning public JP Valderrama surfaces, Campus, Learning Center, learner dashboards, assessment/learning APIs, instructor/admin operations and payment/entitlement boundaries.

For fixed-price offerings, the commerce path is direct purchase:

```text
published price
→ server-authoritative order
→ provider checkout
→ signed verification
→ settlement
→ entitlement
```

Quotation is reserved for genuinely custom services without a fixed published price.

### CTG Knowledge

Governed knowledge/RAG capability with ingestion, retrieval, evaluation and controlled provider integration. Maturity claims must remain evidence-backed and consistent with `src/data/technology-proof.ts`.

### Nvet Care federation

Nvet Care remains an autonomous veterinary bounded context. CTG One provides explicitly contracted shared identity/integration surfaces; Nvet retains authority over veterinary roles, pets, appointments, services and domain rules.

### VÉRTICE federation

Server-to-server federation surface for authenticated ecosystem exchange. Claims are minimal, validated and bounded by explicit authority. KYC assurance is optional for authentication and fail-closed for elevation.

### Shared observability / security / operations

Cross-cutting platform capabilities include deployment identity, schema health, structured logging, request correlation, HTTP security controls, recovery contracts, CI gates and operational tooling.

## Technology layers

### Experience layer

- public web experiences;
- authenticated dashboards;
- administrative surfaces;
- product-specific interfaces;
- federated entry points.

### Application layer

- Next.js Route Handlers and server components;
- validation and request context;
- server-side authorization;
- bounded-context orchestration;
- provider adapters.

### Data layer

- PostgreSQL persistence;
- Supabase Auth/Storage;
- RLS;
- transactional facts;
- ledgers and audit structures;
- domain-specific read models.

### Automation layer

Includes database triggers, server-side workflows, lifecycle transitions, outbox/event patterns and operational jobs where implemented. Do not describe this as a generalized workflow engine unless production evidence supports that claim.

### Intelligence layer

Includes CTG Knowledge and governed AI infrastructure. Agentic or consequential automation requires explicit tool boundaries, evaluation, authorization and human oversight before production promotion.

### Observability layer

Shared evidence includes:

- `/api/health`;
- Admin System Health;
- database-schema compatibility checks;
- structured logs with sensitive-field redaction;
- validated request/correlation IDs;
- deployment identity by commit SHA;
- domain-specific CI/Golden Path evidence.

Centralized telemetry, SLOs and alerting maturity must be described according to actual implementation rather than roadmap prose.

### Infrastructure layer

Current delivery model:

```text
branch
  ↓
pull request
  ↓
GitHub Actions
  ↓
invariants + audit + lint + typecheck + build + browser/Golden Path checks
  ↓
main
  ↓
Render Web Service
  ↓
ctgone.com
  ↓
Supabase / external providers
```

## Ecosystem registry

Do not maintain a manual business-unit list in this architecture document. The canonical public ecosystem registry lives in `src/data/content.ts`.

That registry may evolve independently from technical bounded contexts. A business can belong to the ecosystem without having a mature dedicated software domain, and a shared technical capability can serve multiple businesses.

## Maturity governance

Capability maturity is not manually maintained here. The authoritative public maturity source is `src/data/technology-proof.ts`.

A capability cannot be promoted based only on:

- installed dependencies;
- a UI screen;
- a route existing;
- an architecture document;
- a successful local prototype.

Promotion requires implementation, tests, deployment and operational evidence appropriate to the capability.

## Architectural rules

1. Shared capabilities become platform services only when reuse is proven.
2. Business-specific logic remains inside bounded contexts.
3. PostgreSQL/server-side authorities govern money, settlement, inventory, entitlements, KYC assurance and other consequential state.
4. Cross-context integrations use explicit contracts and fail closed on ambiguous authority.
5. Payment/browser redirects never substitute for signed settlement evidence.
6. Applied migrations are immutable; schema fixes are new contiguous migrations.
7. Public maturity claims derive from `src/data/technology-proof.ts`, not narrative documentation.
8. A client can restrict a capability but cannot widen a server-side capability contract.
9. AI systems require governance, evaluation and authorization before consequential production use.
10. Branches must be synchronized with current `main` before merge and conflict resolution must not duplicate code or migration metadata.

## Current architectural priorities

### P1 — reliability and closure

- keep production migration/runtime alignment observable;
- maintain direct, verified education payment → settlement → entitlement behavior;
- continue Wallet V2 reconciliation and capability-boundary hardening;
- preserve evidence-backed recovery procedures and restore drills;
- expand critical-path observability without leaking sensitive data.

### P2 — contract consolidation

- reduce duplicated integration logic between bounded contexts;
- keep federation contracts explicit and versionable;
- strengthen operational evidence for Investment, Education, Wallet and Knowledge;
- maintain a single documentation authority map instead of parallel status documents.

### P3 — platform extraction only where proven

- extract reusable platform services only after multiple bounded contexts demonstrate the same need;
- evaluate event-driven decomposition where transaction volume or autonomy justifies it;
- expand SLO/error-budget reporting and centralized telemetry based on operating need.
