import 'server-only';

import type { AuthenticatedRequestContext } from '@/lib/supabase/server';

type SupportedAal = 'aal1' | 'aal2';

export type FinancialAuthAssuranceState =
  | { allowed: true; mode: 'aal1-no-verified-factor' | 'aal2'; currentLevel: SupportedAal; nextLevel: SupportedAal }
  | { allowed: false; mode: 'mfa-required'; currentLevel: 'aal1'; nextLevel: 'aal2' }
  | { allowed: false; mode: 'assurance-unavailable'; currentLevel: null; nextLevel: null };

function supportedAal(value: unknown): SupportedAal | null {
  return value === 'aal1' || value === 'aal2' ? value : null;
}

/**
 * Phase 5C1 is intentionally MFA-aware rather than MFA-mandatory.
 *
 * - aal2/aal2: an enrolled operator already completed MFA -> allow.
 * - aal1/aal2: a verified MFA factor exists but this session has not challenged it -> block.
 * - aal1/aal1: no verified factor is available yet -> preserve Phase 5A fresh-auth while
 *   enrollment UX is rolled out, avoiding an administrative lockout.
 *
 * The bearer JWT reaches this helper only after server-side `auth.getUser(jwt)` validation.
 * It is passed directly back to Supabase Auth for assurance evaluation and is never logged.
 */
export async function evaluateFinancialAuthAssurance(
  context: AuthenticatedRequestContext,
): Promise<FinancialAuthAssuranceState> {
  const { data, error } = await context.supabase.auth.mfa.getAuthenticatorAssuranceLevel(
    context.verifiedBearerToken ?? undefined,
  );

  if (error || !data) {
    return { allowed: false, mode: 'assurance-unavailable', currentLevel: null, nextLevel: null };
  }

  const currentLevel = supportedAal(data.currentLevel);
  const nextLevel = supportedAal(data.nextLevel);
  if (!currentLevel || !nextLevel) {
    return { allowed: false, mode: 'assurance-unavailable', currentLevel: null, nextLevel: null };
  }

  if (currentLevel === 'aal1' && nextLevel === 'aal2') {
    return { allowed: false, mode: 'mfa-required', currentLevel, nextLevel };
  }

  if (currentLevel === 'aal2') {
    return { allowed: true, mode: 'aal2', currentLevel, nextLevel };
  }

  return { allowed: true, mode: 'aal1-no-verified-factor', currentLevel, nextLevel };
}
