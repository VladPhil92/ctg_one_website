# Investment Roadmap — Work Plan Snapshot

Status: **SNAPSHOT — NOT A RUNTIME AUTHORITY**

This is a point-in-time work plan for CTG Craft Beer Inversión, written after
a repository audit. Like `docs/architecture/REPOSITORY_AUDIT_CURRENT.md`,
it will drift as work lands. For live facts, always defer to
`docs/architecture/SYSTEM_STATE.md`'s source-of-truth registry
(`src/data/technology-proof.ts` for capability maturity,
`docs/investment/RELEASE_GATE_MATRIX.md` for release eligibility,
`docs/investment/BUSINESS_MODEL.md` for business-rule status). This file
should be revised or superseded rather than trusted blindly once those
sources move on.

Audit date: **2026-08-22**.

## Audit summary

- Repository health: `npm test` (49 invariant suites), `npx tsc --noEmit`,
  `npm run build`, and `npm run audit:critical` all pass clean on `main`
  (`fe1e190`). No high/critical dependency vulnerabilities.
- Scale: 67 additive Supabase migrations, 20 merged "Investment" phases,
  ~172 investment-scoped commits, all landed in the ~6 days since
  `PRODUCT_CONSTITUTION.md` was first committed (2026-08-15). This has been
  an unusually fast, densely phased build-out — governance discipline
  (ADRs, fail-closed gates, evidence separation) is what has kept it
  reviewable rather than the pace alone.
- Capability maturity: `investment-platform` is `PARTIAL` (technical) /
  `BETA` (public) in `technology-proof.ts` — unchanged and correctly
  conservative throughout.
- Release governance (Phase 20, `RELEASE_GATE_MATRIX.md`): technical
  contract can PASS; production canary evidence, reviewed production
  operating evidence, and all five `BR-*` business decisions remain
  `PENDING`/`BLOCKED_DECISION` by design. Public funding/registration and
  automatic money movement stay fail-closed (`SAFE_CLOSED`). No automatic
  LIVE promotion path exists.
- In flight: **PR #166** (`investment/production-readiness-evidence`,
  draft, base `main`) — Phase 21, extends the Phase 18 canary into a
  versioned, archived production-readiness evidence contract. CI had not
  yet reported a status as of this audit.
- Documentation drift found (see Immediate cleanup below): three docs
  contain guidance that predates most of the current implementation.

## Immediate cleanup (low risk, do first)

1. **`TESTING_STRATEGY.md` is stale.** It states "no automated test runner
   is configured... no committed Playwright config." Both are now false:
   `npm test` runs 49 invariant suites and CI runs
   `npx playwright test --project=chromium` with a committed
   `playwright.config.mjs` and `tests/e2e/*.spec.mjs`. Rewrite it to
   describe the actual current suite and where new investment tests should
   be added, rather than the pre-domain-milestone plan.
2. **`DOMAIN_MODEL.md` and `INFORMATION_ARCHITECTURE.md`** still point to a
   `NEXT TASK` recommendation from the original Step 1 audit, which no
   longer reflects where the project is. Either remove the pointer or
   replace it with a reference to this roadmap.
3. **`LEGAL_CONFIGURATION.md`** describes `src/lib/investment/config.ts`
   as "planned" for `programDisplayName`, `participantDisplayName`,
   `legalInstrumentDisplayName`, `eligibilityRules`, `minimumAllocation`,
   `maximumAllocation`, `riskDisclosureText`, `agreementType`. That file
   still does not exist — the current `src/lib/investment/` only has
   `constants.ts`, `flags.ts`, `economics.ts`, `queries.ts`, `rbac.ts`,
   `payment-qr.ts`, `provider-adapter.ts`. This is a real, scoped gap (see
   P2 below), not just a doc problem.

## Priorities

### P0 — Land what's already in flight
- Drive PR #166 to green CI and merge. It is additive (new evidence
  contract + fixtures + tests) and does not change exposure flags,
  `technology-proof.ts` maturity, or the `BR-*` blocking set.

### P1 — Close the documentation-drift gaps above
- Cheap, no runtime risk, prevents future agents/humans from following
  outdated instructions (`TESTING_STRATEGY.md` in particular could mislead
  someone into thinking no test suite exists).

### P2 — Legal/commercial configuration surface
- Build `src/lib/investment/config.ts` per `LEGAL_CONFIGURATION.md`, wired
  to the existing feature-flag pattern (fail-closed defaults, env-driven).
  This does not require BR-001..BR-005 to be resolved — the point is that
  terminology and limits become configurable instead of hard-coded, which
  is already required by `PRODUCT_CONSTITUTION.md`.

### P3 — First real operating evidence
- The Phase 19 pipeline (`npm run investment:evidence:*`) is fully built
  but has never been run against real, redacted production data — only
  the synthetic CI fixture. Once there is a real closed-beta lot cycle to
  observe, capture it through that pipeline and route it through human
  review. This is the dependency that unblocks the "reviewed production
  operating evidence" release gate.
- Similarly, the Phase 18 canary (`verify-investment-production-readiness.mjs`)
  needs to actually run post-deploy against the live Render service to
  produce an accepted `INVESTMENT_PRODUCTION_READINESS_CANARY` result —
  today it is implemented and tested, but the workflow output has not been
  captured/accepted anywhere.

### P4 — Business decisions (not an engineering task, but the actual gate)
- `BR-001..BR-005` in `BUSINESS_MODEL.md` (cost scope, capital recovery,
  loss treatment, lot closing rule, unsold inventory) are the real
  blockers to `livePromotionEligible`. All the engineering in P0–P3 leaves
  the system exactly as conservative as it is today until these get an
  explicit human/legal answer. Flag this clearly to whoever owns the
  business side — the technical build is materially ahead of the business
  decisions it depends on.

## Explicitly out of scope for this plan

Per `PRODUCT_CONSTITUTION.md` and `CLAUDE.md`, none of the above implies
touching global styles, the existing marketing pages, the global
Navbar/Footer, the existing accounts system, or inventing any answer to
BR-001..BR-005. Any change here stays additive under
`src/app/inversion/**`, `src/app/api/investment/**`, and new
`supabase/migrations/000N_investment_*.sql` files.
