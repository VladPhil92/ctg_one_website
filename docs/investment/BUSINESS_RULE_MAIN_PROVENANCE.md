# Business Rule Merged-Main Provenance Gate

Status: **IMPLEMENTED AS FAIL-CLOSED EVIDENCE TRANSPORT — BR-001..BR-005 REMAIN PENDING**

This phase proves whether the repository bytes containing the CTG Craft Beer Investment business-rule governance were actually observed in a trusted GitHub `push` to `main` that came from an exact merged pull request. It does not approve BR-001..BR-005, does not modify the propagation record, does not create a migration and does not authorize settlement, a real-money pilot or LIVE promotion.

## Why this gate is separate

A local checkout, an environment variable, a branch named `main`, or an in-memory governance fixture can all be forged or edited. They are therefore insufficient to prove that five business-rule approvals were merged into the repository's trusted mainline.

The provenance boundary is anchored to GitHub Actions transport. `.github/workflows/investment-br-merged-main-provenance.yml` has only one trigger:

```text
push → main
```

There is intentionally no `workflow_dispatch` and no `pull_request` trigger. A user cannot manually run this workflow against arbitrary local bytes and obtain the same provenance claim.

## Trusted checks

For each real push to `main`, the workflow fails closed unless all transport checks pass:

1. `GITHUB_ACTIONS=true`, `GITHUB_EVENT_NAME=push` and `GITHUB_REF=refs/heads/main`.
2. The checked-out Git `HEAD` and `event.after` both exactly equal `GITHUB_SHA`.
3. The push is not forced, does not delete `main`, and `event.before` is a non-zero full Git SHA.
4. GitHub's commit API reports the exact commit with `commit.verification.verified=true` and exactly two parents.
5. `event.before` equals the merge commit's first parent.
6. GitHub's commit-to-pulls API resolves exactly one merged PR whose base is `main`, whose `base.sha` equals `event.before`, and whose `merge_commit_sha` equals `GITHUB_SHA`.
7. The merge commit's second parent equals that PR's exact `head.sha`.
8. The immutable BR candidate is read from the independent `investment-business-rule-candidate-authority.mjs` pin and its commit/path resolves to blob `2173e134a9eb2c1a73fbfc98e2fb4f48bd48e0d5`.
9. The governance blob is calculated directly from `HEAD:src/data/investment-business-rule-governance.mjs`.
10. The emitted JSON records the validated before/after and merge-parent transition and passes the repository provenance contract validator before upload.

These checks bind provenance to the actual merge transition rather than merely proving that a SHA was historically associated with some merged PR. Replaying an old merge SHA with a direct or forced update of `main` therefore fails closed. The contract intentionally requires a two-parent merge commit for governance provenance; squash/rebase-only transitions do not satisfy this gate.

## Evidence states

The evidence describes repository state but does not independently grant implementation authority:

- `BLOCKED_AWAITING_BUSINESS_RULE_APPROVALS` — one or more of BR-001..BR-005 is not `APPROVED` in the trusted main commit.
- `MERGED_MAIN_PROVENANCE_EVIDENCE_ELIGIBLE` — all five exact candidate-bound approvals are present in the trusted main commit and propagation is still `PENDING`.
- `PROPAGATION_ALREADY_VERIFIED` — the same trusted main commit already contains a `VERIFIED` propagation record, so a new implementation-provenance handoff is not needed for that candidate.

The current repository is expected to produce `BLOCKED_AWAITING_BUSINESS_RULE_APPROVALS` because BR-001..BR-005 remain `PENDING`.

## Artifact boundary

Each successful provenance workflow uploads:

```text
investment-br-main-provenance-<trusted-main-sha>
```

containing `investment-business-rule-main-provenance.json`.

The JSON file by itself has **no standalone authority**. Its contract permanently keeps `standaloneAuthorityAllowed=false`, `implementationPlanningEligible=false`, `implementationPrEligible=false`, `implementationAuthorityGranted=false`, automatic mutation disabled, pilot authorization false and LIVE promotion false.

A future authorization phase may treat `MERGED_MAIN_PROVENANCE_EVIDENCE_ELIGIBLE` as an input only after independently resolving the GitHub Actions run and verifying the uploaded artifact ID and artifact digest against the exact run/SHA and rechecking the merge transition. Copying or editing the JSON outside that GitHub artifact transport cannot substitute for that verification.

## Data minimization

The artifact contains only the information required for governance provenance: repository/ref, trusted main SHA, validated merge transition, governance blob SHA, BR identifiers/statuses, pinned candidate identity, merged PR metadata and workflow run identity. It does not copy `decidedBy`, KYC data, participant identities, payment evidence, credentials, secrets or raw operating evidence.

## Relationship to the propagation planner

`BUSINESS_RULE_PROPAGATION_CHANGE_PLAN.md` defines what must eventually change across the seven authority surfaces. It deliberately grants no implementation authority because a checkout cannot prove mainline provenance.

This phase supplies the missing transport evidence. Even after all five BRs are approved, the planner remains non-authorizing; only a GitHub Actions provenance artifact from a real merged-main transition can become eligible input to a separate human-reviewed implementation-authorization gate.

## Sequence after future business approval

1. An authorized human decides BR-001..BR-005 against the immutable candidate.
2. A reviewed governance PR records those exact candidate-bound decisions.
3. That PR is merged to `main` using a two-parent merge commit.
4. The real non-forced `main` push automatically triggers this provenance workflow.
5. The workflow must produce `MERGED_MAIN_PROVENANCE_EVIDENCE_ELIGIBLE` and an uploaded artifact with a verifiable artifact ID and artifact digest.
6. A separate authorization/review phase verifies the GitHub run, merge transition, artifact ID and artifact digest before an implementation PR may rely on the propagation blueprint.
7. Runtime propagation, propagation verification, pilot authorization, real operating evidence and LIVE approval remain later independent gates.

No result from this phase is legal, tax or regulatory authorization for a real-money transaction.
