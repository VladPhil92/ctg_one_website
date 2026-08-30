import {
  INVESTMENT_BUSINESS_RULE_CANDIDATE,
  INVESTMENT_BUSINESS_RULE_GOVERNANCE,
  INVESTMENT_BUSINESS_RULE_PROPAGATION,
  INVESTMENT_REQUIRED_BUSINESS_RULE_IDS,
  areInvestmentBusinessRulesApproved,
  derivePendingInvestmentBusinessDecisionIds,
  validateInvestmentBusinessRuleGovernance,
  validateInvestmentBusinessRulePropagation,
} from '../../data/investment-business-rule-governance.mjs';
import { INVESTMENT_BUSINESS_RULE_PROPAGATION_SURFACE_IDS } from './business-rule-decision-intake.mjs';

export const INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_PLAN_VERSION =
  'ctg-investment-business-rule-propagation-change-plan-v1';

export const INVESTMENT_BUSINESS_RULE_PROPAGATION_STAGE_IDS = Object.freeze([
  'AUTHORITATIVE_SPEC',
  'RUNTIME_IMPLEMENTATION',
  'CONTRACT_VERIFICATION',
  'OPERATOR_VERIFICATION',
]);

const SAFE_REPOSITORY_PATH_RE = /^[A-Za-z0-9._@+-]+(?:\/[A-Za-z0-9._@+-]+)*$/;
const URI_SCHEME_RE = /^[A-Za-z][A-Za-z0-9+.-]*:/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  if (!Object.isFrozen(value)) Object.freeze(value);
  return value;
}

function sameArray(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((value, index) => value === expected[index]);
}

function sameTargets(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && actual.every((target, index) => (
      target?.kind === expected[index].kind && target?.path === expected[index].path
    ));
}

function validateRepositoryPath(path, label) {
  assert(typeof path === 'string' && path.length >= 3 && path.length <= 240, `${label} must be a repository-relative path`);
  assert(!URI_SCHEME_RE.test(path), `${label} must not use a URI scheme`);
  assert(!path.startsWith('/') && !path.includes('\\'), `${label} must be repository-relative`);
  assert(SAFE_REPOSITORY_PATH_RE.test(path), `${label} must use safe repository-relative path syntax`);
  for (const component of path.split('/')) {
    assert(component !== '.' && component !== '..', `${label} cannot traverse directories`);
  }
}

const CANONICAL_STAGE_CONTRACT = deepFreeze([
  { id: 'AUTHORITATIVE_SPEC', order: 10 },
  { id: 'RUNTIME_IMPLEMENTATION', order: 20 },
  { id: 'CONTRACT_VERIFICATION', order: 30 },
  { id: 'OPERATOR_VERIFICATION', order: 40 },
]);

