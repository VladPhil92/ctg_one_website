export const INVESTMENT_RELEASE_TARGET = 'LIVE';

// These IDs are release-gate references only. BUSINESS_MODEL.md remains the
// authoritative source for the underlying business decisions and their text.
// CI verifies that every ID below is still present in its PENDING section.
export const INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS = Object.freeze([
  'BR-001',
  'BR-002',
  'BR-003',
  'BR-004',
  'BR-005',
]);

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
