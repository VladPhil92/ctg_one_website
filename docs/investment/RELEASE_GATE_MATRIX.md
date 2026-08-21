# Investment Release Gate Matrix

Status: **IMPLEMENTED; LIVE PROMOTION BLOCKED**

## Purpose

Phase 20 provides one deterministic release-readiness view for CTG Craft Beer Investment. It consolidates technical proof, deployment/schema state, production-readiness canary evidence, reviewed operating evidence, unresolved business decisions and fail-closed exposure controls without turning any of those signals into an automatic promotion.

The matrix is visible to `SUPER_ADMIN` at `/admin/release-readiness`.

## Source-of-truth boundaries

The matrix is a **read model**, not a new authority for the underlying facts:

- capability maturity and technical evidence: `src/data/technology-proof.ts`;
- deployment identity: Render metadata via `src/lib/observability/deployment.ts`;
- schema compatibility: `src/lib/observability/runtime-schema.ts`;
- production-readiness canary execution: `scripts/verify-investment-production-readiness.mjs`;
- product exposure flags: `src/lib/investment/flags.ts`;
- business-rule substance and decision status: `docs/investment/BUSINESS_MODEL.md`;
- operating-evidence validation/finalization: Phase 19 tooling;
- accepted canary/evidence pointers and final human approval only: `src/data/investment-release-governance.mjs`.

The list of required `BR-*` identifiers in the governance pointer file does not duplicate their substance. CI verifies that those IDs remain in the `PENDING BUSINESS DECISION` section of the authoritative business model.

## Gate statuses

The matrix uses five explicit states:

- `PASS`: the prerequisite is positively evidenced;
- `SAFE_CLOSED`: exposure remains conservatively disabled while release prerequisites are incomplete;
- `PENDING_EVIDENCE`: evidence has not been accepted yet;
- `BLOCKED_DECISION`: a human business decision remains unresolved;
- `FAIL`: a safety or truth invariant is violated.

No unknown, omitted or stale state is interpreted optimistically.

## Release gates

### Technical contract

Requires canonical Investment maturity to remain `PARTIAL / BETA` and requires the Phase 17, Phase 18 and Phase 19 evidence markers to remain present in `technology-proof.ts`.

This gate certifies that the repository knows what has been implemented. It does not prove real production operation.

### Production runtime, schema and canary

Requires all of the following at evaluation time:

- provider is Render;
- branch is `main`;
- deployment commit is a full 40-character Git SHA;
- runtime schema compatibility is true;
- an explicitly accepted Phase 18 canary result exists;
- that canary result is `PASS` with an empty failure list;
- its expected branch is `main`;
- its expected SHA and observed deployment SHA exactly equal the deployment being evaluated;
- the canary observed readiness `ready`, public status `BETA`, pending production operating evidence and HTTP 200 on the canonical Investment surface.

A local/preview environment, missing canary or stale canary from another deployment cannot satisfy this gate. `INVESTMENT_PRODUCTION_READINESS_CANARY` is currently `null`, therefore a production runtime may have compatible deployment/schema identity while the complete release runtime gate remains `PENDING_EVIDENCE`.

### Reviewed production operating evidence

Requires a Phase 19 safe report that is:

- classified `production-redacted`;
- human reviewed with all judgments passing;
- `releaseEvidenceEligible: true`;
- `capabilityPromotionAllowed: false`;
- bound to a valid SHA-256 evidence digest.

`INVESTMENT_REVIEWED_OPERATING_EVIDENCE` is currently `null`, therefore this gate remains `PENDING_EVIDENCE`. Synthetic CI evidence cannot satisfy it.

### Pending business decisions

The current required decision IDs are:

- `BR-001` — cost scope;
- `BR-002` — final contractual capital-recovery rule;
- `BR-003` — losses;
- `BR-004` — lot closing rule;
- `BR-005` — unsold inventory.

Their descriptions and resolution status remain authoritative only in `BUSINESS_MODEL.md`. The release matrix must not decide them. Callers must provide the pending decision set explicitly; omission is an error and never means “all resolved”.

### Public exposure

During controlled beta, `publicRegistrationEnabled` and `publicFundingEnabled` may remain false. This is reported as `SAFE_CLOSED`.

If either becomes true, it is considered safe only after **all** technical/runtime/canary/evidence/business prerequisites pass **and** explicit human LIVE approval has been recorded. Review eligibility without final human approval is insufficient and reports `FAIL` if public exposure is already enabled.

### Automatic money movement

During controlled beta, automatic settlement and automatic withdrawals may remain false. This is reported as `SAFE_CLOSED`.

If either becomes true, it is considered safe only after **all** release prerequisites and explicit human LIVE approval have passed. PostgreSQL authorization remains authoritative even then; flags never replace KYC, lot-state, capacity, ledger or settlement controls.

### Explicit human LIVE approval

Even after all prerequisite gates become eligible for release review, a separate explicit human governance decision is required. `INVESTMENT_HUMAN_RELEASE_APPROVED` is intentionally false and cannot be changed by CI, a canary, an evidence report or the Admin UI.

## Eligibility model

`promotionReviewEligible` requires:

1. technical contract PASS;
2. exact Render deployment/schema plus matching successful canary PASS;
3. reviewed production operating evidence PASS;
4. no required pending business decisions.

`livePromotionEligible` additionally requires explicit human release approval.

Opening public funding/registration or automatic money movement before `livePromotionEligible` is true is unsafe and must report `FAIL`.

`automaticPromotionAllowed` is always `false`.

## Current expected state

At Phase 20 implementation time:

- technical contract can PASS;
- deployment identity/schema may be healthy independently;
- accepted production canary evidence remains pending;
- production operating evidence remains pending;
- BR-001 through BR-005 remain blocking decisions;
- public registration/funding and automatic money movement are expected to remain fail-closed;
- human LIVE approval is false;
- Investment remains `PARTIAL / BETA`.

This is the intended state. Phase 20 improves release governance; it does not accelerate or imply a LIVE launch.
