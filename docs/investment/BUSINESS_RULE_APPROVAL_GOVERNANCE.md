# Investment Business Rule Approval Governance

Status: **FAIL-CLOSED GOVERNANCE CONTROL — NO BR IS APPROVED BY THIS DOCUMENT**

This control governs the explicit business decision step for BR-001..BR-005. It does not replace legal, tax, accounting or regulatory review and it does not authorize public funding, automatic settlement, withdrawals or LIVE promotion.

## Immutable approval candidate

The current candidate is pinned to all of the following facts:

- document: `docs/investment/CLOSED_BETA_DECISION_PACK.md`;
- merge commit: `0f8f935080b43080bd7fbf7d544c831ba049cc6a`;
- document blob: `2173e134a9eb2c1a73fbfc98e2fb4f48bd48e0d5`;
- source PR: `#256`.

CI recomputes the Git blob SHA from the current Decision Pack bytes. An unpinned edit therefore fails the governance invariant.

An approval against any other text, commit or blob is not an approval of this candidate. If the substance of a BR changes, the change requires a **new candidate commit**, a new pinned source and a reset of the affected governance decision to `PENDING`.

## Canonical decision states

Each required BR has exactly one canonical state:

- `PENDING`: no decision has been recorded; blocks release.
- `APPROVED`: the exact pinned candidate rule has been explicitly approved with complete human decision metadata.
- `CHANGES_REQUIRED`: the candidate is not accepted as written; blocks release.
- `REJECTED`: the candidate is rejected; blocks release.

Only `APPROVED` satisfies the decision itself. A missing, malformed, duplicated or unknown rule fails closed.

## Candidate-bound decision metadata

Any state other than `PENDING` must record all of the following:

- `reviewedCandidateCommit`: exact commit reviewed by the human decision-maker;
- `reviewedCandidateBlobSha`: exact Decision Pack bytes reviewed;
- `decidedBy`: accountable human reviewer/governance identity;
- `decidedAt`: UTC ISO timestamp;
- `evidenceRef`: immutable or auditable reference to the decision record.

The reviewed commit and blob must equal the canonical candidate. This prevents an old approval record from silently carrying over when the candidate changes. A bare status edit is invalid. `PENDING` records must not contain candidate-review or decision metadata.

## Explicit approval procedure

For each BR independently:

1. Review the exact candidate document at the pinned commit/blob.
2. Select one explicit decision: **APPROVE AS WRITTEN**, **CHANGES REQUIRED**, or **REJECT**.
3. Record the exact reviewed candidate commit/blob plus the human decision metadata and evidence reference.
4. Run repository CI and the release-gate invariants.
5. If a change to rule substance is requested, create a new candidate commit/version and reset the affected rule to `PENDING`. Never transfer the prior approval metadata to new text.

No CI job, Codex review, deployment canary, database migration or evidence-capture tool may set a BR to `APPROVED` automatically.

## Mandatory propagation gate

Approval and propagation are intentionally separate. Even after all five BRs are `APPROVED`, the release blocker set remains closed until `INVESTMENT_BUSINESS_RULE_PROPAGATION.status` is explicitly `VERIFIED`.

`VERIFIED` propagation requires:

- all BR-001..BR-005 already `APPROVED`;
- `verifiedCandidateCommit` equal to the approved candidate commit;
- `verifiedCandidateBlobSha` equal to the approved candidate bytes;
- `verifiedBy`, `verifiedAt` and `evidenceRef` populated;
- authoritative propagation into the applicable business model, financial model, state-machine/inventory rules, versioned agreement/formula, PostgreSQL/runtime controls, Golden Path tests and operator/evidence tooling.

If propagation remains `PENDING`, all five BR identifiers continue to block the release matrix even though the decision stage may be complete. If the candidate changes, prior propagation evidence is not reusable and must be re-verified against the new candidate.

## Separation of approvals

Approval of BR-001..BR-005 does not itself authorize LIVE, a real-money transaction, public funding, automatic settlement or automatic withdrawals. Verified propagation also does not itself authorize LIVE. Release governance separately requires the applicable legal/tax/regulatory authorization, reviewed real production operating evidence, final exact-SHA deployment/canary/recovery evidence and an explicit human LIVE decision.

The canonical `INVESTMENT_HUMAN_RELEASE_APPROVED` flag therefore remains independent and false until the final release-governance step.

## Current state

All five rules are intentionally `PENDING` in `src/data/investment-business-rule-governance.mjs`, and propagation is also `PENDING`:

- BR-001 — PENDING
- BR-002 — PENDING
- BR-003 — PENDING
- BR-004 — PENDING
- BR-005 — PENDING
- authoritative propagation — PENDING

This document and its accompanying validators are governance infrastructure only. They record no substantive business approval.
