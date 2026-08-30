# Investment Business Rule Decision Intake & Propagation Readiness

Status: **TOOLING ONLY — NO BUSINESS RULE IS APPROVED BY THIS PHASE**

This phase provides a deterministic path for receiving explicit BR-001..BR-005 decisions and proving propagation completeness without changing canonical governance, runtime logic, settlement behavior, public funding exposure or LIVE maturity.

It does not approve BR-001..BR-005. It does not replace business, legal, tax, accounting or regulatory authority. Every tool in this phase is non-mutating with respect to canonical governance and runtime state; `canonicalMutationAllowed`, `runtimeMutationAllowed` and automatic approval remain `false`.

## Immutable candidate

Every intake and propagation manifest is pinned to the existing canonical candidate:

- `docs/investment/CLOSED_BETA_DECISION_PACK.md`
- commit `0f8f935080b43080bd7fbf7d544c831ba049cc6a`
- blob `2173e134a9eb2c1a73fbfc98e2fb4f48bd48e0d5`
- source PR `#256`

A different commit, blob, document or source PR fails validation. Authority cannot transfer from one candidate to another.

## Decision intake

Create a working intake file outside the public repository:

```bash
npm run investment:br:intake:template -- \
  --out .private-evidence/investment-br-decision-intake.json
```

The generated file contains exactly BR-001 through BR-005 in `PENDING` state. Creating the file does not approve anything.

For each rule, an explicit non-PENDING decision requires the exact reviewed candidate commit/blob plus:

- one of `APPROVED`, `CHANGES_REQUIRED`, or `REJECTED`;
- accountable `decidedBy` identity;
- UTC `decidedAt` timestamp;
- auditable `evidenceRef`.

Validate the intake with:

```bash
npm run investment:br:intake:validate -- \
  --intake .private-evidence/investment-br-decision-intake.json \
  --report-out .private-evidence/investment-br-decision-intake.report.json
```

The report may be `INCOMPLETE`, `COMPLETE_NOT_APPROVED`, or `ALL_APPROVED`. A complete rejection or `CHANGES_REQUIRED` result is a valid explicit decision record but remains a release blocker. Only `ALL_APPROVED` becomes eligible for propagation planning.

The validator emits a proposed canonical governance record for human review but never writes `src/data/investment-business-rule-governance.mjs`.

## Propagation readiness

After — and only after — all five BRs are explicitly approved, create the propagation manifest:

```bash
npm run investment:br:propagation:template -- \
  --out .private-evidence/investment-br-propagation-manifest.json
```

The manifest is intentionally ineligible until it identifies the exact implementation commit and verifies all seven mandatory authority surfaces:

1. `business-model`
2. `financial-model`
3. `lot-inventory-state-machine`
4. `agreement-legal-config`
5. `postgres-runtime`
6. `golden-path-tests`
7. `operator-evidence`

Each VERIFIED surface requires at least one repository-relative artifact reference, reviewer identity, UTC verification timestamp and auditable evidence reference. Remote URLs, directory traversal and missing surfaces fail closed.

The overall propagation review cannot be `VERIFIED` until all seven surfaces are individually `VERIFIED`.

Validate readiness with:

```bash
npm run investment:br:propagation:validate -- \
  --intake .private-evidence/investment-br-decision-intake.json \
  --manifest .private-evidence/investment-br-propagation-manifest.json \
  --report-out .private-evidence/investment-br-propagation-readiness.json
```

Only a fully approved decision intake plus seven verified propagation surfaces plus an explicit overall review returns `ELIGIBLE_FOR_PROPAGATION_GOVERNANCE_PR`.

That result still does not mutate canonical propagation. It only produces a proposed `INVESTMENT_BUSINESS_RULE_PROPAGATION` record for a separate reviewed PR. `canonicalMutationAllowed` and `runtimeMutationAllowed` remain `false`.

## Required sequence

The authority chain is deliberately ordered:

1. explicit human BR decisions against the immutable candidate;
2. reviewed governance PR recording those decisions;
3. implementation/propagation work on authoritative surfaces;
4. surface-by-surface verification;
5. independent overall propagation review;
6. reviewed governance PR recording propagation as VERIFIED;
7. separate closed-beta pilot authorization and exact-deployment preflight;
8. real controlled operating cycle and redacted evidence;
9. final release governance.

Skipping a stage must not be compensated for by CI, Codex review, deployment health, a canary or a successful test fixture.

## CI safety contract

The invariant suite proves that:

- canonical BR-001..BR-005 remain `PENDING` in this phase;
- canonical propagation remains `PENDING`;
- partial decisions cannot become propagation-eligible;
- `CHANGES_REQUIRED` and `REJECTED` remain blockers;
- stale candidate commit/blob values are rejected;
- duplicate or missing BRs are rejected;
- missing propagation surfaces are rejected;
- an overall VERIFIED review cannot precede verification of every surface;
- repository artifact references cannot traverse directories or use remote URLs;
- even a fully valid in-memory approval/propagation fixture cannot mutate canonical governance, runtime state or LIVE status automatically.

No real participant data, financial credentials or production secret is required by this phase or its CI coverage.
