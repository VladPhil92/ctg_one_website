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
| AI Runtime | IN DEVELOPMENT | No general production agent/RAG runtime verified yet |
| Observability | ROADMAP | Advanced metrics, tracing, alerting, and centralized error monitoring not yet consolidated |
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

Target capabilities include:

- AI agents;
- RAG;
- contextual assistance;
- classification and extraction;
- decision support;
- evaluation and human-in-the-loop controls.

These capabilities must remain labeled IN DEVELOPMENT until provider integrations, runtime architecture, evaluation, governance, and production evidence exist.

### Infrastructure Layer — LIVE

Current delivery model:

```text
branch
  ↓
pull request
  ↓
GitHub Actions
  ↓
typecheck + Next.js build
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

- formalize shared identity boundaries;
- map shared data versus bounded-context data;
- add automated testing for critical flows;
- introduce centralized error monitoring;
- document production recovery procedures.

### P2

- define a shared integration layer;
- build one narrow production AI use case with evaluation;
- establish event/audit conventions across bounded contexts;
- publish technology case studies with verifiable architecture.

### P3

- evaluate event-driven architecture where justified;
- consolidate operational analytics;
- create reusable developer platform components;
- promote mature shared modules from PARTIAL to LIVE only after production evidence exists.
