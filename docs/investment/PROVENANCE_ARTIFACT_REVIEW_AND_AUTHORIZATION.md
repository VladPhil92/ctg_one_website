# Provenance Artifact Review & Authorization Gate

Status: **TECHNICAL REVIEW IMPLEMENTED — CANONICAL AUTHORIZATION REMAINS PENDING**

This phase consumes the replay-safe artifact emitted by the Investment BR Merged-Main Provenance workflow and independently verifies its GitHub Actions transport before any human reviewer may consider it. It does not approve BR-001..BR-005, does not mark propagation `VERIFIED`, does not create a database migration and does not authorize settlement, a pilot or LIVE promotion.

## Problem this phase solves

A valid-looking JSON file is not sufficient evidence. It may have been copied, edited, detached from the GitHub run that produced it, or paired with the wrong artifact metadata. The review gate therefore resolves the source run and artifact directly from GitHub and verifies the downloaded archive byte-for-byte before generating a technical review record.

The source provenance artifact remains non-authoritative. The technical review artifact remains non-authoritative. A human review record remains non-authoritative. An `APPROVED` human review only means that the evidence may be proposed for a separate canonical authorization record.

## Technical review workflow

`.github/workflows/investment-br-provenance-artifact-review.yml` is a manually initiated review workflow. It accepts exactly three identifiers that the operator must intentionally select:

- provenance workflow run ID;
- provenance artifact ID;
- provenance artifact digest, including the `sha256:` prefix.

The workflow itself must execute from `refs/heads/main`. A dispatch from another branch fails closed.

## Independent GitHub transport verification

The workflow performs the following checks before producing review evidence:

1. It resolves the source workflow run from the GitHub Actions API and requires the canonical workflow name/path, `event=push`, `status=completed`, `conclusion=success`, `head_branch=main`, the expected repository and a full source SHA.
2. It resolves the exact artifact ID from GitHub and requires the canonical name `investment-br-main-provenance-<source-sha>`, `expired=false`, the expected run ID, branch and source SHA, and the exact artifact digest supplied for review.
3. It downloads the artifact ZIP through the authenticated GitHub API, computes the downloaded archive SHA-256 and requires it to equal both the GitHub artifact digest and the digest selected by the operator.
4. It rejects archives containing anything other than the single expected `investment-business-rule-main-provenance.json` entry.
5. It validates the contained provenance JSON against the repository provenance contract.
6. It independently re-fetches the source commit and PR from GitHub, requiring a verified two-parent merge commit, exact `before -> merge` transition, exact PR base/head SHAs and exact merge commit SHA.
7. It requires the source trusted SHA to remain an ancestor of the current review `main` checkout.
8. It recomputes the governance blob from the trusted source commit and independently rechecks the immutable PR #256 candidate blob.

A copied JSON or manually constructed object therefore cannot substitute for the GitHub run, artifact ID, artifact digest, downloaded ZIP bytes and merge-transition evidence.

## Technical review states

The technical review has only three possible states:

- `BLOCKED_SOURCE_NOT_ELIGIBLE` — the source provenance itself is valid but BR approval is incomplete.
- `TECHNICALLY_VERIFIED_AWAITING_HUMAN_REVIEW` — the source transport is valid and the provenance artifact reports five exact candidate-bound BR approvals with propagation still `PENDING`.
- `NO_NEW_IMPLEMENTATION_AUTHORIZATION_REQUIRED` — the source main commit already contains propagation `VERIFIED`.

All technical-review outputs keep `standaloneAuthorityAllowed=false`, `implementationPlanningEligible=false`, `implementationPrEligible=false`, `implementationAuthorityGranted=false`, `automaticMutationAllowed=false`, `propagationVerificationAllowed=false`, `pilotAuthorizationGranted=false` and `livePromotionAllowed=false`.

## Review workflow provenance

The technical review is wrapped in a second transport envelope identifying the canonical review workflow, its `workflow_dispatch` run ID and attempt, the review-tooling `main` SHA, the actor who initiated the review and the exact source run/artifact/digest selected. This envelope also grants no authority.

The workflow archives the technical review under a deterministic name and records its new GitHub artifact ID and artifact digest. A pending human-review template is then generated and bound to that technical-review artifact transport.

## Human review boundary

A human review may eventually record one of four decisions: `PENDING`, `APPROVED`, `CHANGES_REQUIRED` or `REJECTED`.

A non-eligible source may only remain `PENDING`; it cannot be approved. For an eligible source, any non-pending decision must identify the reviewer, use a real UTC timestamp not earlier than the source artifact, and cite a review reference inside this GitHub repository.

An approved human review yields only:

```text
HUMAN_REVIEW_APPROVED_REQUIRES_CANONICAL_AUTHORIZATION
```

It still keeps implementation eligibility and all runtime/pilot/LIVE authority flags false.

## Canonical authorization record

`src/data/investment-business-rule-provenance-authorization.mjs` establishes the next repository authority boundary. Its current status is `PENDING` and every provenance/review field is null.

A future explicit authorization may record the exact trusted main SHA, governance blob, provenance run ID, provenance artifact ID and digest, technical-review artifact reference, human-review reference, authorizer and authorization timestamp. Even after such a record says `AUTHORIZED`, local code only reports:

```text
AUTHORIZATION_RECORDED_REQUIRES_MERGED_MAIN_PROVENANCE
```

It does not grant implementation PR eligibility from a feature branch or editable checkout. The authorization itself must later be proven to have been merged into trusted `main` before implementation work can rely on it.

## Current real source evidence

The replay-safe provenance run produced after PR #277 is a useful real negative case:

- trusted `main`: `2defa218a66db48663e3ce0792616d0af051f7b0`;
- source provenance run: `33316229724`;
- source provenance artifact ID: `9733521669`;
- source artifact digest: `sha256:7352f38d4b0fc64359c251c12fc7393a26ea13434e2ad56c934ba11a3817c52a`;
- source status: `BLOCKED_AWAITING_BUSINESS_RULE_APPROVALS`.

The downloaded ZIP was independently hashed during development and its SHA-256 matched the GitHub artifact digest exactly. This evidence proves the review machinery has a concrete transport fixture, but it remains ineligible for human approval because BR-001..BR-005 are still `PENDING`.

## Required sequence before propagation implementation

1. BR-001..BR-005 are explicitly decided by an authorized human against the immutable PR #256 candidate.
2. Those decisions are merged into `main` through reviewed governance.
3. The replay-safe merged-main provenance workflow emits `MERGED_MAIN_PROVENANCE_EVIDENCE_ELIGIBLE`.
4. This technical review workflow independently validates run, artifact ID, artifact digest, downloaded SHA-256, merge transition and Git blobs.
5. An authorized human reviews the technical-review artifact and records an explicit decision.
6. An approved human review is recorded in the canonical authorization record through a separate reviewed PR.
7. That canonical authorization must itself receive merged-main provenance before an implementation PR can become eligible.
8. Propagation across the seven authority surfaces, propagation verification, pilot authorization, real operating evidence, final exact-SHA canary/recovery and explicit LIVE approval remain later gates.

No output of this phase is legal, tax or regulatory authorization for a real-money transaction.
