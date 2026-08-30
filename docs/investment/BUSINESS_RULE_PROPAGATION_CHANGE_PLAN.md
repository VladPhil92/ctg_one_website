# Business Rule Propagation Change Planner

Status: **PLANNING CONTROL ONLY — NO IMPLEMENTATION AUTHORITY IS GRANTED**

This phase converts the immutable BR-001..BR-005 candidate into a deterministic propagation blueprint. It does not approve the rules, alter settlement, create a migration, authorize a real-money pilot or promote Investment to LIVE.

## Candidate

The blueprint is pinned to:

- `docs/investment/CLOSED_BETA_DECISION_PACK.md`;
- candidate commit `0f8f935080b43080bd7fbf7d544c831ba049cc6a`;
- candidate blob `2173e134a9eb2c1a73fbfc98e2fb4f48bd48e0d5`;
- source PR `#256`.

A different candidate cannot inherit this blueprint's governance meaning.

## Planner command

```bash
npm run investment:br:propagation:plan
```

Optional safe output:

```bash
npm run investment:br:propagation:plan -- \
  --out .private-evidence/investment-br-propagation-change-plan.json
```

The command evaluates repository governance content and the canonical blueprint, but **does not prove repository provenance**. A local checkout cannot by itself establish that apparent approvals or propagation records were actually merged into trusted `main`.

Consequently, this planner never returns implementation authority. `implementationPlanningEligible`, `implementationPrEligible`, `implementationAuthorityGranted`, `automaticApprovalAllowed`, `automaticMutationAllowed`, `runtimeMutationAllowedByPlanner`, `propagationVerificationAllowed`, `pilotAuthorizationGranted` and `livePromotionAllowed` remain `false` for every result.

## Repository-content lifecycle

The planner may report only what the current checkout contains:

- `BLOCKED_AWAITING_CANONICAL_APPROVAL`: one or more BRs remain non-approved in the checkout.
- `APPROVALS_RECORDED_REQUIRES_MERGED_MAIN_PROVENANCE`: the checkout contains five candidate-bound approvals, but this module has not proven that those bytes were merged into trusted `main`.
- `PROPAGATION_RECORDED_REQUIRES_MERGED_MAIN_PROVENANCE`: the checkout contains a `VERIFIED` propagation record, but merged-main provenance is still unproven here.

These are observations, not permissions. For the latter two states, `governanceProvenanceVerified = false` and `mergedMainProvenanceRequired = true`.

A separate future governance/provenance gate must verify the exact merged `main` commit before any implementation PR is treated as authorized. This planner intentionally does not infer that fact from a branch name, a local Git ref, environment variables or an editable working tree.

## Simulation boundary

The library exposes a simulation helper solely for invariant tests and design analysis. Simulation states are prefixed `SIMULATION_*`; they are non-authoritative and cannot grant implementation eligibility even when synthetic inputs contain five approvals or a `VERIFIED` propagation record.

Returned planner state is recursively frozen. A shallow-frozen caller simulation blueprint is recursively frozen before it is returned, preventing post-validation mutation of nested surfaces, tasks, dependencies or targets.

## Seven canonical propagation surfaces

The blueprint fixes exactly seven surfaces:

1. `business-model` — `docs/investment/BUSINESS_MODEL.md`.
2. `financial-model` — `docs/investment/FINANCIAL_MODEL.md`.
3. `lot-inventory-state-machine` — `docs/investment/LOT_STATE_MACHINE.md` and `docs/investment/DOMAIN_MODEL.md`.
4. `agreement-legal-config` — `docs/investment/LEGAL_CONFIGURATION.md`, `src/lib/investment/config.ts` and the actual participant-facing `src/app/inversion/legal/page.tsx`.
5. `postgres-runtime` — a future new immutable migration under `supabase/migrations`.
6. `golden-path-tests` — `scripts/golden-path-transactional-smoke.sql` and `scripts/investment-operational-golden-journey.sql`.
7. `operator-evidence` — `docs/investment/OPERATING_EVIDENCE_CAPTURE.md` plus the operating-evidence validation/finalization scripts.

Each surface is bound to an exact canonical stage, dependency set, task ID, action, BR set, target kind and repository path. Removing prerequisite edges, redirecting a task to another path, changing the migration directory into a file target, substituting actions or altering required BR coverage invalidates the blueprint. The dependency graph is also checked for cycles.

BR-001 and BR-002 require business, financial, legal/config, PostgreSQL, Golden Path and operator-evidence propagation. BR-003, BR-004 and BR-005 additionally require the lot/inventory state-machine surface.

## Future runtime boundary

This phase deliberately **does not** reserve a migration number or filename. Parallel development can advance `main`; a migration slot must therefore be allocated only from the exact trusted `main` baseline used by the future reviewed implementation PR.

That future implementation must preserve, at minimum:

- no cost double counting;
- one lot-level `LotAvailable` reconciliation before allocation waterfall;
- `min(K, A)` capital recovery rather than guaranteed committed-capital repayment;
- explicit `PARTICIPANT_BACKED` versus `CTG_INTERNAL` isolation;
- no participant credit from CTG-internal allocations;
- exact cent conservation without binary floating point;
- deterministic half-up/largest-remainder allocation;
- no negative participant wallet or automatic capital call;
- no settlement before terminal lot/inventory facts are complete;
- no automatic repurchase guarantee for unsold inventory.

## Required sequence

1. An authorized human explicitly decides BR-001..BR-005 against the immutable candidate.
2. Those decisions are recorded through a reviewed governance PR.
3. A separate merged-main provenance gate verifies the exact commit containing those canonical approvals.
4. Only after that external provenance gate may a reviewed propagation implementation PR begin using this blueprint.
5. The seven authority surfaces are updated in dependency order, including a newly allocated immutable migration from that current `main` baseline.
6. Golden Path and operator-evidence tooling are extended and independently reviewed.
7. Existing propagation readiness verifies exact Git artifacts, chronology and independent review.
8. Propagation is recorded `VERIFIED` only through a separate reviewed governance PR.
9. Pilot authorization, real production operating evidence, final exact-SHA revalidation and explicit human LIVE approval remain separate gates.

No state produced by this planner is legal, tax or regulatory authorization for a real-money transaction.
