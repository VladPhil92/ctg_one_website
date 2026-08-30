import {
  INVESTMENT_BUSINESS_RULE_GOVERNANCE,
  derivePendingInvestmentBusinessDecisionIds,
} from './investment-business-rule-governance.mjs';

export const INVESTMENT_RELEASE_TARGET = 'LIVE';

// Business-rule blockers are derived from the validated canonical governance
// record. Editing this array directly is intentionally impossible: every rule
// remains blocking until its canonical status is explicitly APPROVED with the
// required human decision metadata.
export const INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS =
  derivePendingInvestmentBusinessDecisionIds(INVESTMENT_BUSINESS_RULE_GOVERNANCE);

// A successful Phase 18 production-readiness canary result may be wired here
// only after the exact deployed commit has been observed on Render. The release
// matrix re-checks the result, branch, commit and failure list against the
// deployment currently being evaluated, so stale canary evidence cannot pass.
// Null means no production canary result is currently accepted for release
// governance.
export const INVESTMENT_PRODUCTION_READINESS_CANARY = null;

// A reviewed, redacted operating-evidence report may be wired here only after
// the Phase 19 private review/finalization process has produced an authorized
// safe report. Null means no production operating evidence is currently
// accepted for release governance.
export const INVESTMENT_REVIEWED_OPERATING_EVIDENCE = null;

// LIVE promotion always requires a separate explicit human governance action.
// This value is intentionally false and must never be toggled by CI, runtime
// health, a canary, an evidence report, or an admin UI action.
export const INVESTMENT_HUMAN_RELEASE_APPROVED = false;
