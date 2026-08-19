# Existing Site Integration Map

This document records the current integration boundary for **CTG Craft Beer Inversión** inside `ctgone.com`. It exists to keep the investment bounded context additive, auditable, and compatible with the rest of CTG One Technology.

```text
ctgone.com
├── CTG One Technology
│   ├── public technology and ecosystem surfaces
│   ├── identity/account surfaces
│   ├── protected dashboard and admin surfaces
│   └── shared infrastructure, observability and data services
└── /inversion
    ├── /inversion
    ├── /inversion/como-funciona
    ├── /inversion/lotes
    ├── /inversion/simulador
    ├── /inversion/riesgos
    ├── /inversion/legal
    ├── /inversion/app/*
    └── /inversion/admin/*
```

## Current stack

The authoritative dependency versions live in `package.json`. At the current baseline the application uses:

| Concern | Current state |
|---|---|
| Framework | Next.js 16 App Router, TypeScript, React 19 |
| Runtime | Node 22.22.x |
| Package manager | npm (`package-lock.json`) |
| Styling | Tailwind CSS 3, shared design tokens and hand-rolled UI components |
| Database | Supabase PostgreSQL with additive migrations under `supabase/migrations/` |
| Auth | Supabase Auth through `@supabase/ssr` |
| API model | Next.js Route Handlers plus PostgreSQL RPC boundaries |
| Deployment | Render Web Service from `main`, configured by `render.yaml` and production environment settings |
| Health | `/api/health` plus Admin System Health |
| CI | GitHub Actions: invariants, dependency audit, typecheck, production build, Playwright E2E and clean-database contracts |
| Browser E2E | Playwright / Chromium |
| Observability | structured logging, request/correlation IDs, schema/runtime compatibility and deployment identity |

Do not duplicate dependency versions in downstream documentation when a precise version is not required; `package.json` is authoritative.

## Integration principles

1. Existing CTG One Technology functionality must remain operational while `/inversion` evolves.
2. Investment-domain financial and operational state remains namespaced and auditable.
3. Existing identity is reused rather than creating a second authentication system.
4. Authoritative financial calculations remain server/database-side.
5. Money uses integer minor units; no floating-point accounting.
6. Financial history, ledger movements, settlements, withdrawals and audit records are never hard-deleted.
7. Production-lot and inventory transitions must use their authorized domain boundaries rather than direct client-side table writes.
8. Public maturity claims derive from `src/data/technology-proof.ts` rather than from the mere presence of code.

## Current safe extension points

- `src/app/inversion/**`
- `src/app/api/investment/**`
- investment-domain components and server/query libraries
- additive, contiguous Supabase migrations
- domain invariant scripts and PostgreSQL contract tests
- dedicated admin/operations surfaces when authorization and audit requirements are preserved

Changes outside those areas are allowed only when the task explicitly concerns a shared CTG One Technology capability and the change preserves the documented source-of-truth hierarchy.

## Shared capabilities intentionally reused

### Identity

Participant identity reuses the CTG One Supabase account system. Investment-specific profile, role and financial data remain domain-specific.

### Infrastructure

The investment bounded context shares the same Next.js runtime, Render deployment pipeline, health surface, logging conventions and CI gates as the rest of the application.

### Data and security

RLS, server-side authorization, `SECURITY DEFINER` exposure review, auditability and schema reconstruction are shared engineering requirements. Investment-domain writes remain constrained by dedicated RPC/state-machine boundaries.

### Operations

Production, serialization, canonical inventory, Sales OS, financial facts and settlement now form a closed-loop operational chain. New implementation work must preserve reconciliation between these layers.

## Deployment contract

The intended delivery path is:

```text
feature branch
→ pull request
→ required GitHub Actions checks
→ merge to main
→ Render Web Service
→ /api/health and production smoke verification
```

`render.yaml` defines the repository-side Render contract, including Node runtime, build/start commands, health path and required environment variables. Production truth must still be verified against the live service; repository configuration alone is not proof of a successful deployment.

## Testing contract

Before an investment-domain or shared-platform change is considered complete, use the applicable gates defined in `.github/workflows/ci.yml` and `package.json`, including:

```bash
npm test
npm run audit:critical
npx tsc --noEmit
npm run build
npx playwright test --project=chromium
```

The clean-database CI job must continue to reconstruct the complete migration chain and execute the Golden Path and security contracts.

## Source-of-truth references

- `package.json` — dependency/runtime contract
- `.github/workflows/ci.yml` — CI contract
- `render.yaml` — repository-side Render contract
- `src/data/technology-proof.ts` — public capability maturity
- `src/lib/observability/schema-version.ts` — expected database release
- `docs/architecture/SYSTEM_STATE.md` — source-of-truth map
- `docs/investment/PRODUCT_CONSTITUTION.md` — investment product constraints
- `docs/investment/BUSINESS_MODEL.md` — approved business rules and pending decisions

This file should be updated whenever the integration boundary materially changes. It must not preserve obsolete stack or deployment assumptions.
