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

The authority-producing planner reads only the committed canonical `INVESTMENT_BUSINESS_RULE_GOVERNANCE` and `INVESTMENT_BUSINESS_RULE_PROPAGATION` records from the current checkout. It accepts no caller-supplied governance object. A draft, fixture, private intake or unmerged approval proposal therefore cannot produce implementation authority.

The planner treats a valid blocked or already-completed lifecycle state as a successful planning evaluation. It exits non-zero only when the canonical blueprint itself is malformed. This is intentional: planning may occur before approval, while implementation authority remains fail-closed.

## Simulation boundary

The library also exposes a non-authoritative simulation helper for invariant tests and design analysis. Simulation results are explicitly prefixed `SIMULATION_*`, carry `authoritative = false`, and always keep `implementationPlanningEligible = false` and `implementationPrEligible = false`, even when a synthetic governance fixture contains five structurally valid approvals. Simulation can never substitute for a merged canonical governance record.

## Planner lifecycle

The canonical planner has three valid lifecycle states:

- `BLOCKED_AWAITING_CANONICAL_APPROVAL`: one or more BRs are not canonically `APPROVED`; implementation planning and an implementation PR remain ineligible.
- `READY_FOR_REVIEWED_IMPLEMENTATION_PR`: all five exact candidate-bound approvals are canonical and propagation is still `PENDING`; a reviewed implementation PR may be prepared, but no automatic mutation or release authority is granted.
- `ALREADY_PROPAGATED`: the canonical propagation record is already `VERIFIED`; the planner must not suggest another implementation PR for the same candidate.

Every lifecycle state keeps `automaticApprovalAllowed`, `automaticMutationAllowed`, `runtimeMutationAllowedByPlanner`, `propagationVerificationAllowed`, `pilotAuthorizationGranted` and `livePromotionAllowed` false.

## Current expected result

While canonical BR-001..BR-005 remain `PENDING`, the result must contain:

- `status = BLOCKED_AWAITING_CANONICAL_APPROVAL`;
- `authoritative = true`;
- all five BR identifiers in `decisionBlockers`;
- `canonicalApprovalsSatisfied = false`;
- `propagationAlreadyVerified = false`;
- `implementationPlanningEligible = false`;
- `implementationPrEligible = false`;
- `automaticApprovalAllowed = false`;
- `automaticMutationAllowed = false`;
- `runtimeMutationAllowedByPlanner = false`;
- `propagationVerificationAllowed = false`;
- `pilotAuthorizationGranted = false`;
- `livePromotionAllowed = false`.

If a later reviewed governance PR records all five exact candidate-bound approvals, the canonical planner may return `READY_FOR_REVIEWED_IMPLEMENTATION_PR`. That status means only that a human-reviewed implementation PR may begin. The planner still cannot mutate runtime, mark propagation VERIFIED, authorize the pilot or promote LIVE.

## Seven required authority surfaces

The blueprint requires exactly these surfaces and preserves their dependency order:

1. `business-model` — make the approved BR set authoritative in `BUSINESS_MODEL.md`.
2. `financial-model` — specify cost classification, `LotAvailable`, capital recovery, loss/write-off treatment and exact cent reconciliation.
3. `lot-inventory-state-machine` — define deterministic long-stop, extension and terminal inventory disposition semantics.
4. `agreement-legal-config` — bind the approved rule set to versioned terms/configuration and to the actual participant-facing instrument at `src/app/inversion/legal/page.tsx`, without inventing legal classification.
5. `postgres-runtime` — implement the rule set through a **new immutable migration** assigned from the then-current `main` migration baseline.
6. `golden-path-tests` — prove the approved economics and state transitions on a clean migration-materialized database.
7. `operator-evidence` — prove a future controlled real cycle reconciles to the approved rules using redacted first-party aggregates only.

The graph is itself canonical. Each surface is bound to an exact stage, dependency list, task ID, action, BR set, target kind and repository path. Runtime implementation depends on the authoritative specification surfaces; contract verification depends on runtime implementation; operator evidence depends on the contract tests. Removing prerequisites, redirecting a surface to another repository path, changing a target kind or substituting a different action is invalid. The validator also verifies the canonical graph is acyclic.

## BR coverage

BR-001 and BR-002 must propagate through business, financial, legal/config, PostgreSQL, Golden Path and operator-evidence surfaces. BR-003, BR-004 and BR-005 additionally require the lot/inventory state-machine surface.

The blueprint validator rejects candidate drift, altered stage topology, changed dependency sets, changed actions/targets, changed BR coverage, unsafe repository paths and incomplete acceptance criteria.

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
2. Re-run the canonical planner and require `READY_FOR_REVIEWED_IMPLEMENTATION_PR`.
3. Update authoritative business, financial, state-machine and legal/config specification, including the actual `/inversion/legal` instrument.
4. Allocate the next migration from the then-current `main` baseline and implement the approved PostgreSQL/runtime rules.
5. Extend Golden Path and invariant coverage.
6. Extend redacted operator/evidence tooling.
7. Review the seven resulting surfaces independently and run the existing propagation-readiness validator.
8. Record propagation as `VERIFIED` only through a separate reviewed governance PR.
9. Continue to separate pilot authorization, real operating evidence, exact-SHA release revalidation and explicit human LIVE approval.

No step in this document substitutes for legal, tax or regulatory authorization of a real-money transaction.
