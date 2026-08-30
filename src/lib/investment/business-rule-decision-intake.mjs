import {
  INVESTMENT_BUSINESS_RULE_CANDIDATE,
  INVESTMENT_BUSINESS_RULE_GOVERNANCE_VERSION,
  INVESTMENT_BUSINESS_RULE_PROPAGATION_VERSION,
  INVESTMENT_REQUIRED_BUSINESS_RULE_IDS,
  derivePendingInvestmentBusinessDecisionIds,
  validateInvestmentBusinessRuleGovernance,
} from '../../data/investment-business-rule-governance.mjs';

export const INVESTMENT_BUSINESS_RULE_DECISION_INTAKE_VERSION =
  'ctg-investment-business-rule-decision-intake-v1';
export const INVESTMENT_BUSINESS_RULE_PROPAGATION_MANIFEST_VERSION =
  'ctg-investment-business-rule-propagation-manifest-v1';

export const INVESTMENT_BUSINESS_RULE_PROPAGATION_SURFACE_IDS = Object.freeze([
  'business-model',
  'financial-model',
  'lot-inventory-state-machine',
  'agreement-legal-config',
  'postgres-runtime',
  'golden-path-tests',
  'operator-evidence',
]);

const DECISION_STATUSES = new Set(['PENDING', 'APPROVED', 'CHANGES_REQUIRED', 'REJECTED']);
const PROPAGATION_SURFACE_STATUSES = new Set(['PENDING', 'VERIFIED']);
const OVERALL_REVIEW_STATUSES = new Set(['PENDING', 'VERIFIED']);
const FULL_SHA_RE = /^[0-9a-f]{40}$/;
const ISO_INSTANT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const SAFE_REF_RE = /^[A-Za-z0-9][A-Za-z0-9._:/#@-]{2,239}$/;
const URI_SCHEME_RE = /^[A-Za-z][A-Za-z0-9+.-]*:/;
const REPOSITORY_PATH_RE = /^[A-Za-z0-9._@+-]+(?:\/[A-Za-z0-9._@+-]+)*$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertExactKeys(object, allowedKeys, path) {
  assert(object && typeof object === 'object' && !Array.isArray(object), `${path} must be an object`);
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(object)) {
    assert(allowed.has(key), `${path}.${key} is not an allowed field`);
  }
  for (const key of allowed) {
    assert(Object.hasOwn(object, key), `${path}.${key} is required`);
  }
}

function validateCandidate(candidate, path = 'candidate') {
  assertExactKeys(candidate, ['path', 'commit', 'blobSha', 'sourcePr'], path);
  assert(candidate.path === INVESTMENT_BUSINESS_RULE_CANDIDATE.path, `${path}.path mismatch`);
  assert(candidate.commit === INVESTMENT_BUSINESS_RULE_CANDIDATE.commit, `${path}.commit mismatch`);
  assert(candidate.blobSha === INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha, `${path}.blobSha mismatch`);
  assert(candidate.sourcePr === INVESTMENT_BUSINESS_RULE_CANDIDATE.sourcePr, `${path}.sourcePr mismatch`);
  assert(FULL_SHA_RE.test(candidate.commit), `${path}.commit must be a lowercase full Git SHA`);
  assert(FULL_SHA_RE.test(candidate.blobSha), `${path}.blobSha must be a lowercase full Git SHA`);
}

function assertIsoInstant(value, path) {
  assert(typeof value === 'string' && ISO_INSTANT_RE.test(value), `${path} must be an ISO UTC instant`);
  const epoch = Date.parse(value);
  assert(Number.isFinite(epoch), `${path} must contain a valid calendar instant`);
  const canonical = new Date(epoch).toISOString();
  const normalized = value.includes('.') ? value : value.replace(/Z$/, '.000Z');
  assert(canonical === normalized, `${path} must contain a valid round-tripping UTC instant`);
  return epoch;
}

function assertEvidenceRef(value, path) {
  assert(typeof value === 'string' && SAFE_REF_RE.test(value), `${path} must be a safe auditable reference`);
}

