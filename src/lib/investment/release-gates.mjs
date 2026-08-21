export const INVESTMENT_RELEASE_GATE_VERSION = 'ctg-investment-release-gates-v1';

const TECHNICAL_EVIDENCE_MARKERS = Object.freeze([
  'Operational Golden Journey reconstructs funding, payment, production, inventory, sale/return, settlement and post-settlement liquidity evidence per lot',
  'Post-deploy Production readiness canary verifies exact Render identity, runtime schema compatibility and the canonical Investment surface without production mutations; real operating evidence remains required for LIVE promotion',
  'Private redacted operating-evidence capture, validation, human-review and finalization tooling is implemented with PII/identifier rejection, source hashing and synthetic-evidence separation; no real production operating capture has been approved yet',
]);

const VALID_GATE_STATUSES = new Set([
  'PASS',
  'SAFE_CLOSED',
  'PENDING_EVIDENCE',
  'BLOCKED_DECISION',
  'FAIL',
]);

function gate(id, category, label, status, detail, source) {
  if (!VALID_GATE_STATUSES.has(status)) throw new Error(`Invalid release gate status: ${status}`);
  return { id, category, label, status, detail, source };
}

function isFullGitSha(value) {
  return typeof value === 'string' && /^[0-9a-f]{40}$/i.test(value);
}

function isReviewedProductionEvidence(report) {
  return Boolean(
    report
    && report.classification === 'production-redacted'
    && report.releaseEvidenceEligible === true
    && report.capabilityPromotionAllowed === false
    && typeof report.evidenceSha256 === 'string'
    && /^[0-9a-f]{64}$/.test(report.evidenceSha256)
    && report.humanReview?.allJudgmentsPass === true,
  );
}

function isSuccessfulProductionReadinessCanary(canary, deployment) {
  return Boolean(
    canary
    && canary.result === 'PASS'
    && Array.isArray(canary.failures)
    && canary.failures.length === 0
    && canary.expectedBranch === 'main'
    && canary.expectedBranch === deployment?.branch
    && isFullGitSha(canary.expectedSha)
    && canary.expectedSha === deployment?.commit
    && canary.observed?.readinessStatus === 'ready'
    && canary.observed?.deploymentCommit === deployment?.commit
    && canary.observed?.publicStatus === 'BETA'
    && canary.observed?.productionOperatingEvidence === 'pending'
    && canary.observed?.surfaceHttp === 200,
  );
}

