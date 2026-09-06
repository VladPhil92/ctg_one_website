import 'server-only';

import { logger } from '@/lib/observability/logger';
import type { AuthenticatedRequestContext } from '@/lib/supabase/server';

export const FINANCIAL_MFA_PATH = '/dashboard/seguridad/mfa' as const;

export type FinancialMfaEnforcementMode = 'enrolled' | 'required';
export type FinancialMfaReason =
  | 'MFA_CHALLENGE_REQUIRED'
  | 'MFA_ENROLLMENT_REQUIRED'
  | 'MFA_SESSION_REFRESH_REQUIRED'
  | 'MFA_ASSURANCE_UNAVAILABLE';

export type FinancialMfaDecision = {
  allowed: boolean;
  failed: boolean;
  enrollmentRecommended: boolean;
  currentLevel: 'aal1' | 'aal2';
  nextLevel: 'aal1' | 'aal2';
  reason: FinancialMfaReason | null;
  enforcementMode: FinancialMfaEnforcementMode;
};

function enforcementMode(): FinancialMfaEnforcementMode {
  return process.env.FINANCIAL_MFA_ENFORCEMENT_MODE === 'required' ? 'required' : 'enrolled';
}

export async function evaluateFinancialMfa(
  context: AuthenticatedRequestContext,
): Promise<FinancialMfaDecision> {
  const mode = enforcementMode();

  try {
    const { data, error } = await context.getAuthenticatorAssuranceLevel();
    if (error || !data) {
      return {
        allowed: false,
        failed: true,
        enrollmentRecommended: false,
        currentLevel: 'aal1',
        nextLevel: 'aal1',
        reason: 'MFA_ASSURANCE_UNAVAILABLE',
        enforcementMode: mode,
      };
    }

    const currentLevel = data.currentLevel === 'aal2' ? 'aal2' : 'aal1';
    const nextLevel = data.nextLevel === 'aal2' ? 'aal2' : 'aal1';

    // A stale JWT can report aal2 while the user's enabled-factor state has
    // already fallen back to aal1. Never authorize money movement from that
    // inconsistent assurance snapshot; force the browser to refresh/re-enter
    // the MFA flow instead.
    if (currentLevel === 'aal2' && nextLevel === 'aal1') {
      return {
        allowed: false,
        failed: false,
        enrollmentRecommended: false,
        currentLevel,
        nextLevel,
        reason: 'MFA_SESSION_REFRESH_REQUIRED',
        enforcementMode: mode,
      };
    }

    if (currentLevel === 'aal2') {
      return {
        allowed: true,
        failed: false,
        enrollmentRecommended: false,
        currentLevel,
        nextLevel,
        reason: null,
        enforcementMode: mode,
      };
    }

    // Enrolled users must prove possession of their verified factor before a
    // privileged financial action. This is enforced even during staged rollout.
    if (nextLevel === 'aal2') {
      return {
        allowed: false,
        failed: false,
        enrollmentRecommended: false,
        currentLevel,
        nextLevel,
        reason: 'MFA_CHALLENGE_REQUIRED',
        enforcementMode: mode,
      };
    }

    // Phase 5C ships enrollment before mandatory global MFA. Accounts with no
    // factor remain protected by fresh-auth + RBAC + server-only DB wrappers.
    // Setting FINANCIAL_MFA_ENFORCEMENT_MODE=required later flips this boundary
    // to fail closed for all finance actors without another code release.
    if (mode === 'required') {
      return {
        allowed: false,
        failed: false,
        enrollmentRecommended: false,
        currentLevel,
        nextLevel,
        reason: 'MFA_ENROLLMENT_REQUIRED',
        enforcementMode: mode,
      };
    }

    return {
      allowed: true,
      failed: false,
      enrollmentRecommended: true,
      currentLevel,
      nextLevel,
      reason: null,
      enforcementMode: mode,
    };
  } catch {
    return {
      allowed: false,
      failed: true,
      enrollmentRecommended: false,
      currentLevel: 'aal1',
      nextLevel: 'aal1',
      reason: 'MFA_ASSURANCE_UNAVAILABLE',
      enforcementMode: mode,
    };
  }
}

export function recordFinancialMfaDecision(
  actorUserId: string,
  operation: string,
  correlationId: string,
  decision: FinancialMfaDecision,
) {
  const context = {
    actor_user_id: actorUserId,
    operation,
    correlation_id: correlationId,
    current_aal: decision.currentLevel,
    next_aal: decision.nextLevel,
    enforcement_mode: decision.enforcementMode,
    reason_code: decision.reason,
  };

  if (decision.failed) {
    logger.error('security.financial.mfa_assurance_unavailable', context);
    return;
  }
  if (!decision.allowed) {
    logger.warn('security.financial.mfa_required', context);
    return;
  }
  if (decision.enrollmentRecommended) {
    logger.warn('security.financial.mfa_enrollment_recommended', context);
    return;
  }
  logger.info('security.financial.mfa_satisfied', context);
}
