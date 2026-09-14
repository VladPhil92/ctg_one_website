export type RewardPilotCalculationType = 'fixed_points' | 'points_per_cop_block';

export type RewardPreviewInput = {
  calculationType: RewardPilotCalculationType;
  fixedPoints: number | null;
  pointsPerBlock: number | null;
  copBlockCents: number | null;
  minimumAmountCents: number;
  maximumPointsPerEvent: number | null;
  inputAmountCents: number;
};

export type RewardPreviewResult = {
  points: number;
  reason: 'below_minimum' | 'calculated';
  blocks: number | null;
};

const MAX_SAFE_DOMAIN_VALUE = 1_000_000_000_000;

function assertSafeNonNegativeInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_SAFE_DOMAIN_VALUE) {
    throw new Error(`${label} must be a bounded non-negative safe integer`);
  }
}

function assertSafePositiveInteger(value: number | null, label: string): asserts value is number {
  if (value === null || !Number.isSafeInteger(value) || value <= 0 || value > MAX_SAFE_DOMAIN_VALUE) {
    throw new Error(`${label} must be a bounded positive safe integer`);
  }
}

export function calculateRewardPreview(input: RewardPreviewInput): RewardPreviewResult {
  assertSafeNonNegativeInteger(input.inputAmountCents, 'inputAmountCents');
  assertSafeNonNegativeInteger(input.minimumAmountCents, 'minimumAmountCents');
  if (input.maximumPointsPerEvent !== null) {
    assertSafePositiveInteger(input.maximumPointsPerEvent, 'maximumPointsPerEvent');
  }

  if (input.inputAmountCents < input.minimumAmountCents) {
    return { points: 0, reason: 'below_minimum', blocks: null };
  }

  let points: number;
  let blocks: number | null = null;

  if (input.calculationType === 'fixed_points') {
    assertSafePositiveInteger(input.fixedPoints, 'fixedPoints');
    points = input.fixedPoints;
  } else {
    assertSafePositiveInteger(input.pointsPerBlock, 'pointsPerBlock');
    assertSafePositiveInteger(input.copBlockCents, 'copBlockCents');
    blocks = Math.floor(input.inputAmountCents / input.copBlockCents);
    points = blocks * input.pointsPerBlock;
    if (!Number.isSafeInteger(points) || points > MAX_SAFE_DOMAIN_VALUE) {
      throw new Error('calculated points exceed the bounded simulation domain');
    }
  }

  if (input.maximumPointsPerEvent !== null) {
    points = Math.min(points, input.maximumPointsPerEvent);
  }

  return { points, reason: 'calculated', blocks };
}