const CANONICAL_SURFACE_CONTRACT = deepFreeze({
  'business-model': {
    stage: 'AUTHORITATIVE_SPEC',
    dependsOn: [],
    task: {
      id: 'business-model-authoritative-br-set',
      action: 'MODIFY_EXISTING',
      ruleIds: ['BR-001', 'BR-002', 'BR-003', 'BR-004', 'BR-005'],
      targets: [{ kind: 'FILE', path: 'docs/investment/BUSINESS_MODEL.md' }],
    },
  },
  'financial-model': {
    stage: 'AUTHORITATIVE_SPEC',
    dependsOn: ['business-model'],
    task: {
      id: 'financial-model-deterministic-waterfall',
      action: 'MODIFY_EXISTING',
      ruleIds: ['BR-001', 'BR-002', 'BR-003', 'BR-004', 'BR-005'],
      targets: [{ kind: 'FILE', path: 'docs/investment/FINANCIAL_MODEL.md' }],
    },
  },
  'lot-inventory-state-machine': {
    stage: 'AUTHORITATIVE_SPEC',
    dependsOn: ['business-model'],
    task: {
      id: 'lot-state-machine-long-stop-terminal-disposition',
      action: 'CREATE_OR_MODIFY',
      ruleIds: ['BR-003', 'BR-004', 'BR-005'],
      targets: [
        { kind: 'FILE', path: 'docs/investment/LOT_STATE_MACHINE.md' },
        { kind: 'FILE', path: 'docs/investment/DOMAIN_MODEL.md' },
      ],
    },
  },
  'agreement-legal-config': {
    stage: 'AUTHORITATIVE_SPEC',
    dependsOn: ['business-model', 'financial-model', 'lot-inventory-state-machine'],
    task: {
      id: 'agreement-formula-version-binding',
      action: 'MODIFY_EXISTING',
      ruleIds: ['BR-001', 'BR-002', 'BR-003', 'BR-004', 'BR-005'],
      targets: [
        { kind: 'FILE', path: 'docs/investment/LEGAL_CONFIGURATION.md' },
        { kind: 'FILE', path: 'src/lib/investment/config.ts' },
        { kind: 'FILE', path: 'src/app/inversion/legal/page.tsx' },
      ],
    },
  },
  'postgres-runtime': {
    stage: 'RUNTIME_IMPLEMENTATION',
    dependsOn: ['business-model', 'financial-model', 'lot-inventory-state-machine', 'agreement-legal-config'],
    task: {
      id: 'postgres-approved-business-rule-propagation',
      action: 'NEW_IMMUTABLE_MIGRATION',
      ruleIds: ['BR-001', 'BR-002', 'BR-003', 'BR-004', 'BR-005'],
      targets: [{ kind: 'DIRECTORY', path: 'supabase/migrations' }],
    },
  },
  'golden-path-tests': {
    stage: 'CONTRACT_VERIFICATION',
    dependsOn: ['postgres-runtime'],
    task: {
      id: 'golden-path-approved-waterfall-contract',
      action: 'EXTEND_CONTRACT_TESTS',
      ruleIds: ['BR-001', 'BR-002', 'BR-003', 'BR-004', 'BR-005'],
      targets: [
        { kind: 'FILE', path: 'scripts/golden-path-transactional-smoke.sql' },
        { kind: 'FILE', path: 'scripts/investment-operational-golden-journey.sql' },
      ],
    },
  },
  'operator-evidence': {
    stage: 'OPERATOR_VERIFICATION',
    dependsOn: ['golden-path-tests'],
    task: {
      id: 'operator-approved-rule-reconciliation-evidence',
      action: 'EXTEND_OPERATOR_TOOLING',
      ruleIds: ['BR-001', 'BR-002', 'BR-003', 'BR-004', 'BR-005'],
      targets: [
        { kind: 'FILE', path: 'docs/investment/OPERATING_EVIDENCE_CAPTURE.md' },
        { kind: 'FILE', path: 'scripts/validate-investment-operating-evidence.mjs' },
        { kind: 'FILE', path: 'scripts/finalize-investment-operating-evidence.mjs' },
      ],
    },
  },
});

const REQUIRED_SURFACE_COVERAGE_BY_RULE = deepFreeze({
  'BR-001': ['business-model', 'financial-model', 'agreement-legal-config', 'postgres-runtime', 'golden-path-tests', 'operator-evidence'],
  'BR-002': ['business-model', 'financial-model', 'agreement-legal-config', 'postgres-runtime', 'golden-path-tests', 'operator-evidence'],
  'BR-003': ['business-model', 'financial-model', 'lot-inventory-state-machine', 'agreement-legal-config', 'postgres-runtime', 'golden-path-tests', 'operator-evidence'],
  'BR-004': ['business-model', 'financial-model', 'lot-inventory-state-machine', 'agreement-legal-config', 'postgres-runtime', 'golden-path-tests', 'operator-evidence'],
  'BR-005': ['business-model', 'financial-model', 'lot-inventory-state-machine', 'agreement-legal-config', 'postgres-runtime', 'golden-path-tests', 'operator-evidence'],
});

