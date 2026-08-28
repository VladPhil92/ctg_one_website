# CTG One OS — Shared Technology Layer

## Definition

CTG One OS is the architectural name for the shared technology layer used to connect CTG One business units.

It is **not** a conventional operating system and it must not be presented as a finished monolithic product. It is an evolving platform architecture built from real, reusable capabilities already present in the CTG One technology stack and from clearly labeled future capabilities.

Core principle:

> One technology layer. Multiple operating businesses.

## Why it exists

CTG One operates multiple businesses across different sectors. Rebuilding identity, data access, transactional logic, security, automation, integrations, and intelligence independently for every unit would create duplicated infrastructure and fragmented operating data.

CTG One OS provides the architectural direction for consolidating those responsibilities into reusable platform capabilities.

## Maturity model

Every CTG One OS capability must be classified as one of:

- **LIVE** — implemented and demonstrable in code, database architecture, CI, infrastructure, or a working product.
- **PARTIAL** — implemented in limited contexts but not yet generalized as a shared platform service.
- **IN DEVELOPMENT** — active architectural or implementation work exists, but the capability is not production-ready as a shared service.
- **ROADMAP** — planned direction without sufficient implementation evidence to present as operational.

Marketing copy must never collapse these states into a single implied production capability.

## Current modules

| Module | Status | Current evidence |
|---|---|---|
| Identity | LIVE | Supabase Auth, SSR sessions, protected routes, profiles |
| Data | LIVE | PostgreSQL/Supabase, migrations, RLS, Storage |
| Transactions | LIVE | Investment ledger, allocations, batches, inventory-related models |
| Security | LIVE | RLS, server-side authorization patterns, validation, baseline HTTP headers |
| Automation | PARTIAL | Database triggers, server-side workflows, state transitions |
| Integrations | PARTIAL | Integration surfaces exist but no unified integration gateway is established |
| AI Runtime | IN DEVELOPMENT | CTG Knowledge RAG pilot and shared model gateway exist; no general production agent runtime or provider failover is verified |
| Observability | PARTIAL | Health/schema probes, versioned structured logs, request IDs, W3C trace context and safe error fingerprints exist on critical server paths; centralized metrics/alerting remains incomplete |
| Web3 / CTGO | ROADMAP | Web3 dependencies exist, but production on-chain evidence has not been verified |

## Technology layers

### Experience Layer — LIVE

Responsibilities:

- public web experiences;
- authenticated dashboards;
- administrative surfaces;
- responsive interfaces;
- product-specific applications.

Verified technologies include Next.js, React, TypeScript, and Tailwind CSS.

### Application Layer — LIVE

Responsibilities:

- business logic;
- Route Handlers;
- validation;
- state handling;
- server-side authorization;
- bounded-context application behavior.

### Data Layer — LIVE

Responsibilities:

- PostgreSQL persistence;
- Supabase data access;
- RLS;
- file storage;
- transactional records;
- KYC and profile data;
- ledgers and audit structures.

### Automation Layer — PARTIAL

Current evidence includes database triggers, validation flows, state transitions, and server-side workflows.

This is not yet a generalized workflow engine or event-driven orchestration platform.

### Intelligence Layer — IN DEVELOPMENT

Current evidence includes CTG Knowledge's authenticated source-grounded RAG pilot, deterministic citation validation, evaluation tooling and a shared server-only model gateway with bounded provider resilience and telemetry.

Target capabilities still include:

- narrow AI agents with explicit tools and permissions;
- broader contextual assistance;
- classification and extraction;
- decision support;
- evaluation and human-in-the-loop controls;
- multi-provider/fallback policy where justified.

These capabilities must remain truthfully maturity-labeled until runtime architecture, evaluation, governance, and production evidence support promotion.

### Observability Layer — PARTIAL

Current shared evidence includes:

- `/api/health` and database-schema compatibility probing;
- structured JSON logs with recursive secret redaction;
- versioned telemetry schema;
- validated request/correlation IDs;
- W3C `traceparent` parsing and propagation on critical health/knowledge paths;
- safe error classification and opaque fingerprints without raw exception-message logging on adopted paths.

Centralized telemetry storage, time-series metrics, broad distributed tracing, SLOs and alert routing remain future work. See `docs/architecture/OBSERVABILITY.md`.

### Infrastructure Layer — LIVE

Current delivery model:

```text
branch
  ↓
pull request
  ↓
GitHub Actions
  ↓
tests + audit + lint + typecheck + build + browser journeys + clean PostgreSQL contracts
  ↓
merge to main
  ↓
Render Web Service
  ↓
ctgone.com
```

## Operating layer

The business units are not presented as software clients. They are the operating environments in which CTG One can apply, validate, and improve shared technology.

Current ecosystem includes:

- PISÁO Gastrobar
- CTG Craft Beer
- Bechara Real Estate
- Valderrama International School
- Nvet Care
- Oralgreen
- Legalyst Consultores
- CTG One Design
- Vantage Libranza Plus
- CTG Suites
- Guest Logistics Concierge
- CTG One Technology

## First verifiable case study

CTG Craft Beer Investment is currently the strongest proof of the CTG One model.

It connects software with a physical operating context and includes concepts around:

- authentication;
- production batches;
- allocations;
- inventory;
- ledger;
- settlements;
- participant dashboards;
- administrative dashboards;
- security boundaries.

The architecture should be used as a reference case for future bounded contexts, not copied blindly across all business units.

## Architectural rules

1. Shared capabilities should only become platform services when reuse is proven.
2. Business-specific logic must remain inside bounded contexts.
3. A capability cannot be labeled LIVE based only on installed dependencies or mock UI.
4. Shared identity and data access should avoid duplicated implementations.
5. Transactional systems require auditability and explicit authorization boundaries.
6. AI systems require governance, evaluation, and human oversight before consequential production use.
7. Web3 claims require independently verifiable on-chain evidence.
8. Observability must be implemented before CTG One OS can be considered operationally mature.

## Next architectural milestones

### P1

- expand W3C trace context and safe error envelopes across critical mutation APIs;
- define service-level indicators for authentication, Investment checkout/payment and CTG Knowledge;
- select a centralized telemetry/error-monitoring sink with explicit privacy and retention controls;
- keep production recovery procedures evidence-backed rather than documentation-only.

### P2

- define a shared integration layer;
- advance one narrow AI use case through authorized evaluation and operating evidence;
- establish event/audit conventions across bounded contexts;
- publish technology case studies with verifiable architecture.

### P3

- evaluate event-driven architecture where justified;
- consolidate operational analytics and SLO/error-budget reporting;
- create reusable developer platform components;
- promote mature shared modules from PARTIAL to LIVE only after production evidence exists.
