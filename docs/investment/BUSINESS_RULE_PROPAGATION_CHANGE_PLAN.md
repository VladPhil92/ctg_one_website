# Business Rule Propagation Change Planner

Status: **PLANNING CONTROL ONLY — CANONICAL BR-001..BR-005 APPROVAL IS STILL REQUIRED**

This phase converts the immutable BR-001..BR-005 candidate into a deterministic implementation blueprint. It does not approve the rules, does not modify authoritative business or financial documentation, does not create a database migration, does not change settlement behavior and does not authorize a closed-beta transaction or LIVE promotion.

## Why this phase exists

The approved-rule propagation gate requires seven authority surfaces to move together. Implementing them ad hoc would create a high risk that prose, legal configuration, PostgreSQL settlement logic, Golden Path tests or operator evidence diverge from each other. The planner therefore makes the required change set explicit before implementation begins.

The candidate remains pinned to:

- `docs/investment/CLOSED_BETA_DECISION_PACK.md`;
- candidate commit `0f8f935080b43080bd7fbf7d544c831ba049cc6a`;
- candidate blob `2173e134a9eb2c1a73fbfc98e2fb4f48bd48e0d5`;
- source PR `#256`.

A different candidate commit/blob is a different governance decision and cannot inherit this plan's authority.

## Canonical planner command

```bash
npm run investment:br:propagation:plan
```

Optional safe JSON output:

```bash
npm run investment:br:propagation:plan -- \
  --out .private-evidence/investment-br-propagation-change-plan.json
```

The planner treats `BLOCKED_AWAITING_CANONICAL_APPROVAL` as a valid planning result. It exits non-zero only when the blueprint itself is malformed. This is intentional: planning may occur before approval, but implementation authority may not.

## Current expected result

While canonical BR-001..BR-005 remain `PENDING`, the result must contain:

- `status = BLOCKED_AWAITING_CANONICAL_APPROVAL`;
- all five BR identifiers in `decisionBlockers`;
- `canonicalApprovalsSatisfied = false`;
- `implementationPlanningEligible = false`;
- `implementationPrEligible = false`;
- `automaticApprovalAllowed = false`;
- `automaticMutationAllowed = false`;
- `runtimeMutationAllowedByPlanner = false`;
- `propagationVerificationAllowed = false`;
- `pilotAuthorizationGranted = false`;
- `livePromotionAllowed = false`.

If a later reviewed governance PR records all five exact candidate-bound approvals, the planner may return `READY_FOR_REVIEWED_IMPLEMENTATION_PR`. That status means only that a human-reviewed implementation PR may begin. The planner still cannot mutate runtime, mark propagation VERIFIED, authorize the pilot or promote LIVE.

## Seven required authority surfaces

The blueprint requires exactly these surfaces and preserves their dependency order:

1. `business-model` — make the approved BR set authoritative in `BUSINESS_MODEL.md`.
2. `financial-model` — specify cost classification, `LotAvailable`, capital recovery, loss/write-off treatment and exact cent reconciliation.
3. `lot-inventory-state-machine` — define deterministic long-stop, extension and terminal inventory disposition semantics.
4. `agreement-legal-config` — bind the approved rule set to versioned terms/configuration without inventing legal classification.
5. `postgres-runtime` — implement the rule set through a **new immutable migration** assigned from the then-current `main` migration baseline.
6. `golden-path-tests` — prove the approved economics and state transitions on a clean migration-materialized database.
7. `operator-evidence` — prove a future controlled real cycle reconciles to the approved rules using redacted first-party aggregates only.

Dependencies are fail-closed. Runtime implementation depends on the authoritative specification surfaces; contract verification depends on runtime implementation; operator evidence depends on the contract tests.

## BR coverage

BR-001 and BR-002 must propagate through business, financial, legal/config, PostgreSQL, Golden Path and operator-evidence surfaces. BR-003, BR-004 and BR-005 additionally require the lot/inventory state-machine surface.

The blueprint validator rejects missing required coverage, duplicate task IDs, unknown BRs or surfaces, unsafe repository paths, missing acceptance criteria and dependencies that point to a later stage.

## Runtime implementation boundary

This phase deliberately does **not** reserve a migration number or filename. The repository is under active parallel development, so the correct migration slot must be allocated from the actual `main` baseline at the moment the reviewed implementation PR begins. Editing any already-applied migration is forbidden.

The future runtime implementation must, at minimum, preserve these constraints from the candidate:

- no cost double counting;
- one lot-level `LotAvailable` reconciliation before allocation waterfall;
- `min(K, A)` capital recovery rather than guaranteed committed-capital repayment;
- explicit `PARTICIPANT_BACKED` versus `CTG_INTERNAL` recipient isolation;
- no participant credit from CTG-internal allocations;
- exact integer/decimal cent conservation, no binary floating point;
- deterministic half-up/largest-remainder participant profit allocation;
- no negative participant wallet or automatic capital call;
- no settlement while required lot/inventory facts are incomplete or non-terminal;
- no automatic repurchase guarantee for unsold inventory.

## Required implementation sequence after approval

1. Record all five explicit candidate-bound approvals in canonical governance through a reviewed PR.
2. Re-run the planner and require `READY_FOR_REVIEWED_IMPLEMENTATION_PR`.
3. Update authoritative business, financial, state-machine and legal/config specification.
4. Allocate the next migration from the then-current `main` baseline and implement the approved PostgreSQL/runtime rules.
5. Extend Golden Path and invariant coverage.
6. Extend redacted operator/evidence tooling.
7. Review the seven resulting surfaces independently and run the existing propagation-readiness validator.
8. Record propagation as `VERIFIED` only through a separate reviewed governance PR.
9. Continue to separate pilot authorization, real operating evidence, exact-SHA release revalidation and explicit human LIVE approval.

No step in this document substitutes for legal, tax or regulatory authorization of a real-money transaction.
