# CTG One Documentation Map

This directory contains architecture, operations, security, product and historical documentation for `ctg_one_website`.

The documentation model is intentionally **source-of-truth oriented**: prose explains contracts and procedures, while mutable runtime facts remain derived from code, CI and production evidence.

## Start here

1. `architecture/SYSTEM_STATE.md` — authoritative registry of where each class of truth lives.
2. `architecture/CTG_ONE_OS.md` — shared architecture and bounded-context model.
3. `architecture/ECOSYSTEM_CONTRACT_REGISTRY.md` — CTG One / Wallet / Nvet and other cross-product contracts.
4. `infrastructure/PRODUCTION_READINESS.md` — deployment and production-readiness controls.
5. `infrastructure/PRODUCTION_REPOSITORY_PARITY.md` — GitHub/Render/runtime/public-claim parity verification.
6. `infrastructure/BACKUP_RESTORE.md` — recovery policy and evidence requirements.
7. `infrastructure/OBSERVABILITY.md` — observability and runtime health.

## Runtime authorities

Do not copy these values into prose as permanent facts:

| Concern | Authority |
|---|---|
| Dependency/runtime versions | `package.json` |
| Database migration expectation | `src/lib/observability/schema-version.ts` |
| Migration history in Git | `supabase/migrations/` |
| Public capability maturity | `src/data/technology-proof.ts` |
| Public directory navigation/descriptions | `src/config/dashboard-services.ts` |
| Ecosystem public registry | `src/data/content.ts` |
| Deployment identity / runtime schema health | `/api/health` + Admin System Health + Render deployment identity |
| CI contract | `.github/workflows/ci.yml` + `package.json` |

When a dashboard/public-directory service corresponds to a capability already registered in `src/data/technology-proof.ts`, its maturity must be **derived from that registry**. `dashboard-services.ts` is not a second authority for technical maturity.

## Domain documentation

### Architecture

`architecture/` contains the shared platform model, system-state registry, ADR-style architectural guidance and ecosystem integration contracts.

### Identity

`identity/` documents account, KYC and identity-boundary behavior. Identity elevation must fail closed when canonical verification cannot be established.

### Wallet

Wallet documentation spans `wallet`-related documents retained at the `docs/` root plus architecture/integration material. The canonical balance authority is the Wallet V2 ledger contract implemented in code/database; documentation must not invent enabled rails from UI presence alone.

### Investment

`investment/` contains the CTG Craft Beer Investment domain constitution, business rules, testing, operating evidence and architecture decisions. Financial truth remains server/database-side and append-only where required. Public maturity remains evidence-gated by `src/data/technology-proof.ts`.

### Education / JP Valderrama

The education bounded context is implemented across JP Valderrama public surfaces, Campus, Learning Center, learner dashboards, instructor/admin operations and education APIs/migrations. Fixed-price offerings use the current server-authoritative instant-checkout flow; genuinely custom services may use inquiry/quotation paths.

Primary implementation surfaces include:

- `src/app/jpvalderrama/**`
- `src/app/dashboard/educacion/**`
- `src/app/api/education/**`
- education migrations under `supabase/migrations/`
- education invariants under `scripts/`

### Nvet Care

`nvetcareapp/` documents the federated veterinary bounded context and CTG One integration boundaries. Nvet keeps authority over its domain-specific business logic while CTG One provides shared identity/integration surfaces where explicitly contracted.

### Federation

`federation/` contains server-to-server federation contracts, including VÉRTICE integration. Federation claims must be minimal, authenticated, validated and fail closed for assurance elevation.

### AI / Knowledge

`ai/` documents CTG Knowledge, evaluation and governed AI capabilities. AI maturity claims must remain consistent with `src/data/technology-proof.ts` and operating evidence.

### Infrastructure / Operations / Runbooks / Security

- `infrastructure/` — deployment, production/repository parity, recovery, E2E and observability.
- `operations/` — operational-domain guidance.
- `runbooks/` — executable incident/operational procedures.
- `security/` — security boundaries and hardening documentation.

### Products / SEO

- `products/` — product-specific documentation and evidence.
- `seo/` — search/discovery implementation guidance.

## Historical documents

Audits, phase reports, migration notes and implementation snapshots are not current authorities unless `architecture/SYSTEM_STATE.md` explicitly says otherwise.

A historical document should be retained only when it provides useful provenance. If it is misleading, redundant and superseded by authoritative sources, remove it rather than keeping a file whose name suggests current state.

## Documentation hygiene rules

- Prefer links to authoritative code/runtime sources over manually copied version numbers.
- Do not maintain duplicate maturity matrices or migration registries in prose.
- Public maturity badges and product claims must follow `src/data/technology-proof.ts` where a capability is registered there.
- Verify GitHub `main` SHA against the actual Render production SHA after release; source parity and semantic parity are separate checks.
- Update architecture/operational docs when a contract changes materially.
- Keep historical snapshots clearly labeled as historical.
- Remove obsolete documents when they no longer add traceability value.
- Do not merge a PR with an empty final delta against `main`; close it as superseded.
- After resolving merge conflicts, check for duplicated constants, JSON objects, imports, JSX blocks, tests and migration-history entries before CI.
