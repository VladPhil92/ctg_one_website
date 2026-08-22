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
3. **DONE — `INFORMATION_ARCHITECTURE.md` was stale**, planning a fully
   separate `/inversion/app/*` (ten subroutes) and `/inversion/admin/*`
   (twelve subroutes) tree that was never built that way. Rewritten against
   the real route tree: the participant surface consolidated into one
   `/inversion/app` dashboard with internal panels, and admin/operations
   surfaces reused the shared cross-business `/admin/*` Admin OS instead of
   a second parallel admin tree — documented as a deliberate architectural
   choice, not a gap. Also added `/beer/[serial]` and the real
   `/api/investment/*` routes, neither of which were in the original plan.
4. **DONE — `src/lib/investment/config.ts` built** (see P2 below). This was
   a real code gap, not just stale prose — `LEGAL_CONFIGURATION.md` is now
   rewritten to match what actually exists.

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

### P1 — DONE: documentation-drift cleanup
- `TESTING_STRATEGY.md`, `DOMAIN_MODEL.md`, and `INFORMATION_ARCHITECTURE.md`
  all rewritten against reality (see above). `LEGAL_CONFIGURATION.md`'s
  "planned" `config.ts` remains open — that one is a real code gap, not
  just stale prose, so it stays under P2 below rather than here.

### P2 — DONE: Legal/commercial configuration surface
- Built `src/lib/investment/config.ts`: `programDisplayName`,
  `participantDisplayName`, `legalInstrumentDisplayName`,
  `publicFundingEnabled`/`publicRegistrationEnabled` (re-exported from
  `flags.ts`, not duplicated), `minimumAllocationCases` (reads
  `MIN_INVESTMENT_CASES`), `maximumAllocationCases` (always `null` — no
  commercial cap has been decided, and deliberately not env-configurable:
  a Codex review on PR #170 correctly caught that neither the checkout UI
  nor `create_investment_order` consult a maximum, so an override would
  silently do nothing if set — fixed by removing the fake configurability
  rather than half-wiring enforcement into a financial RPC), `eligibilityRules`
  (read-only description of what's already enforced in PostgreSQL),
  `riskDisclosureText` (wired into `/inversion/simulador`, the one place
  `LEGAL_CONFIGURATION.md` names explicitly), and `agreementType`
  (`null` — genuinely unimplemented, not invented).
- Deliberately did **not** mass-migrate the ~16 existing hard-coded
  `'CTG Craft Beer Inversión'` occurrences to import from `config.ts` —
  several are in shared marketing components out of scope to touch
  (`ServicesSection.tsx`, `ecosystem-technology.ts`), and even the
  investment-scoped ones are a separate, purely-cosmetic refactor with no
  behavior change. `LEGAL_CONFIGURATION.md` now documents this explicitly
  as "known pending hard-coded copy" so it doesn't silently look finished.

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