export const INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT = deepFreeze({
  version: INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_PLAN_VERSION,
  candidate: { ...INVESTMENT_BUSINESS_RULE_CANDIDATE },
  stages: [
    {
      id: 'AUTHORITATIVE_SPEC',
      order: 10,
      description: 'Record the approved business, financial, inventory/state-machine and legal/configuration specification before runtime implementation.',
    },
    {
      id: 'RUNTIME_IMPLEMENTATION',
      order: 20,
      description: 'Implement the approved deterministic rules through a new immutable PostgreSQL migration and required runtime configuration changes.',
    },
    {
      id: 'CONTRACT_VERIFICATION',
      order: 30,
      description: 'Extend deterministic Golden Path and invariant coverage against a clean migration-materialized database.',
    },
    {
      id: 'OPERATOR_VERIFICATION',
      order: 40,
      description: 'Extend operator evidence and reconciliation tooling without authorizing LIVE or automatic money movement.',
    },
  ],
  surfaces: [
    {
      id: 'business-model',
      stage: 'AUTHORITATIVE_SPEC',
      dependsOn: [],
      tasks: [{
        id: 'business-model-authoritative-br-set',
        action: 'MODIFY_EXISTING',
        ruleIds: ['BR-001', 'BR-002', 'BR-003', 'BR-004', 'BR-005'],
        targets: [{ kind: 'FILE', path: 'docs/investment/BUSINESS_MODEL.md' }],
        acceptanceCriteria: [
          'Replace the five PENDING BUSINESS DECISION summaries only after their exact candidate-bound approvals are canonical.',
          'Preserve the closed-beta, no-guaranteed-return and no-automatic-money-movement boundaries.',
          'State cost classification, capital recovery, loss treatment, deterministic long-stop and terminal unsold treatment without silently expanding scope.',
        ],
      }],
    },
    {
      id: 'financial-model',
      stage: 'AUTHORITATIVE_SPEC',
      dependsOn: ['business-model'],
      tasks: [{
        id: 'financial-model-deterministic-waterfall',
        action: 'MODIFY_EXISTING',
        ruleIds: ['BR-001', 'BR-002', 'BR-003', 'BR-004', 'BR-005'],
        targets: [{ kind: 'FILE', path: 'docs/investment/FINANCIAL_MODEL.md' }],
        acceptanceCriteria: [
          'Define FINANCED_CAPITAL_COST versus NON_CAPITAL_DEDUCTION with explicit no-double-count behavior.',
          'Define lot-level LotAvailable reconciliation before allocation-level capital/profit distribution.',
          'Define participant-backed versus CTG-internal recipient isolation and exact capital-recovery/shortfall treatment.',
          'Define half-up participant profit pool reconciliation with largest-remainder cent conservation.',
          'Define how approved losses and terminal zero-proceeds write-offs enter realized lot economics exactly once.',
        ],
      }],
    },
    {
      id: 'lot-inventory-state-machine',
      stage: 'AUTHORITATIVE_SPEC',
      dependsOn: ['business-model'],
      tasks: [{
        id: 'lot-state-machine-long-stop-terminal-disposition',
        action: 'CREATE_OR_MODIFY',
        ruleIds: ['BR-003', 'BR-004', 'BR-005'],
        targets: [
          { kind: 'FILE', path: 'docs/investment/LOT_STATE_MACHINE.md' },
          { kind: 'FILE', path: 'docs/investment/DOMAIN_MODEL.md' },
        ],
        acceptanceCriteria: [
          'Pin longStopDate and the approved extension period at externally funded lot creation.',
          'Require terminal economic disposition of every eligible serialized unit before settlement finalization.',
          'Model loss, return, repurchase, liquidation and terminal write-off as auditable events rather than historical rewrites.',
          'Prohibit date passage from fabricating sales, revenue or automatic repurchase.',
        ],
      }],
    },
    {
      id: 'agreement-legal-config',
      stage: 'AUTHORITATIVE_SPEC',
      dependsOn: ['business-model', 'financial-model', 'lot-inventory-state-machine'],
      tasks: [{
        id: 'agreement-formula-version-binding',
        action: 'MODIFY_EXISTING',
        ruleIds: ['BR-001', 'BR-002', 'BR-003', 'BR-004', 'BR-005'],
        targets: [
          { kind: 'FILE', path: 'docs/investment/LEGAL_CONFIGURATION.md' },
          { kind: 'FILE', path: 'src/lib/investment/config.ts' },
          { kind: 'FILE', path: 'src/app/inversion/legal/page.tsx' },
        ],
        acceptanceCriteria: [
          'Bind the approved rule set to an explicit agreement/formula version without inventing a legal classification.',
          'Propagate the approved participant-facing terms into the actual /inversion/legal instrument that agreement acceptance references.',
          'Preserve separate legal, tax and regulatory authorization requirements for any real-money closed-beta transaction.',
          'Ensure participant-facing copy contains no guaranteed-capital or guaranteed-return language.',
          'Require any future substantive rule change to create a new version instead of mutating historical accepted terms.',
        ],
      }],
    },
    {
      id: 'postgres-runtime',
      stage: 'RUNTIME_IMPLEMENTATION',
      dependsOn: ['business-model', 'financial-model', 'lot-inventory-state-machine', 'agreement-legal-config'],
      tasks: [{
        id: 'postgres-approved-business-rule-propagation',
        action: 'NEW_IMMUTABLE_MIGRATION',
        ruleIds: ['BR-001', 'BR-002', 'BR-003', 'BR-004', 'BR-005'],
        targets: [{ kind: 'DIRECTORY', path: 'supabase/migrations' }],
        acceptanceCriteria: [
          'Use a new contiguous immutable migration assigned from the then-current main migration baseline; never edit an applied migration.',
          'Persist long-stop, extension, formula/agreement and recipient-classification facts required for deterministic replay.',
          'Replace any historical capital-recovery-equals-committed-capital assumption with the approved min(K, A) waterfall.',
          'Reconcile LotAvailable once at lot level and conserve every allocated cent without binary floating-point arithmetic.',
          'Prevent CTG-internal allocations from producing participant settlement, reinvestment or withdrawal capacity.',
          'Keep settlement fail-closed on incomplete, inconsistent, unversioned or non-terminal lot facts.',
          'Preserve the existing no-negative-wallet and no-automatic-capital-call boundary.',
        ],
      }],
    },
    {
      id: 'golden-path-tests',
      stage: 'CONTRACT_VERIFICATION',
      dependsOn: ['postgres-runtime'],
      tasks: [{
        id: 'golden-path-approved-waterfall-contract',
        action: 'EXTEND_CONTRACT_TESTS',
        ruleIds: ['BR-001', 'BR-002', 'BR-003', 'BR-004', 'BR-005'],
        targets: [
          { kind: 'FILE', path: 'scripts/golden-path-transactional-smoke.sql' },
          { kind: 'FILE', path: 'scripts/investment-operational-golden-journey.sql' },
        ],
        acceptanceCriteria: [
          'Cover source-cent conservation and no-double-count cost classification.',
          'Cover full, partial and zero capital recovery plus positive participant profit.',
          'Cover participant-backed versus CTG-internal recipient isolation.',
          'Cover half-cent, largest-remainder and deterministic tie-breaking edges.',
          'Cover documented loss, terminal unsold write-off and no-negative-wallet behavior.',
          'Cover long-stop extension boundaries and prohibition of settlement before terminal inventory reconciliation.',
          'Run against a clean database built from the full immutable migration chain.',
        ],
      }],
    },
    {
      id: 'operator-evidence',
      stage: 'OPERATOR_VERIFICATION',
      dependsOn: ['golden-path-tests'],
      tasks: [{
        id: 'operator-approved-rule-reconciliation-evidence',
        action: 'EXTEND_OPERATOR_TOOLING',
        ruleIds: ['BR-001', 'BR-002', 'BR-003', 'BR-004', 'BR-005'],
        targets: [
          { kind: 'FILE', path: 'docs/investment/OPERATING_EVIDENCE_CAPTURE.md' },
          { kind: 'FILE', path: 'scripts/validate-investment-operating-evidence.mjs' },
          { kind: 'FILE', path: 'scripts/finalize-investment-operating-evidence.mjs' },
        ],
        acceptanceCriteria: [
          'Capture only redacted first-party aggregates required to prove the approved formula was applied to real facts.',
          'Prove external funding, allocated capital, serialized inventory, terminal dispositions and realized financial entries reconcile.',
          'Record the exact implementation commit, migration identity and formula/agreement version used by the reviewed cycle.',
          'Never expose participant identifiers, credentials, raw payment evidence or secrets in repository artifacts.',
          'Treat successful evidence as release-review input only; never as automatic LIVE approval.',
        ],
      }],
    },
  ],
});

