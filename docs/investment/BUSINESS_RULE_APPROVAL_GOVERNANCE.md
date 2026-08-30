# Investment Business Rule Approval Governance

Status: **FAIL-CLOSED GOVERNANCE CONTROL — NO BR IS APPROVED BY THIS DOCUMENT**

This control governs the explicit business decision step for BR-001..BR-005. It does not replace legal, tax, accounting or regulatory review and it does not authorize public funding, automatic settlement, withdrawals or LIVE promotion.

## Immutable approval candidate

The current candidate is pinned to all of the following facts:

- document: `docs/investment/CLOSED_BETA_DECISION_PACK.md`;
- merge commit: `0f8f935080b43080bd7fbf7d544c831ba049cc6a`;
- document blob: `2173e134a9eb2c1a73fbfc98e2fb4f48bd48e0d5`;
- source PR: `#256`.

An approval against any other text, commit or blob is not an approval of this candidate. If the substance of a BR changes, the change requires a **new candidate commit**, a new pinned source and a reset of the affected governance decision to `PENDING`.

## Canonical states

Each required BR has exactly one canonical state:

- `PENDING`: no decision has been recorded; blocks release.
- `APPROVED`: the exact pinned candidate rule has been explicitly approved with complete human decision metadata.
- `CHANGES_REQUIRED`: the candidate is not accepted as written; blocks release.
- `REJECTED`: the candidate is rejected; blocks release.

Only `APPROVED` removes that BR from the business-decision blocker set. A missing, malformed, duplicated or unknown rule fails closed.

## Required decision metadata

Any state other than `PENDING` must record:

- `decidedBy`: accountable human reviewer/governance identity;
- `decidedAt`: UTC ISO timestamp;
- `evidenceRef`: immutable or auditable reference to the decision record.

A bare status edit is invalid. `PENDING` records must not contain decision metadata.

## Explicit approval procedure

For each BR independently:

1. Review the exact candidate document at the pinned commit/blob.
2. Select one explicit decision: **APPROVE AS WRITTEN**, **CHANGES REQUIRED**, or **REJECT**.
3. Record the human decision metadata and evidence reference in the canonical governance record.
4. Run repository CI and the release-gate invariants.
5. If a change to rule substance is requested, create a new candidate commit/version; do not edit the old candidate and preserve its approval metadata as if nothing changed.

No CI job, Codex review, deployment canary, database migration or evidence-capture tool may set a BR to `APPROVED` automatically.

## Separation of approvals

Approval of BR-001..BR-005 does not itself authorize LIVE, a real-money transaction, public funding, automatic settlement or automatic withdrawals. Even if all five BRs are approved, release governance separately requires the applicable legal/tax/regulatory authorization, authoritative runtime propagation, reviewed real production operating evidence, final exact-SHA deployment/recovery evidence and an explicit human LIVE decision.

The canonical `INVESTMENT_HUMAN_RELEASE_APPROVED` flag therefore remains independent and false until the final release-governance step.

## Current state

All five rules are intentionally `PENDING` in `src/data/investment-business-rule-governance.mjs`:

- BR-001 — PENDING
- BR-002 — PENDING
- BR-003 — PENDING
- BR-004 — PENDING
- BR-005 — PENDING

This document and its accompanying validator are governance infrastructure only. They record no substantive business approval.
