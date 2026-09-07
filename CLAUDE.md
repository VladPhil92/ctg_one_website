# CLAUDE.md

Repository-wide engineering guidance for `ctgone.com` / `VladPhil92/ctg_one_website`.

## Read this first

This repository is no longer an isolated marketing site with one new Investment module. It is a production-oriented **modular monolith** containing shared CTG One platform capabilities and multiple bounded contexts.

Before changing a governed concern, consult:

- `docs/README.md` — documentation map and authority rules;
- `docs/architecture/SYSTEM_STATE.md` — source-of-truth registry;
- `docs/architecture/CTG_ONE_OS.md` — shared architecture;
- `docs/architecture/ECOSYSTEM_CONTRACT_REGISTRY.md` — cross-product contracts;
- `src/data/technology-proof.ts` — public capability maturity;
- `src/lib/observability/schema-version.ts` — expected database migration identity/count;
- `.github/workflows/ci.yml` and `package.json` — CI contract.

Domain-specific work must also read the relevant documentation under `docs/<domain>/`.

## Architecture

The application is a Next.js/React/TypeScript modular monolith backed by Supabase/PostgreSQL and deployed on Render. PostgreSQL and server-side code remain authoritative for money, settlement, inventory, entitlements, identity elevation, permissions and other consequential state.

Major bounded contexts include:

- Identity / KYC / account lifecycle;
- Wallet / Saldo CTG / canonical ledger;
- CTG Craft Beer Investment;
- JP Valderrama education, Campus and Learning Center;
- CTG Knowledge;
- Nvet Care federation;
- VÉRTICE federation;
- shared observability, security and operational tooling.

Do not assume two contexts share the same maturity merely because they live in one repository.

## NEVER

- Never rewrite or edit an already-applied migration; add a new contiguous migration.
- Never downgrade `EXPECTED_DATABASE_MIGRATION*` to an older migration to make a branch pass.
- Never resolve merge conflicts by keeping both versions of constants, JSON entries, JSX blocks, tests or imports.
- Never bypass server/database authorization boundaries for financial, entitlement, KYC, wallet, inventory or settlement mutations.
- Never use floating-point arithmetic for authoritative money calculations.
- Never hard-delete append-only financial/audit facts when the domain requires reversals or lifecycle transitions.
- Never expose service-role credentials, private documents, KYC artifacts or secrets to browser code or Git.
- Never promote a capability to `LIVE` from prose, UI presence, an installed dependency or a prototype. Public maturity is governed by `src/data/technology-proof.ts` and production evidence.
- Never invent business rules, financial formulas, settlement evidence or provider confirmations.
- Never merge a PR whose intended work is already present in `main`; close it as superseded when the final diff is empty.
- Never perform broad unrelated refactors inside a narrowly scoped fix.

## ALWAYS

- Sync with the latest `main` before final review and inspect the resulting diff for duplicate conflict-resolution artifacts.
- Keep bounded-context logic scoped and use explicit contracts for cross-context integration.
- Revalidate authorization server-side for consequential operations.
- Use idempotency for payment, ledger, settlement and other retry-sensitive workflows.
- Add or update invariants/tests when changing a governed boundary.
- Run the repository quality gates appropriate to the change, including `npm test`, production dependency audit, typecheck and production build.
- Preserve fail-closed behavior when runtime state, capability evidence or external-provider state is uncertain.
- Update explanatory documentation when architecture, operational procedures or developer guidance materially changes.
- Treat `README.md` as an overview, not a runtime state database.

## Pull-request hygiene

Before merge:

1. update the branch from the latest `main`;
2. inspect the complete changed-file list and diff;
3. verify conflict resolution did not duplicate declarations, JSON records, JSX, tests or migration metadata;
4. confirm the PR still has an intentional delta against `main`;
5. run required CI;
6. if the delta is empty because later work already superseded it, close the PR instead of manufacturing a merge.

## Database discipline

Legacy migrations `0001`–`0071` remain grandfathered. Newer migrations use timestamped contiguous logical versions. The authoritative current expectation is always the value in `src/lib/observability/schema-version.ts`; do not copy a migration number into documentation as a permanent fact.

## Documentation discipline

Historical audits and phase reports are snapshots, not current system state. Current truth must be derived from the authoritative sources listed in `docs/architecture/SYSTEM_STATE.md`. When a historical document becomes misleading, either archive it clearly or remove it when it no longer provides useful traceability.
