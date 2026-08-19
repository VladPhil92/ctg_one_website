# CTG One Technology — Repository Audit (Historical Snapshot)

> **SUPERSEDED — DO NOT USE AS CURRENT SYSTEM STATE**
>
> Original audit date: **2026-08-16**.
>
> This document is retained only for historical traceability. The repository evolved materially after this snapshot: Sales OS, clean-database Golden Path verification, schema compatibility health, idempotency hardening, CSP/rate limiting, capability-truth governance, web-quality improvements and structured request correlation were subsequently implemented.
>
> For current state, use `docs/architecture/SYSTEM_STATE.md`, which identifies the authoritative source for each runtime concern. Runtime facts such as database migration version and capability maturity must be read from code/production sources, not from this historical audit.

## Why this document was superseded

The former title `REPOSITORY_AUDIT_CURRENT.md` implied that narrative prose was an authoritative live system inventory. That model created documentation drift because implementation changed faster than the audit could be rewritten. The file name is preserved to avoid breaking historical links, but its authority is explicitly revoked.

## Historical context

On 2026-08-16 the audit correctly identified CTG One as a modular full-stack application using Next.js, Supabase/PostgreSQL, Render and GitHub Actions, with a growing investment bounded context and a need for stronger testing, security, observability and architectural boundaries.

Many of its listed gaps have since been addressed. Some long-term recommendations remain relevant, including modular-monolith discipline, continued component decomposition, Document/Notification OS, transactional domain events/outbox, incident tooling, verified backup/restore drills and read-only-first operational AI.

## Current authorities

Consult the following instead of this file:

- `docs/architecture/SYSTEM_STATE.md` — source-of-truth governance map;
- `src/lib/observability/schema-version.ts` — expected database migration identity/count;
- `supabase/migrations/` — migration implementation history in Git;
- `src/data/technology-proof.ts` — public capability maturity;
- `.github/workflows/ci.yml` and `package.json` — CI contract;
- `docs/infrastructure/BACKUP_RESTORE.md` — recovery policy;
- `/api/health` and Admin System Health — deployed/runtime compatibility.

Historical audit conclusions must never override those sources.