function validateDecision(decision) {
  assertExactKeys(decision, [
    'id',
    'status',
    'reviewedCandidateCommit',
    'reviewedCandidateBlobSha',
    'decidedBy',
    'decidedAt',
    'evidenceRef',
  ], `decision:${decision?.id ?? 'unknown'}`);
  assert(INVESTMENT_REQUIRED_BUSINESS_RULE_IDS.includes(decision.id), `Unknown business-rule id: ${decision.id}`);
  assert(DECISION_STATUSES.has(decision.status), `${decision.id} has invalid decision status: ${decision.status}`);

  if (decision.status === 'PENDING') {
    assert(decision.reviewedCandidateCommit === null, `${decision.id} PENDING reviewedCandidateCommit must be null`);
    assert(decision.reviewedCandidateBlobSha === null, `${decision.id} PENDING reviewedCandidateBlobSha must be null`);
    assert(decision.decidedBy === null, `${decision.id} PENDING decidedBy must be null`);
    assert(decision.decidedAt === null, `${decision.id} PENDING decidedAt must be null`);
    assert(decision.evidenceRef === null, `${decision.id} PENDING evidenceRef must be null`);
    return;
  }

  assert(decision.reviewedCandidateCommit === INVESTMENT_BUSINESS_RULE_CANDIDATE.commit, `${decision.id} reviewed candidate commit mismatch`);
  assert(decision.reviewedCandidateBlobSha === INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha, `${decision.id} reviewed candidate blob mismatch`);
  assert(typeof decision.decidedBy === 'string' && decision.decidedBy.trim().length >= 2, `${decision.id} decidedBy is required`);
  assertIsoInstant(decision.decidedAt, `${decision.id}.decidedAt`);
  assertEvidenceRef(decision.evidenceRef, `${decision.id}.evidenceRef`);
}

export function validateInvestmentBusinessRuleDecisionIntake(intake) {
  assertExactKeys(intake, ['version', 'candidate', 'submittedAt', 'decisions'], 'intake');
  assert(intake.version === INVESTMENT_BUSINESS_RULE_DECISION_INTAKE_VERSION, 'Business-rule decision intake version mismatch');
  validateCandidate(intake.candidate, 'intake.candidate');
  assertIsoInstant(intake.submittedAt, 'intake.submittedAt');
  assert(Array.isArray(intake.decisions), 'intake.decisions must be an array');
  assert(intake.decisions.length === INVESTMENT_REQUIRED_BUSINESS_RULE_IDS.length, 'Decision intake must contain exactly five required rules');

  const seen = new Set();
  for (const decision of intake.decisions) {
    validateDecision(decision);
    assert(!seen.has(decision.id), `Duplicate business-rule id: ${decision.id}`);
    seen.add(decision.id);
  }
  for (const id of INVESTMENT_REQUIRED_BUSINESS_RULE_IDS) {
    assert(seen.has(id), `Missing required business-rule id: ${id}`);
  }
  return intake;
}

export function buildInvestmentBusinessRuleGovernancePreview(intake) {
  validateInvestmentBusinessRuleDecisionIntake(intake);
  const preview = {
    version: INVESTMENT_BUSINESS_RULE_GOVERNANCE_VERSION,
    candidate: { ...intake.candidate },
    rules: intake.decisions.map((decision) => ({ ...decision })),
  };
  validateInvestmentBusinessRuleGovernance(preview);
  return preview;
}

export function summarizeInvestmentBusinessRuleDecisionIntake(intake) {
  const preview = buildInvestmentBusinessRuleGovernancePreview(intake);
  const decisionBlockers = [...derivePendingInvestmentBusinessDecisionIds(preview)];
  const pendingCount = preview.rules.filter((rule) => rule.status === 'PENDING').length;
  const explicitDecisionCount = preview.rules.length - pendingCount;
  const allApproved = decisionBlockers.length === 0;
  const complete = pendingCount === 0;

  return Object.freeze({
    intakeVersion: INVESTMENT_BUSINESS_RULE_DECISION_INTAKE_VERSION,
    status: allApproved ? 'ALL_APPROVED' : complete ? 'COMPLETE_NOT_APPROVED' : 'INCOMPLETE',
    explicitDecisionCount,
    requiredDecisionCount: INVESTMENT_REQUIRED_BUSINESS_RULE_IDS.length,
    decisionBlockers: Object.freeze(decisionBlockers),
    propagationPlanningEligible: allApproved,
    governancePrReviewEligible: complete,
    canonicalMutationAllowed: false,
    automaticApprovalAllowed: false,
    candidate: Object.freeze({ ...intake.candidate }),
    proposedGovernanceRecord: preview,
  });
}

