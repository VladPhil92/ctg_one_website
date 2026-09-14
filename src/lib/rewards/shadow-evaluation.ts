import { calculateRewardPreview, type RewardPilotCalculationType } from '@/lib/rewards/pilot-simulation';

export type RewardShadowRuntime = {
  processingEnabled: boolean;
  maxAmountCents: number;
  maxPointsPerEvent: number;
  maxEventsPerSubjectPerDay: number;
};

export type RewardShadowRule = {
  id: string;
  pilotUnitId: string;
  eventCode: string;
  calculationType: RewardPilotCalculationType;
  fixedPoints: number | null;
  pointsPerBlock: number | null;
  copBlockCents: number | null;
  minimumAmountCents: number;
  maximumPointsPerEvent: number | null;
};

export type RewardShadowDecision = 'eligible' | 'ineligible' | 'blocked' | 'no_unit' | 'no_rule';
export type RewardShadowDirection = 'credit' | 'none';

export type RewardShadowEvaluationResult = {
  decision: RewardShadowDecision;
  direction: RewardShadowDirection;
  calculatedPoints: number;
  reasonCode: string;
  previewReason: 'below_minimum' | 'calculated' | null;
  blocks: number | null;
};

type RewardShadowEvaluationInput = {
  runtime: RewardShadowRuntime;
  validatedUnitAvailable: boolean;
  rule: RewardShadowRule | null;
  inputAmountCents: number;
  subjectDailyOriginalCount: number;
};

function zero(decision: RewardShadowDecision, reasonCode: string, previewReason: RewardShadowEvaluationResult['previewReason'] = null): RewardShadowEvaluationResult {
  return { decision, direction: 'none', calculatedPoints: 0, reasonCode, previewReason, blocks: null };
}

export function evaluateShadowReward(input: RewardShadowEvaluationInput): RewardShadowEvaluationResult {
  if (!input.runtime.processingEnabled) return zero('blocked', 'kill_switch_disabled');
  if (input.inputAmountCents > input.runtime.maxAmountCents) return zero('blocked', 'amount_limit_exceeded');
  if (input.subjectDailyOriginalCount > input.runtime.maxEventsPerSubjectPerDay) return zero('blocked', 'subject_daily_event_limit_exceeded');
  if (!input.validatedUnitAvailable) return zero('no_unit', 'validated_unit_missing');
  if (!input.rule) return zero('no_rule', 'validated_rule_missing');

  const preview = calculateRewardPreview({
    calculationType: input.rule.calculationType,
    fixedPoints: input.rule.fixedPoints,
    pointsPerBlock: input.rule.pointsPerBlock,
    copBlockCents: input.rule.copBlockCents,
    minimumAmountCents: input.rule.minimumAmountCents,
    maximumPointsPerEvent: input.rule.maximumPointsPerEvent,
    inputAmountCents: input.inputAmountCents,
  });

  if (preview.reason === 'below_minimum' || preview.points <= 0) {
    return { ...zero('ineligible', 'below_minimum', preview.reason), blocks: preview.blocks };
  }

  const calculatedPoints = Math.min(preview.points, input.runtime.maxPointsPerEvent);
  if (!Number.isSafeInteger(calculatedPoints) || calculatedPoints <= 0) {
    return zero('blocked', 'runtime_points_limit_invalid');
  }

  return {
    decision: 'eligible',
    direction: 'credit',
    calculatedPoints,
    reasonCode: calculatedPoints < preview.points ? 'runtime_points_cap_applied' : 'rule_calculated',
    previewReason: preview.reason,
    blocks: preview.blocks,
  };
}