export function validateInvestmentBusinessRulePropagationChangeBlueprint(blueprint) {
  assert(blueprint && typeof blueprint === 'object' && !Array.isArray(blueprint), 'Propagation change blueprint is required');
  assert(blueprint.version === INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_PLAN_VERSION, 'Propagation change blueprint version mismatch');
  assert(blueprint.candidate?.path === INVESTMENT_BUSINESS_RULE_CANDIDATE.path, 'Propagation change blueprint candidate path mismatch');
  assert(blueprint.candidate?.commit === INVESTMENT_BUSINESS_RULE_CANDIDATE.commit, 'Propagation change blueprint candidate commit mismatch');
  assert(blueprint.candidate?.blobSha === INVESTMENT_BUSINESS_RULE_CANDIDATE.blobSha, 'Propagation change blueprint candidate blob mismatch');
  assert(blueprint.candidate?.sourcePr === INVESTMENT_BUSINESS_RULE_CANDIDATE.sourcePr, 'Propagation change blueprint candidate PR mismatch');

  assert(Array.isArray(blueprint.stages) && blueprint.stages.length === CANONICAL_STAGE_CONTRACT.length, 'Propagation change blueprint must contain exactly four canonical stages');
  for (const [index, stage] of blueprint.stages.entries()) {
    const expected = CANONICAL_STAGE_CONTRACT[index];
    assert(stage?.id === expected.id, `Propagation change stage[${index}] must be ${expected.id}`);
    assert(stage?.order === expected.order, `Propagation change stage ${expected.id} order mismatch`);
    assert(typeof stage.description === 'string' && stage.description.trim().length >= 20, `Propagation change stage ${stage.id} requires a description`);
  }

  assert(Array.isArray(blueprint.surfaces) && blueprint.surfaces.length === INVESTMENT_BUSINESS_RULE_PROPAGATION_SURFACE_IDS.length, 'Propagation change blueprint must contain exactly seven canonical authority surfaces');
  assert(sameArray(blueprint.surfaces.map((surface) => surface?.id), INVESTMENT_BUSINESS_RULE_PROPAGATION_SURFACE_IDS), 'Propagation change surfaces must use the canonical order and identifiers');

  const coverage = new Map(INVESTMENT_REQUIRED_BUSINESS_RULE_IDS.map((id) => [id, new Set()]));
  const dependenciesBySurface = new Map();

  for (const surface of blueprint.surfaces) {
    const expected = CANONICAL_SURFACE_CONTRACT[surface.id];
    assert(expected, `Unknown propagation change surface: ${surface.id}`);
    assert(surface.stage === expected.stage, `${surface.id} stage must match the canonical contract`);
    assert(sameArray(surface.dependsOn, expected.dependsOn), `${surface.id} dependencies must match the canonical contract`);
    dependenciesBySurface.set(surface.id, surface.dependsOn);

    assert(Array.isArray(surface.tasks) && surface.tasks.length === 1, `${surface.id} must contain exactly one canonical task`);
    const task = surface.tasks[0];
    assert(task?.id === expected.task.id, `${surface.id} task id must be ${expected.task.id}`);
    assert(task?.action === expected.task.action, `${task.id} action must match the canonical surface contract`);
    assert(sameArray(task.ruleIds, expected.task.ruleIds), `${task.id} business-rule coverage must match the canonical surface contract`);
    assert(sameTargets(task.targets, expected.task.targets), `${task.id} targets must match the canonical surface contract`);

    for (const [index, target] of task.targets.entries()) {
      validateRepositoryPath(target.path, `${task.id}.targets[${index}]`);
    }
    for (const ruleId of task.ruleIds) coverage.get(ruleId).add(surface.id);

    assert(Array.isArray(task.acceptanceCriteria) && task.acceptanceCriteria.length > 0, `${task.id} requires acceptance criteria`);
    for (const [index, criterion] of task.acceptanceCriteria.entries()) {
      assert(typeof criterion === 'string' && criterion.trim().length >= 20, `${task.id}.acceptanceCriteria[${index}] is too short`);
    }
  }

  for (const [ruleId, requiredSurfaces] of Object.entries(REQUIRED_SURFACE_COVERAGE_BY_RULE)) {
    const actual = coverage.get(ruleId);
    for (const requiredSurface of requiredSurfaces) {
      assert(actual.has(requiredSurface), `${ruleId} is missing required propagation coverage on ${requiredSurface}`);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(surfaceId) {
    if (visited.has(surfaceId)) return;
    assert(!visiting.has(surfaceId), `Propagation change dependency cycle detected at ${surfaceId}`);
    visiting.add(surfaceId);
    for (const dependency of dependenciesBySurface.get(surfaceId) ?? []) visit(dependency);
    visiting.delete(surfaceId);
    visited.add(surfaceId);
  }
  for (const surfaceId of INVESTMENT_BUSINESS_RULE_PROPAGATION_SURFACE_IDS) visit(surfaceId);

  return blueprint;
}

function deriveRepositoryContentPlanState(governance, propagation) {
  validateInvestmentBusinessRuleGovernance(governance);
  validateInvestmentBusinessRulePropagation(governance, propagation);
  validateInvestmentBusinessRulePropagationChangeBlueprint(
    INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT,
  );

  const blockers = [...derivePendingInvestmentBusinessDecisionIds(governance)];
  const approved = areInvestmentBusinessRulesApproved(governance);
  const propagationRecordedVerified = propagation.status === 'VERIFIED';
  const provenanceRequired = approved || propagationRecordedVerified;
  const status = propagationRecordedVerified
    ? 'PROPAGATION_RECORDED_REQUIRES_MERGED_MAIN_PROVENANCE'
    : approved
      ? 'APPROVALS_RECORDED_REQUIRES_MERGED_MAIN_PROVENANCE'
      : 'BLOCKED_AWAITING_CANONICAL_APPROVAL';

  return deepFreeze({
    version: INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_PLAN_VERSION,
    status,
    authoritative: false,
    blueprintAuthoritative: true,
    governanceProvenanceVerified: false,
    mergedMainProvenanceRequired: provenanceRequired,
    candidate: { ...INVESTMENT_BUSINESS_RULE_CANDIDATE },
    decisionBlockers: blockers,
    approvalsRecordedInCheckout: approved,
    propagationRecordedVerifiedInCheckout: propagationRecordedVerified,
    implementationPlanningEligible: false,
    implementationPrEligible: false,
    implementationAuthorityGranted: false,
    automaticApprovalAllowed: false,
    automaticMutationAllowed: false,
    runtimeMutationAllowedByPlanner: false,
    propagationVerificationAllowed: false,
    pilotAuthorizationGranted: false,
    livePromotionAllowed: false,
    requiredSurfaceCount: INVESTMENT_BUSINESS_RULE_PROPAGATION_SURFACE_IDS.length,
    requiredTaskCount: INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT.surfaces.reduce((sum, surface) => sum + surface.tasks.length, 0),
    blueprint: INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT,
  });
}

// Canonical repository-content evaluator. It accepts no caller-supplied state,
// but intentionally grants no implementation authority because a local checkout
// cannot prove that its governance values were merged into trusted main.
export function buildInvestmentBusinessRulePropagationChangePlan(...args) {
  assert(args.length === 0, 'Propagation change planning accepts repository governance only');
  return deriveRepositoryContentPlanState(
    INVESTMENT_BUSINESS_RULE_GOVERNANCE,
    INVESTMENT_BUSINESS_RULE_PROPAGATION,
  );
}

// Non-authoritative helper for invariant tests and design previews. A simulated
// approval or propagation state can never emit implementation authority.
export function simulateInvestmentBusinessRulePropagationChangePlan({
  governance,
  propagation = INVESTMENT_BUSINESS_RULE_PROPAGATION,
  blueprint = INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT,
} = {}) {
  validateInvestmentBusinessRuleGovernance(governance);
  validateInvestmentBusinessRulePropagation(governance, propagation);
  validateInvestmentBusinessRulePropagationChangeBlueprint(blueprint);

  const blockers = [...derivePendingInvestmentBusinessDecisionIds(governance)];
  const approved = areInvestmentBusinessRulesApproved(governance);
  const propagationRecordedVerified = propagation.status === 'VERIFIED';
  const status = propagationRecordedVerified
    ? 'SIMULATION_PROPAGATION_VERIFIED'
    : approved
      ? 'SIMULATION_APPROVALS_SATISFIED'
      : 'SIMULATION_BLOCKED';

  return deepFreeze({
    version: INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_PLAN_VERSION,
    status,
    authoritative: false,
    blueprintAuthoritative: false,
    governanceProvenanceVerified: false,
    mergedMainProvenanceRequired: false,
    candidate: { ...INVESTMENT_BUSINESS_RULE_CANDIDATE },
    decisionBlockers: blockers,
    simulatedApprovalsSatisfied: approved,
    simulatedPropagationVerified: propagationRecordedVerified,
    implementationPlanningEligible: false,
    implementationPrEligible: false,
    implementationAuthorityGranted: false,
    automaticApprovalAllowed: false,
    automaticMutationAllowed: false,
    runtimeMutationAllowedByPlanner: false,
    propagationVerificationAllowed: false,
    pilotAuthorizationGranted: false,
    livePromotionAllowed: false,
    blueprint,
  });
}

validateInvestmentBusinessRulePropagationChangeBlueprint(
  INVESTMENT_BUSINESS_RULE_PROPAGATION_CHANGE_BLUEPRINT,
);
