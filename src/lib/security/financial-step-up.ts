export const FINANCIAL_STEP_UP_MAX_AGE_SECONDS = 15 * 60;
export const FINANCIAL_STEP_UP_CLOCK_SKEW_SECONDS = 2 * 60;

export type FinancialStepUpReason =
  | 'RECENT_PRIMARY_AUTH'
  | 'MISSING_LAST_SIGN_IN'
  | 'INVALID_LAST_SIGN_IN'
  | 'FUTURE_LAST_SIGN_IN'
  | 'STALE_PRIMARY_AUTH';

export type FinancialStepUpState = {
  allowed: boolean;
  ageSeconds: number | null;
  reason: FinancialStepUpReason;
};

type UserWithLastSignIn = {
  last_sign_in_at?: string | null;
};

/**
 * Financial mutations require a recently authenticated primary session.
 * `last_sign_in_at` comes from Supabase Auth's server-verified `getUser()` result,
 * never from user_metadata or a browser-provided claim.
 *
 * Refreshing a session does not count as a new primary authentication. A future
 * migration can additionally require AAL2 after MFA enrollment is available to
 * Finance OS operators; enforcing AAL2 before that enrollment path exists would
 * lock legitimate administrators out of production.
 */
export function evaluateFinancialStepUp(
  user: UserWithLastSignIn,
  nowMs = Date.now(),
): FinancialStepUpState {
  const raw = user.last_sign_in_at;
  if (!raw) {
    return { allowed: false, ageSeconds: null, reason: 'MISSING_LAST_SIGN_IN' };
  }

  const signedInAtMs = Date.parse(raw);
  if (!Number.isFinite(signedInAtMs)) {
    return { allowed: false, ageSeconds: null, reason: 'INVALID_LAST_SIGN_IN' };
  }

  const deltaMs = nowMs - signedInAtMs;
  if (deltaMs < -FINANCIAL_STEP_UP_CLOCK_SKEW_SECONDS * 1000) {
    return { allowed: false, ageSeconds: null, reason: 'FUTURE_LAST_SIGN_IN' };
  }

  const ageSeconds = Math.max(0, Math.floor(deltaMs / 1000));
  if (ageSeconds > FINANCIAL_STEP_UP_MAX_AGE_SECONDS) {
    return { allowed: false, ageSeconds, reason: 'STALE_PRIMARY_AUTH' };
  }

  return { allowed: true, ageSeconds, reason: 'RECENT_PRIMARY_AUTH' };
}
