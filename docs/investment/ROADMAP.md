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

Audit date: **2026-08-22** (updated same day after PR #166 merged).

## Audit summary

- Repository health: `npm test` (49 invariant suites), `npx tsc --noEmit`,
  `npm run build`, and `npm run audit:critical` all pass clean on `main`
  (`3d398da`, includes Phase 21). No high/critical dependency vulnerabilities.
- Scale: 67+ additive Supabase migrations, 21 merged "Investment" phases,
  all landed in the ~6 days since `PRODUCT_CONSTITUTION.md` was first
  committed (2026-08-15). This has been an unusually fast, densely phased
  build-out — governance discipline (ADRs, fail-closed gates, evidence
  separation) is what has kept it reviewable rather than the pace alone.
- Capability maturity: `investment-platform` is `PARTIAL` (technical) /
  `BETA` (public) in `technology-proof.ts` — unchanged and correctly
  conservative throughout, including after Phase 21.
- Release governance (Phase 20/21, `RELEASE_GATE_MATRIX.md`): technical
  contract can PASS; versioned production-canary artifacts can now be
  generated and archived per deployed SHA (Phase 21), but an accepted
  canary result, reviewed production operating evidence, and all five
  `BR-*` business decisions remain `PENDING`/`BLOCKED_DECISION` by design —
  artifact generation is explicitly never auto-accepted into release
  review. Public funding/registration and automatic money movement stay
  fail-closed (`SAFE_CLOSED`). No automatic LIVE promotion path exists.
- **PR #166 (Phase 21) merged** during this audit (`3d398da`) — this
  resolves the former P0 item below. Original P0 text is left in place,
  struck through in spirit, so this doc's own history stays legible.
- Documentation drift found (see Immediate cleanup below): three docs
  contain guidance that predates most of the current implementation.

## Immediate cleanup (low risk, do first)

1. **DONE — `TESTING_STRATEGY.md` was stale**, claiming no automated test
   runner or Playwright config existed. Rewritten to describe the real ~50
   invariant scripts (grouped by concern: financial, inventory,
   authorization, release governance, public truth) and the seven
   `tests/e2e/*.spec.mjs` Playwright specs, both enforced in CI, plus how to
   add tests for new work.
2. **DONE — `DOMAIN_MODEL.md` was stale**, describing an unimplemented
   "target model" with illustrative table names that no longer match
   reality. Rewritten against the actual 32 `investment_*` tables (grouped
   by bounded context), real column shapes cross-checked with
   `src/types/investment.ts`, and the authoritative `SECURITY DEFINER` RPCs.
   Its stale `NEXT TASK` pointer now points at this roadmap instead.
   **`INFORMATION_ARCHITECTURE.md` still has the same stale pointer and is
   still open** — not yet done.
3. **`LEGAL_CONFIGURATION.md`** describes `src/lib/investment/config.ts`
   as "planned" for `programDisplayName`, `participantDisplayName`,
   `legalInstrumentDisplayName`, `eligibilityRules`, `minimumAllocation`,
   `maximumAllocation`, `riskDisclosureText`, `agreementType`. That file
   still does not exist — the current `src/lib/investment/` only has
   `constants.ts`, `flags.ts`, `economics.ts`, `queries.ts`, `rbac.ts`,
   `payment-qr.ts`, `provider-adapter.ts`. This is a real, scoped gap (see
   P2 below), not just a doc problem.

## Priorities

### P0 — DONE: PR #166 merged (Phase 21)
- Landed as `3d398da`. Added versioned, SHA-bound, public-safe canary
  evidence artifacts and a shared validator reused by release governance.
  Confirmed additive: exposure flags, `technology-proof.ts` maturity
  (`PARTIAL`/`BETA`), and the `BR-*` blocking set are all unchanged.
- New follow-on from Phase 21 itself: an accepted canary result still has
  to actually be produced and wired to `INVESTMENT_PRODUCTION_READINESS_CANARY`
  — the artifact format now exists, but nothing has populated it yet. This
  folds into P3 below rather than being a separate item.

### P1 — Close the documentation-drift gaps above
- `TESTING_STRATEGY.md` and `DOMAIN_MODEL.md` done (see above).
  `INFORMATION_ARCHITECTURE.md`'s stale `NEXT TASK` pointer remains —
  cheap, no runtime risk, same fix pattern as the other two.

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