function validateArtifactRef(value, path) {
  assert(typeof value === 'string' && value.length >= 3 && value.length <= 240, `${path} must be a repository-relative artifact reference`);
  assert(!URI_SCHEME_RE.test(value), `${path} must not use a URI scheme`);
  assert(!value.startsWith('/') && !value.includes('\\'), `${path} must be repository-relative`);
  assert(REPOSITORY_PATH_RE.test(value), `${path} must use safe repository-relative path syntax`);
  for (const component of value.split('/')) {
    assert(component !== '.' && component !== '..', `${path} cannot traverse directories`);
  }
}

function validateSurface(surface) {
  assertExactKeys(surface, ['id', 'status', 'artifactRefs', 'verifiedBy', 'verifiedAt', 'evidenceRef'], `surface:${surface?.id ?? 'unknown'}`);
  assert(INVESTMENT_BUSINESS_RULE_PROPAGATION_SURFACE_IDS.includes(surface.id), `Unknown propagation surface id: ${surface.id}`);
  assert(PROPAGATION_SURFACE_STATUSES.has(surface.status), `${surface.id} has invalid propagation surface status: ${surface.status}`);
  assert(Array.isArray(surface.artifactRefs), `${surface.id}.artifactRefs must be an array`);

  if (surface.status === 'PENDING') {
    assert(surface.artifactRefs.length === 0, `${surface.id} PENDING artifactRefs must be empty`);
    assert(surface.verifiedBy === null, `${surface.id} PENDING verifiedBy must be null`);
    assert(surface.verifiedAt === null, `${surface.id} PENDING verifiedAt must be null`);
    assert(surface.evidenceRef === null, `${surface.id} PENDING evidenceRef must be null`);
    return;
  }

  assert(surface.artifactRefs.length > 0, `${surface.id} VERIFIED requires at least one artifactRef`);
  const refs = new Set();
  for (const [index, ref] of surface.artifactRefs.entries()) {
    validateArtifactRef(ref, `${surface.id}.artifactRefs[${index}]`);
    assert(!refs.has(ref), `${surface.id} contains duplicate artifactRef: ${ref}`);
    refs.add(ref);
  }
  assert(typeof surface.verifiedBy === 'string' && surface.verifiedBy.trim().length >= 2, `${surface.id} verifiedBy is required`);
  assertIsoInstant(surface.verifiedAt, `${surface.id}.verifiedAt`);
  assertEvidenceRef(surface.evidenceRef, `${surface.id}.evidenceRef`);
}

