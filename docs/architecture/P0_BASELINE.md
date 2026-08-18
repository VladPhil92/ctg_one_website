# P0 Baseline — CTG One Technology

Date: 2026-08-18
Baseline branch source: `main`
Baseline commit: `790f722032742f93cb9ccbe2b7d914c4acce6a0f`

## Purpose

This document freezes the repository baseline used for the P0 stabilization program. It is evidence, not a product roadmap. It must not be used to infer that a capability is production-ready unless the corresponding code, database state, configuration and tests all agree.

## Repository/runtime baseline

- Next.js 16.3.1
- React 19.2.8
- TypeScript
- Node.js 22.22.0
- Supabase/PostgreSQL/Auth/Storage/RLS
- Render Web Service
- GitHub Actions CI
- Expected repository database migration: `0045`
- Migration files are sequentially numbered `0001` through `0045`.

## Current verified controls

- Repository migration filenames are checked for continuity and duplicate version numbers.
- `EXPECTED_DATABASE_MIGRATION` must equal the latest repository migration.
- CI runs critical invariant tests, production dependency audit, TypeScript, Next.js build and Playwright E2E.
- Render deploys after checks pass and uses `/api/health` as its health check path.
- Investment feature flags default closed when unset.

## Known P0 gap

Repository migration integrity is currently only repository-local. The application does not yet prove that the production Supabase schema actually matches the expected repository migration before reporting itself healthy. `/api/health` currently validates configuration/deployment metadata but not authoritative database schema compatibility.

## P0 rules

1. Never rewrite an already-published migration to repair production.
2. Repair schema defects only with a new forward migration.
3. Never use `IF NOT EXISTS` merely to suppress an unknown inconsistent state.
4. Do not delete production data to make migrations pass.
5. A capability is not considered verified merely because source files exist.
6. `main` is not modified directly during the P0 stabilization program.
7. Any schema compatibility failure must fail closed for sensitive operations.

## Evidence model

A capability may be classified as production-ready only when all applicable evidence agrees:

`source code -> configuration -> database schema -> authorization -> automated tests -> deployment`

## Next control to implement

Create a production-safe schema compatibility probe so runtime health can distinguish at least:

- expected migration
- observed database migration/schema capability
- compatible
- incompatible
- unavailable

The probe must not expose secrets or require destructive database changes.
