// Independent immutable authority for the BR-001..BR-005 decision candidate.
//
// This file is intentionally separate from the mutable governance record. The
// merged-main provenance gate compares governance against these exact PR #256
// facts so a governance edit cannot redefine the candidate it is purportedly
// approving.
export const INVESTMENT_BUSINESS_RULE_IMMUTABLE_CANDIDATE = Object.freeze({
  path: 'docs/investment/CLOSED_BETA_DECISION_PACK.md',
  commit: '0f8f935080b43080bd7fbf7d544c831ba049cc6a',
  blobSha: '2173e134a9eb2c1a73fbfc98e2fb4f48bd48e0d5',
  sourcePr: 256,
});
