# Testing Strategy — CTG Craft Beer Inversión

Status: **IMPLEMENTED**

## Current repo baseline

A real automated suite exists and is a required CI gate
(`.github/workflows/ci.yml`, job "Test, typecheck and build"). The list
below is illustrative — `package.json`'s `test` script is authoritative for
exactly which invariant scripts run; do not let this file drift into a second
manual registry of that list.

```bash
npm test                          # ~50 Node invariant scripts (no framework — plain assertions)
npm run audit:critical            # production dependency audit, high severity threshold
npm run lint                      # pinned Oxlint; JS/TS/TSX + React/JSX-a11y/Next.js, warnings fail CI
npx tsc --noEmit                  # TypeScript
npm run build                     # Next.js production build + prerender
npx playwright test --project=chromium   # browser E2E, tests/e2e/*.spec.mjs
```

`npm test` includes a clean-database Golden Path job in CI that reconstructs
the full migration chain from empty and then runs the domain contracts
against it (`scripts/test-golden-path-contract.mjs`,
`scripts/investment-operational-golden-journey.sql`) — this is what proves
the schema and RPCs are reconstructible, not just that today's database
happens to work.

`npm run lint` is a separate fail-closed quality gate. It runs pinned Oxlint
against `src`, `scripts`, and `tests`, enables the React, JSX accessibility
and Next.js rule plugins, and treats warnings as CI failures. It complements
rather than replaces TypeScript, build validation or browser E2E.

## What the invariant scripts actually cover

Grouped by concern (see `scripts/test-*.mjs` for the exact current set):

**Financial / economic**
- `test-economic-invariants.mjs`, `test-closed-loop-invariants.mjs` —
  `ParticipantProfit + CTGProfit == NetDistributableProfit`, ledger
  credits/debits reconcile to the derived balance, a finalized settlement
  is immutable, reversal-only correction (ADR-003/ADR-004).
- `test-investment-operational-golden-journey-invariants.mjs` — the full
  funding → production → sale → settlement → reinvestment/withdrawal loop
  conserves value end to end.
- `test-investment-reinvestment-invariants.mjs`,
  `test-finance-reinvestment-queue-invariants.mjs` — every reinvested
  amount traces to its source settlement; approvals are immutable
  server-side commands, never quantity/capital overrides.
- `test-order-idempotency-invariants.mjs`,
  `test-investment-checkout-boundary-invariants.mjs` — checkout cannot
  double-spend or double-allocate.
- `test-payment-rails-invariants.mjs`,
  `test-provider-reconciliation-invariants.mjs`,
  `test-manual-bank-verification-invariants.mjs` — payment/payout
  reconciliation invariants.

**Inventory / production**
- `test-inventory-reconciliation-invariants.mjs` — no negative inventory,
  movements reconcile, sales never exceed available eligible inventory,
  damaged/returned units stay traceable.
- `test-sales-returns-invariants.mjs` — returned units never exceed
  documented sold units; credit notes stay bounded by the original sale.

**Authorization / KYC**
- `test-kyc-resilience-invariants.mjs`, `test-governance-invariants.mjs`,
  `test-admin-pagination-invariants.mjs` — role separation (`PARTICIPANT`
  cannot reach admin surfaces or another participant's data,
  `PRODUCTION_MANAGER` cannot approve withdrawals, etc. — enforced in
  PostgreSQL, not just UI hiding).

**Release governance / production readiness**
- `test-investment-production-readiness-invariants.mjs`,
  `test-investment-production-readiness-evidence-invariants.mjs`,
  `test-investment-operating-evidence-invariants.mjs`,
  `test-investment-release-gate-invariants.mjs` — the Phase 18/19/20/21
  canary, evidence-capture and release-gate-matrix contracts described in
  `PRODUCTION_READINESS_EVIDENCE.md`, `OPERATING_EVIDENCE_CAPTURE.md`, and
  `RELEASE_GATE_MATRIX.md`.

**Public truth**
- `test-public-investment-opportunity-invariants.mjs`,
  `test-public-lot-operational-invariants.mjs` — what `/inversion` and
  `/inversion/lotes/*` show publicly never overstates real lot state.

## Browser E2E (Playwright, `tests/e2e/*.spec.mjs`)

Real, committed, and run in CI (`playwright.config.mjs`, `es-CO` locale,
`America/Bogota` timezone, Chromium): `auth.spec.mjs`,
`critical-authenticated.spec.mjs`, `critical-boundaries.spec.mjs`,
`home-accessibility.spec.mjs`, `public-command-center.spec.mjs`,
`brand-name.spec.mjs`, and `investment-economics.spec.mjs` for the
Investment-specific browser journey.

## Zero-regression requirement for every PR touching this initiative

Before merging: the full `npm test` + dependency audit + lint + typecheck +
build + Playwright gate above must be green — CI enforces this on every PR
against `main` (`.github/workflows/ci.yml`), not just a manual pass. "The
investment app works but the homepage broke" is never an acceptable outcome;
the E2E specs above cover the existing protected/public routes precisely so
that stays true automatically rather than by memory.

## Adding tests for new investment work

New financial/inventory/authorization logic gets a new or extended
`scripts/test-*-invariants.mjs` (plain Node assertions, no framework, matches
every existing script) wired into `package.json`'s `test` script, plus a
Playwright spec under `tests/e2e/` for anything with a new user-facing flow.
Keep new scripts scoped to one concern per file, matching the existing
naming convention (`test-<concern>-invariants.mjs`).
