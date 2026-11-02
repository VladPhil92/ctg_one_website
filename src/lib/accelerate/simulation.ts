export const ACCELERATE_TERMS = [3, 6, 12, 24, 36, 48, 60] as const;
export type AccelerateTerm = typeof ACCELERATE_TERMS[number];

export type AccelerationSimulationInput = {
  capitalMinor: number;
  qualifiedReferrals: number;
  hypotheticalRewardMinorEach: number;
  termMonths: AccelerateTerm;
};

/**
 * Illustrative principal recovery ONLY. No interest forecast, compensation,
 * wallet credit, contract modification or early unlock is authorized here.
 * Values are integer hundredths of the illustrated settlement asset (USDT).
 */
export function simulateAcceleration(input: AccelerationSimulationInput) {
  const { capitalMinor, qualifiedReferrals, hypotheticalRewardMinorEach, termMonths } = input;
  for (const [key, value] of Object.entries({ capitalMinor, qualifiedReferrals, hypotheticalRewardMinorEach })) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000_000_000) {
      throw new RangeError(`Invalid ${key}`);
    }
  }
  if (!ACCELERATE_TERMS.includes(termMonths)) throw new RangeError('Invalid term');
  const rawRewardMinor = BigInt(qualifiedReferrals) * BigInt(hypotheticalRewardMinorEach);
  const appliedMinor = Number(rawRewardMinor > BigInt(capitalMinor) ? BigInt(capitalMinor) : rawRewardMinor);

  return {
    capitalMinor,
    hypotheticalRewardMinor: rawRewardMinor.toString(),
    potentialPrincipalRecoveryMinor: appliedMinor,
    remainingPrincipalMinor: capitalMinor - appliedMinor,
    // Referral bonuses cannot silently shorten a contract.
    originalTermMonths: termMonths,
    contractMaturityUnchanged: true as const,
    binding: false as const,
  };
}