export function buildInvestmentReleaseGateMatrix(input) {
  const {
    capability,
    deployment,
    schemaCompatible,
    flags,
    pendingBusinessDecisionIds,
    productionReadinessCanary = null,
    operatingEvidenceReport = null,
    humanReleaseApproved = false,
  } = input ?? {};

  if (!capability || capability.id !== 'investment-platform') {
    throw new Error('Investment release matrix requires canonical investment-platform capability truth.');
  }
  if (!flags || typeof flags !== 'object') throw new Error('Investment release matrix requires feature-flag state.');
  if (!Array.isArray(pendingBusinessDecisionIds)) {
    throw new Error('pendingBusinessDecisionIds is required and must be an explicit array from canonical release governance.');
  }
  if (typeof humanReleaseApproved !== 'boolean') throw new Error('humanReleaseApproved must be boolean.');

  const technicalMarkersPresent = TECHNICAL_EVIDENCE_MARKERS.every((marker) => capability.evidence?.includes(marker));
  const maturityHonest = capability.status === 'PARTIAL' && capability.publicStatus === 'BETA';
  const technicalCertified = technicalMarkersPresent && maturityHonest;

  const deploymentIdentityReady = Boolean(
    deployment?.provider === 'render'
    && deployment?.branch === 'main'
    && isFullGitSha(deployment?.commit)
    && schemaCompatible === true,
  );
  const canaryVerified = deploymentIdentityReady
    && isSuccessfulProductionReadinessCanary(productionReadinessCanary, deployment);
  const runtimeReady = deploymentIdentityReady && canaryVerified;

  const operatingEvidenceAccepted = isReviewedProductionEvidence(operatingEvidenceReport);
  const businessDecisionsResolved = pendingBusinessDecisionIds.length === 0;
  const publicExposureClosed = flags.publicRegistrationEnabled !== true && flags.publicFundingEnabled !== true;
  const automaticMoneyMovementClosed = flags.automaticSettlementEnabled !== true && flags.automaticWithdrawalsEnabled !== true;

  const promotionReviewEligible =
    technicalCertified
    && runtimeReady
    && operatingEvidenceAccepted
    && businessDecisionsResolved;
  const releaseAuthorized = promotionReviewEligible && humanReleaseApproved;

  // Exposure may remain safe while closed during controlled beta. Once opened,
  // it is safe only after every prerequisite AND the final human release
  // decision have passed. Review eligibility alone never authorizes exposure.
  const publicExposureSafe = publicExposureClosed || releaseAuthorized;
  const automaticMoneyMovementSafe = automaticMoneyMovementClosed || releaseAuthorized;

  const gates = [
    gate(
      'technical-contract',
      'technical',
      'CI and domain contract',
      technicalCertified ? 'PASS' : 'FAIL',
      technicalCertified
        ? 'Golden Journey, production-readiness and evidence-capture contracts are represented in canonical capability truth while maturity remains PARTIAL/BETA.'
        : 'Canonical technical evidence or PARTIAL/BETA maturity truth is incomplete or inconsistent.',
      'src/data/technology-proof.ts',
    ),
    gate(
      'runtime-schema',
      'deployment',
      'Production runtime, schema and canary',
      runtimeReady ? 'PASS' : 'PENDING_EVIDENCE',
      runtimeReady
        ? 'Render main deployment, compatible schema and a successful Phase 18 canary all identify the exact same deployed commit.'
        : deploymentIdentityReady
          ? 'Deployment identity and schema are compatible, but a successful Phase 18 canary pinned to this exact commit is still required.'
          : 'A Render/main/full-SHA/schema-compatible runtime plus a successful Phase 18 canary must be observed before release review.',
      '/api/health + Phase 18 readiness canary result',
    ),
    gate(
      'operating-evidence',
      'evidence',
      'Reviewed production operating evidence',
      operatingEvidenceAccepted ? 'PASS' : 'PENDING_EVIDENCE',
      operatingEvidenceAccepted
        ? 'An authorized production-redacted Phase 19 report passed human review and is structurally release-evidence eligible.'
        : 'No authorized production-redacted operating-evidence report is currently accepted for release governance.',
      'Phase 19 safe finalized report pointer',
    ),
    gate(
      'business-decisions',
      'business',
      'Pending business decisions',
      businessDecisionsResolved ? 'PASS' : 'BLOCKED_DECISION',
      businessDecisionsResolved
        ? 'No required PENDING BUSINESS DECISION remains in the release gate set.'
        : `Release remains blocked by ${pendingBusinessDecisionIds.join(', ')}. Their substance must be decided in BUSINESS_MODEL.md, not inferred here.`,
      'docs/investment/BUSINESS_MODEL.md',
    ),
    gate(
      'public-exposure',
      'safety',
      'Public registration and funding exposure',
      publicExposureSafe ? (publicExposureClosed ? 'SAFE_CLOSED' : 'PASS') : 'FAIL',
      publicExposureClosed
        ? 'Public registration and public funding flags remain fail-closed for controlled beta.'
        : releaseAuthorized
          ? 'Public exposure is enabled only after all release prerequisites and explicit human LIVE approval have passed.'
          : 'Public registration or funding is enabled before explicit human LIVE authorization; exposure is unsafe.',
      'src/lib/investment/flags.ts + human release governance',
    ),
    gate(
      'automatic-money-movement',
      'safety',
      'Automatic settlement and withdrawal exposure',
      automaticMoneyMovementSafe ? (automaticMoneyMovementClosed ? 'SAFE_CLOSED' : 'PASS') : 'FAIL',
      automaticMoneyMovementClosed
        ? 'Automatic settlement and automatic withdrawal flags remain fail-closed.'
        : releaseAuthorized
          ? 'Automatic money movement is enabled only after all release prerequisites and explicit human LIVE approval have passed.'
          : 'Automatic settlement or withdrawals are enabled before explicit human LIVE authorization; exposure is unsafe.',
      'src/lib/investment/flags.ts + human release governance',
    ),
    gate(
      'human-release-decision',
      'governance',
      'Explicit human LIVE approval',
      releaseAuthorized ? 'PASS' : 'PENDING_EVIDENCE',
      releaseAuthorized
        ? 'An explicit human governance decision has approved LIVE promotion after all prerequisite gates passed.'
        : promotionReviewEligible
          ? 'All prerequisite gates are satisfied; an explicit human LIVE decision is still required.'
          : 'Human LIVE approval is not actionable until technical, deployment/canary, operating-evidence and business-decision gates are satisfied.',
      'src/data/investment-release-governance.mjs',
    ),
  ];

  const summary = gates.reduce((acc, current) => {
    acc[current.status] = (acc[current.status] ?? 0) + 1;
    return acc;
  }, { PASS: 0, SAFE_CLOSED: 0, PENDING_EVIDENCE: 0, BLOCKED_DECISION: 0, FAIL: 0 });

  return {
    version: INVESTMENT_RELEASE_GATE_VERSION,
    target: 'LIVE',
    currentMaturity: {
      technicalStatus: capability.status,
      publicStatus: capability.publicStatus ?? capability.status,
    },
    gates,
    summary,
    deploymentIdentityReady,
    canaryVerified,
    promotionReviewEligible,
    livePromotionEligible: releaseAuthorized,
    publicExposureSafe,
    automaticMoneyMovementSafe,
    automaticPromotionAllowed: false,
    evaluatedAt: new Date().toISOString(),
  };
}
