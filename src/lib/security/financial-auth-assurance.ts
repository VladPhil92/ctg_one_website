import 'server-only';

import type { AuthenticatedRequestContext } from '@/lib/supabase/server';

type SupportedAal = 'aal1' | 'aal2';

export type FinancialAuthAssuranceState =
  | { allowed: true; mode: 'aal2'; currentLevel: 'aal2'; nextLevel: SupportedAal }
  | { allowed: false; mode: 'mfa-enrollment-required'; currentLevel: 'aal1'; nextLevel: 'aal1' }
  | { allowed: false; mode: 'mfa-challenge-required'; currentLevel: 'aal1'; nextLevel: 'aal2' }
  | { allowed: false; mode: 'assurance-unavailable'; currentLevel: null; nextLevel: null };

function supportedAal(value: unknown): SupportedAal | null {
  return value === 'aal1' || value === 'aal2' ? value : null;
}

/**
 * Phase 5C3 makes AAL2 mandatory for every privileged Finance OS mutation.
 *
 * - aal2/*: the current session already completed MFA -> allow.
 * - aal1/aal2: a verified MFA factor exists but this session has not challenged it -> block and require challenge.
 * - aal1/aal1: no verified factor exists -> block and require enrollment through /admin/security/mfa.
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

  if (currentLevel === 'aal2') {
    return { allowed: true, mode: 'aal2', currentLevel, nextLevel };
  }

  if (nextLevel === 'aal2') {
    return { allowed: false, mode: 'mfa-challenge-required', currentLevel, nextLevel };
  }

  return { allowed: false, mode: 'mfa-enrollment-required', currentLevel, nextLevel };
}
