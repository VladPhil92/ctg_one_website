# CTG One — Authoritative System State

Status: **CURRENT GOVERNANCE MAP**

This document does not duplicate runtime state. It defines where each class of truth lives so documentation, public claims, CI and production do not drift independently.

## Source-of-truth registry

| Concern | Authoritative source | Verification |
|---|---|---|
| Application dependencies/runtime versions | `package.json` | CI install, typecheck and build |
| Expected database migration | `src/lib/observability/schema-version.ts` | migration-integrity tests + `/api/health` |
| Migration implementation/history in Git | `supabase/migrations/` | clean-database CI job |
| Runtime database compatibility | `src/lib/observability/runtime-schema.ts` | `/api/health` + Admin System Health |
| Public capability maturity | `src/data/technology-proof.ts` | capability-truth CI invariants + `/technology/status` |
| Ecosystem technology mapping | `src/data/ecosystem-technology.ts` | capability-truth/web-quality invariants |
| Production deployment identity | Render environment + `src/lib/observability/deployment.ts` | `/api/health` and structured logs |
| Structured logging contract | `src/lib/observability/logger.ts` | observability CI invariants |
| Request correlation | `src/lib/observability/request-context.ts` | observability CI invariants |
| HTTP security policy | `next.config.js` and relevant route-level guards | HTTP security invariants |
| Recovery policy | `docs/infrastructure/BACKUP_RESTORE.md` | recovery-readiness invariants; real restore drill remains separately evidenced |
| CI contract | `.github/workflows/ci.yml` + `package.json` scripts | GitHub Actions |
| Investment financial/operational truth | PostgreSQL migrations/RPCs and persisted domain facts | Golden Path clean database contract |
| High-level shared architecture | `docs/architecture/CTG_ONE_OS.md` + ADRs | architecture review; never overrides runtime sources above |

## Current system classification

CTG One is a **modular monolith** built with Next.js/React/TypeScript and Supabase/PostgreSQL, deployed on Render and gated by GitHub Actions. PostgreSQL remains authoritative for financial and operational facts. Presentation code must not become the source of truth for money, inventory, settlement, permissions or capability maturity.

## Database versioning rule

Never infer the current database version from prose documentation. Read:

- `EXPECTED_DATABASE_MIGRATION`
- `EXPECTED_DATABASE_MIGRATION_NAME`
- `EXPECTED_DATABASE_MIGRATION_COUNT`

from `src/lib/observability/schema-version.ts`, and compare them with runtime schema health. Existing applied migration files are immutable; corrections are new contiguous migrations.

## Capability maturity rule

Public maturity is governed only by `src/data/technology-proof.ts`. A feature, dependency, design document, prototype or UI surface does not promote a capability to production. Public stages include the controlled `BETA` release stage where applicable; technical implementation status may remain `PARTIAL` while the public release is BETA.

## Recovery truth

Schema reconstructability is continuously tested from an empty PostgreSQL instance in CI. That is not equivalent to a verified production-data restore. Database and Storage backup/restore readiness must be described according to `docs/infrastructure/BACKUP_RESTORE.md`, including any `UNVERIFIED` status until a real isolated restore drill has been completed and evidenced.

## Historical documents

Documents named as audits, gap analyses or phase reports are historical snapshots unless this file explicitly designates them as an authority. In particular, `docs/architecture/REPOSITORY_AUDIT_CURRENT.md` is retained only for historical traceability and is **SUPERSEDED** by this governance map plus the runtime sources listed above.

## Change discipline

When changing a governed concern:

1. change the authoritative implementation/source;
2. add or update the relevant invariant/test;
3. update explanatory documentation only when necessary;
4. never create a second independent manual registry of the same runtime fact;
5. if production state differs from Git, fail closed and reconcile before claiming health.

This file is intentionally compact. Its purpose is to tell engineers and coding agents **where to look**, not to mirror data that can be derived from code or production.