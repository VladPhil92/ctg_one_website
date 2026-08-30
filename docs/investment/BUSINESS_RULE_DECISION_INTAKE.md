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

The report may be `INCOMPLETE`, `COMPLETE_NOT_APPROVED`, or `ALL_APPROVED`. A complete rejection or `CHANGES_REQUIRED` result is a valid explicit decision record but remains a release blocker. Only `ALL_APPROVED` becomes eligible for a governance-recording PR.

The validator emits a proposed canonical governance record for human review but never writes `src/data/investment-business-rule-governance.mjs`. Propagation planning cannot become eligible from this private intake alone: the exact five approved decision records must first be merged into the canonical governance file and be present in the implementation checkout.

## Propagation readiness

After — and only after — all five BRs are explicitly approved **and recorded canonically**, create the propagation manifest:

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

The manifest itself must be prepared after the latest BR approval. Each VERIFIED surface requires at least one repository-relative artifact reference, reviewer identity, UTC verification timestamp and auditable evidence reference, and every surface verification must occur after the latest BR approval. Remote URLs, URI schemes, directory traversal and missing surfaces fail closed.

The overall propagation review cannot be `VERIFIED` until all seven surfaces are individually `VERIFIED`. Its timestamp must be strictly later than every surface verification, and its reviewer identity must be independent from every surface verifier.

Validate readiness from a checkout of the exact implementation commit:

```bash
npm run investment:br:propagation:validate -- \
  --intake .private-evidence/investment-br-decision-intake.json \
  --manifest .private-evidence/investment-br-propagation-manifest.json \
  --report-out .private-evidence/investment-br-propagation-readiness.json
```

The operational validator does not trust the private declarations by themselves. It requires the canonical `INVESTMENT_BUSINESS_RULE_GOVERNANCE` in the checkout to match the exact approved intake, requires `implementationCommit` to equal the checked-out Git `HEAD`, resolves every artifact reference from every VERIFIED surface at that exact commit, requires each reference to be a tracked file blob, and records the resolved Git blob SHA in the safe report. A private approval that has not been merged, stale commit, nonexistent file, directory reference or declarative-only claim therefore fails closed.

Only canonically recorded approval of all five BRs plus seven post-approval verified propagation surfaces plus an independent, strictly later overall review plus exact Git repository evidence returns `ELIGIBLE_FOR_PROPAGATION_GOVERNANCE_PR`.

That result still does not mutate canonical propagation. It only produces a proposed `INVESTMENT_BUSINESS_RULE_PROPAGATION` record for a separate reviewed PR. `canonicalMutationAllowed` and `runtimeMutationAllowed` remain `false`.

## Required sequence

The authority chain is deliberately ordered:

1. explicit human BR decisions against the immutable candidate;
2. reviewed governance PR recording those exact decisions canonically;
3. implementation/propagation work on authoritative surfaces;
4. post-approval surface-by-surface verification;
5. exact Git artifact verification at the implementation commit;
6. independent overall propagation review, strictly after all surface reviews;
7. reviewed governance PR recording propagation as VERIFIED;
8. separate closed-beta pilot authorization and exact-deployment preflight;
9. real controlled operating cycle and redacted evidence;
10. final release governance.

Skipping a stage must not be compensated for by CI, Codex review, deployment health, a canary or a successful test fixture.

## CI safety contract

The invariant suite proves that:

- canonical BR-001..BR-005 remain `PENDING` in this phase;
- canonical propagation remains `PENDING`;
- private approvals that have not been recorded canonically cannot unlock propagation;
- partial decisions cannot become propagation-eligible;
- `CHANGES_REQUIRED` and `REJECTED` remain blockers;
- stale candidate commit/blob values are rejected;
- malformed calendar timestamps are rejected;
- duplicate or missing BRs are rejected;
- missing propagation surfaces are rejected;
- propagation manifests and surface verification timestamps cannot predate the latest BR approval;
- an overall VERIFIED review must strictly follow every surface verification;
- the overall reviewer cannot also be a surface verifier;
- repository artifact references cannot traverse directories or use URI schemes;
- even a fully valid in-memory approval/propagation fixture cannot mutate canonical governance, runtime state or LIVE status automatically.

The operator validator additionally binds the declared implementation SHA and every VERIFIED artifact path to real Git objects before returning success. No real participant data, financial credentials or production secret is required by this phase or its CI coverage.
