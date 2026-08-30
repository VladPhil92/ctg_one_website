import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  INVESTMENT_BUSINESS_RULE_CANDIDATE,
  INVESTMENT_BUSINESS_RULE_GOVERNANCE,
  INVESTMENT_REQUIRED_BUSINESS_RULE_IDS,
  areInvestmentBusinessRulesApproved,
  derivePendingInvestmentBusinessDecisionIds,
  validateInvestmentBusinessRuleGovernance,
} from '../src/data/investment-business-rule-governance.mjs';
import { INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS } from '../src/data/investment-release-governance.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const clone = (value) => JSON.parse(JSON.stringify(value));

assert.deepEqual(INVESTMENT_REQUIRED_BUSINESS_RULE_IDS, ['BR-001', 'BR-002', 'BR-003', 'BR-004', 'BR-005']);
assert.equal(INVESTMENT_BUSINESS_RULE_CANDIDATE.path, 'docs/investment/CLOSED_BETA_DECISION_PACK.md');
assert.equal(INVESTMENT_BUSINESS_RULE_CANDIDATE.commit, '0f8f935080b43080bd7fbf7d544c831ba049cc6a');
assert.equal(INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha, '2173e134a9eb2c1a73fbfc98e2fb4f48bd48e0d5');
assert.equal(INVESTMENT_BUSINESS_RULE_CANDIDATE.sourcePr, 256);

validateInvestmentBusinessRuleGovernance(INVESTMENT_BUSINESS_RULE_GOVERNANCE);
assert.deepEqual(
  derivePendingInvestmentBusinessDecisionIds(INVESTMENT_BUSINESS_RULE_GOVERNANCE),
  INVESTMENT_REQUIRED_BUSINESS_RULE_IDS,
  'Canonical governance must keep every BR blocking until explicit approval.',
);
assert.deepEqual(
  INVESTMENT_REQUIRED_BUSINESS_DECISION_IDS,
  INVESTMENT_REQUIRED_BUSINESS_RULE_IDS,
  'Release governance must derive its blockers from canonical BR governance.',
);
assert.equal(areInvestmentBusinessRulesApproved(INVESTMENT_BUSINESS_RULE_GOVERNANCE), false);

const approved = clone(INVESTMENT_BUSINESS_RULE_GOVERNANCE);
for (const [index, rule] of approved.rules.entries()) {
  rule.status = 'APPROVED';
  rule.decidedBy = 'governance-reviewer';
  rule.decidedAt = `2026-08-30T02:0${index}:00.000Z`;
  rule.evidenceRef = `governance-record:${rule.id}:fixture`;
}
validateInvestmentBusinessRuleGovernance(approved);
assert.deepEqual(derivePendingInvestmentBusinessDecisionIds(approved), []);
assert.equal(areInvestmentBusinessRulesApproved(approved), true);

const partial = clone(approved);
partial.rules[2].status = 'CHANGES_REQUIRED';
partial.rules[2].decidedBy = 'governance-reviewer';
partial.rules[2].decidedAt = '2026-08-30T02:10:00.000Z';
partial.rules[2].evidenceRef = 'governance-record:BR-003:changes-required';
assert.deepEqual(derivePendingInvestmentBusinessDecisionIds(partial), ['BR-003']);
assert.equal(areInvestmentBusinessRulesApproved(partial), false);

const rejected = clone(approved);
rejected.rules[4].status = 'REJECTED';
rejected.rules[4].decidedBy = 'governance-reviewer';
rejected.rules[4].decidedAt = '2026-08-30T02:11:00.000Z';
rejected.rules[4].evidenceRef = 'governance-record:BR-005:rejected';
assert.deepEqual(derivePendingInvestmentBusinessDecisionIds(rejected), ['BR-005']);

const missingApprovalMetadata = clone(INVESTMENT_BUSINESS_RULE_GOVERNANCE);
missingApprovalMetadata.rules[0].status = 'APPROVED';
assert.throws(
  () => validateInvestmentBusinessRuleGovernance(missingApprovalMetadata),
  /BR-001 decidedBy is required/,
  'A status flip without explicit human metadata must fail closed.',
);

const staleCandidate = clone(INVESTMENT_BUSINESS_RULE_GOVERNANCE);
staleCandidate.candidate.commit = 'a'.repeat(40);
assert.throws(
  () => validateInvestmentBusinessRuleGovernance(staleCandidate),
  /candidate commit mismatch/,
  'Approval governance must remain pinned to the reviewed immutable candidate.',
);

const wrongBlob = clone(INVESTMENT_BUSINESS_RULE_GOVERNANCE);
wrongBlob.candidate.blobSha = 'b'.repeat(40);
assert.throws(() => validateInvestmentBusinessRuleGovernance(wrongBlob), /candidate blob mismatch/);

const duplicate = clone(INVESTMENT_BUSINESS_RULE_GOVERNANCE);
duplicate.rules[4].id = 'BR-004';
assert.throws(() => validateInvestmentBusinessRuleGovernance(duplicate), /Duplicate business-rule id/);

const unknown = clone(INVESTMENT_BUSINESS_RULE_GOVERNANCE);
unknown.rules[0].id = 'BR-999';
assert.throws(() => validateInvestmentBusinessRuleGovernance(unknown), /Unknown business-rule id/);

const pendingWithDecisionMetadata = clone(INVESTMENT_BUSINESS_RULE_GOVERNANCE);
pendingWithDecisionMetadata.rules[0].decidedBy = 'someone';
assert.throws(() => validateInvestmentBusinessRuleGovernance(pendingWithDecisionMetadata), /PENDING decidedBy must be null/);

const [decisionPack, releaseGovernanceSource, approvalDocs] = await Promise.all([
  read(INVESTMENT_BUSINESS_RULE_CANDIDATE.path),
  read('src/data/investment-release-governance.mjs'),
  read('docs/investment/BUSINESS_RULE_APPROVAL_GOVERNANCE.md'),
]);
assert.match(decisionPack, /PROPOSED FOR EXPLICIT BUSINESS\/LEGAL APPROVAL — NOT YET AUTHORITATIVE/);
assert.match(releaseGovernanceSource, /derivePendingInvestmentBusinessDecisionIds\(INVESTMENT_BUSINESS_RULE_GOVERNANCE\)/);
assert.doesNotMatch(releaseGovernanceSource, /Object\.freeze\(\[\s*'BR-001'/, 'Release blockers must not be maintained as a second hand-edited BR array.');
assert.match(approvalDocs, /approval of BR-001\.\.BR-005 does not itself authorize LIVE/i);
assert.match(approvalDocs, /new candidate commit/i);

console.log('Investment business-rule governance invariants: PASS');
