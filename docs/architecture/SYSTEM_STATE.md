# CTG One — Authoritative System State

Status: **CURRENT GOVERNANCE MAP**

This document does not duplicate runtime state. It defines where each class of truth lives so documentation, public claims, CI and production do not drift independently.

For repository navigation, start with `docs/README.md`.

## Source-of-truth registry

| Concern | Authoritative source | Verification |
|---|---|---|
| Application dependencies/runtime versions | `package.json` | CI install, typecheck and build |
| Expected database migration | `src/lib/observability/schema-version.ts` | migration-integrity tests + `/api/health` |
| Migration implementation/history in Git | `supabase/migrations/` | clean-database CI job |
| Runtime database compatibility | `src/lib/observability/runtime-schema.ts` | `/api/health` + Admin System Health |
| Public capability maturity | `src/data/technology-proof.ts` | capability-truth CI invariants + `/technology/status` |
| Public ecosystem registry | `src/data/content.ts` | content/web-quality invariants |
| Ecosystem technology mapping | `src/data/ecosystem-technology.ts` | capability-truth/web-quality invariants |
| Production deployment identity | Render environment + `src/lib/observability/deployment.ts` | `/api/health` and structured logs |
| Structured logging contract | `src/lib/observability/logger.ts` | observability CI invariants |
| Request correlation | `src/lib/observability/request-context.ts` | observability CI invariants |
| HTTP security policy | `next.config.js` and route-level guards | HTTP security invariants |
| Recovery policy | `docs/infrastructure/BACKUP_RESTORE.md` | recovery-readiness invariants; real restore drill remains separately evidenced |
| CI contract | `.github/workflows/ci.yml` + `package.json` scripts | GitHub Actions |
| Investment financial/operational truth | PostgreSQL migrations/RPCs and persisted domain facts | Golden Path clean database contract |
| Wallet balance/ledger authority | Wallet V2 PostgreSQL ledger and server boundaries | wallet invariants + reconciliation contracts |
| Education commerce/learning authority | `src/app/api/education/**`, education migrations/RPCs and persisted enrollments/attempts/orders | education invariants + Wompi/assessment Golden Paths |
| Education public/learner surfaces | `src/app/jpvalderrama/**` + `src/app/dashboard/educacion/**` | education invariants + build/browser checks |
| Federation contracts | `src/app/api/federation/**` + `docs/federation/` | federation/security invariants and authenticated server-side validation |
| High-level shared architecture | `docs/architecture/CTG_ONE_OS.md` + ADRs | architecture review; never overrides runtime sources above |

## Current system classification

CTG One is a **modular monolith** built with Next.js/React/TypeScript and Supabase/PostgreSQL, deployed on Render and gated by GitHub Actions. PostgreSQL remains authoritative for financial and operational facts. Presentation code must not become the source of truth for money, inventory, settlement, entitlements, permissions, KYC assurance or capability maturity.

The repository contains multiple bounded contexts with different maturity levels. Major areas currently include Identity/KYC, Wallet/Saldo CTG, CTG Craft Beer Investment, JP Valderrama education/Campus/Learning Center, CTG Knowledge, Nvet Care federation, VÉRTICE federation, observability, security and shared operational tooling.

## Database versioning rule

Never infer the current database version from prose documentation. Read:

- `EXPECTED_DATABASE_MIGRATION`
- `EXPECTED_DATABASE_MIGRATION_NAME`
- `EXPECTED_DATABASE_MIGRATION_COUNT`

from `src/lib/observability/schema-version.ts`, and compare them with runtime schema health. Existing applied migration files are immutable; corrections are new contiguous migrations.

Do not downgrade these constants on a feature branch to match an older migration introduced by that branch. A branch must reconcile with the latest `main` schema chain.

## Capability maturity rule

Public maturity is governed only by `src/data/technology-proof.ts`. A feature, dependency, design document, prototype or UI surface does not promote a capability to production. Public stages include controlled states such as `BETA`, `PARTIAL`, `IN DEVELOPMENT` and `ROADMAP` where applicable.

## Financial and entitlement rule

Consequential state transitions remain server/database authoritative.

Examples include:

- wallet credits/debits;
- investment allocation/settlement;
- payment verification;
- education payment settlement and entitlement activation;
- KYC verification and assurance elevation.

Browser redirects, client state, uploaded proof alone or manually fabricated provider state must never become equivalent to verified settlement or authorization.

## Education commerce rule

For education offerings with a published fixed price, the canonical path is direct purchase:

```text
published price
→ server-authoritative order
→ payment provider checkout
→ signed provider verification
→ settlement
→ entitlement/access
```

Quotation remains an exception path for genuinely custom services without a fixed published price. Documentation and UI must not reintroduce a quotation wait step into fixed-price checkout.

## Recovery truth

Schema reconstructability is continuously tested from an empty PostgreSQL instance in CI. That is not equivalent to a verified production-data restore. Database and Storage backup/restore readiness must be described according to `docs/infrastructure/BACKUP_RESTORE.md`, including any `UNVERIFIED` status until a real isolated restore drill has been completed and evidenced.

## Historical documents

Audits, gap analyses, migration notes and phase reports are historical snapshots unless this file explicitly designates them as an authority. Historical files must not use names or wording that imply they are current runtime truth.

The obsolete `docs/architecture/REPOSITORY_AUDIT_CURRENT.md` snapshot was removed because it duplicated a now-invalid model of repository state and its name was actively misleading.

## Branch and PR hygiene

Before final review or merge:

1. synchronize the branch with the latest `main`;
2. inspect the final diff against `main`;
3. confirm conflict resolution did not duplicate constants, JSON records, JSX blocks, imports, tests or migration metadata;
4. run the required CI contract;
5. if the final delta is empty because newer work already superseded the branch, close the PR instead of manufacturing a merge.

## Change discipline

When changing a governed concern:

1. change the authoritative implementation/source;
2. add or update the relevant invariant/test;
3. update explanatory documentation only when necessary;
4. never create a second independent manual registry of the same runtime fact;
5. if production state differs from Git, fail closed and reconcile before claiming health.

This file is intentionally compact. Its purpose is to tell engineers and coding agents **where to look**, not to mirror data that can be derived from code or production.