export function validateInvestmentBusinessRulePropagationManifest(manifest) {
  assertExactKeys(manifest, ['version', 'candidate', 'preparedAt', 'implementationCommit', 'surfaces', 'overallReview'], 'propagationManifest');
  assert(manifest.version === INVESTMENT_BUSINESS_RULE_PROPAGATION_MANIFEST_VERSION, 'Business-rule propagation manifest version mismatch');
  validateCandidate(manifest.candidate, 'propagationManifest.candidate');
  assertIsoInstant(manifest.preparedAt, 'propagationManifest.preparedAt');
  assert(FULL_SHA_RE.test(manifest.implementationCommit), 'propagationManifest.implementationCommit must be a lowercase full Git SHA');
  assert(Array.isArray(manifest.surfaces), 'propagationManifest.surfaces must be an array');
  assert(manifest.surfaces.length === INVESTMENT_BUSINESS_RULE_PROPAGATION_SURFACE_IDS.length, 'Propagation manifest must contain exactly seven required surfaces');

  const seen = new Set();
  for (const surface of manifest.surfaces) {
    validateSurface(surface);
    assert(!seen.has(surface.id), `Duplicate propagation surface id: ${surface.id}`);
    seen.add(surface.id);
  }
  for (const id of INVESTMENT_BUSINESS_RULE_PROPAGATION_SURFACE_IDS) {
    assert(seen.has(id), `Missing required propagation surface id: ${id}`);
  }

  assertExactKeys(manifest.overallReview, ['status', 'reviewedBy', 'reviewedAt', 'evidenceRef'], 'propagationManifest.overallReview');
  assert(OVERALL_REVIEW_STATUSES.has(manifest.overallReview.status), 'Invalid propagation overall review status');
  if (manifest.overallReview.status === 'PENDING') {
    assert(manifest.overallReview.reviewedBy === null, 'PENDING overallReview.reviewedBy must be null');
    assert(manifest.overallReview.reviewedAt === null, 'PENDING overallReview.reviewedAt must be null');
    assert(manifest.overallReview.evidenceRef === null, 'PENDING overallReview.evidenceRef must be null');
  } else {
    assert(manifest.surfaces.every((surface) => surface.status === 'VERIFIED'), 'Overall propagation review cannot be VERIFIED before every required surface is VERIFIED');
    assert(typeof manifest.overallReview.reviewedBy === 'string' && manifest.overallReview.reviewedBy.trim().length >= 2, 'overallReview.reviewedBy is required');
    const overallEpoch = assertIsoInstant(manifest.overallReview.reviewedAt, 'overallReview.reviewedAt');
    assertEvidenceRef(manifest.overallReview.evidenceRef, 'overallReview.evidenceRef');
    const latestSurfaceEpoch = Math.max(...manifest.surfaces.map((surface) => Date.parse(surface.verifiedAt)));
    assert(overallEpoch >= latestSurfaceEpoch, 'Overall propagation review cannot predate a required surface verification');
  }

  return manifest;
}

export function buildInvestmentBusinessRulePropagationReadiness({ intake, manifest }) {
  const intakeSummary = summarizeInvestmentBusinessRuleDecisionIntake(intake);
  validateInvestmentBusinessRulePropagationManifest(manifest);
  assert(manifest.candidate.commit === intake.candidate.commit, 'Propagation manifest candidate commit must match decision intake');
  assert(manifest.candidate.blobSha === intake.candidate.blobSha, 'Propagation manifest candidate blob must match decision intake');

  const pendingSurfaces = manifest.surfaces.filter((surface) => surface.status !== 'VERIFIED').map((surface) => surface.id);
  const allSurfacesVerified = pendingSurfaces.length === 0;
  const overallVerified = manifest.overallReview.status === 'VERIFIED';
  if (intakeSummary.propagationPlanningEligible && overallVerified) {
    const latestDecisionEpoch = Math.max(...intake.decisions.map((decision) => Date.parse(decision.decidedAt)));
    const overallReviewEpoch = Date.parse(manifest.overallReview.reviewedAt);
    assert(overallReviewEpoch > latestDecisionEpoch, 'Propagation overall review must postdate the latest BR approval decision');
  }
  const ready = intakeSummary.propagationPlanningEligible && allSurfacesVerified && overallVerified;

  const proposedPropagationRecord = ready
    ? {
        version: INVESTMENT_BUSINESS_RULE_PROPAGATION_VERSION,
        status: 'VERIFIED',
        verifiedCandidateCommit: INVESTMENT_BUSINESS_RULE_CANDIDATE.commit,
        verifiedCandidateBlobSha: INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha,
        verifiedBy: manifest.overallReview.reviewedBy,
        verifiedAt: manifest.overallReview.reviewedAt,
        evidenceRef: manifest.overallReview.evidenceRef,
      }
    : {
        version: INVESTMENT_BUSINESS_RULE_PROPAGATION_VERSION,
        status: 'PENDING',
        verifiedCandidateCommit: null,
        verifiedCandidateBlobSha: null,
        verifiedBy: null,
        verifiedAt: null,
        evidenceRef: null,
      };

  return Object.freeze({
    status: ready ? 'ELIGIBLE_FOR_PROPAGATION_GOVERNANCE_PR' : 'BLOCKED',
    decisionBlockers: intakeSummary.decisionBlockers,
    pendingSurfaces: Object.freeze(pendingSurfaces),
    overallReviewVerified: overallVerified,
    implementationCommit: manifest.implementationCommit,
    proposedPropagationRecord,
    canonicalMutationAllowed: false,
    runtimeMutationAllowed: false,
    livePromotionAllowed: false,
  });
}
