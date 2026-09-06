import 'server-only';

import { logger } from '@/lib/observability/logger';

export type FinancialSecurityOperation =
  | 'withdrawal.approve'
  | 'withdrawal.reject'
  | 'role.set'
  | 'funding.verifyBankTransfer'
  | 'funding.verifyCryptoTransfer'
  | 'payout.initiate'
  | 'payout.confirm'
  | 'payout.fail';

export type FinancialSecurityEventType =
  | 'FINANCIAL_STEP_UP_REQUIRED'
  | 'FINANCIAL_AUTHORIZATION_UNAVAILABLE'
  | 'FINANCIAL_AUTHORIZATION_DENIED'
  | 'FINANCIAL_OPERATION_REJECTED'
  | 'FINANCIAL_OPERATION_SUCCEEDED';

export type FinancialSecurityReasonCode =
  | 'STALE_PRIMARY_AUTH'
  | 'MISSING_LAST_SIGN_IN'
  | 'INVALID_LAST_SIGN_IN'
  | 'FUTURE_LAST_SIGN_IN'
  | 'AUTHORIZATION_BACKEND_ERROR'
  | 'INSUFFICIENT_PRIVILEGE'
  | 'DOMAIN_REJECTED';

type FinancialSecurityEventInput = {
  actorUserId: string;
  eventType: FinancialSecurityEventType;
  operation: FinancialSecurityOperation;
  reasonCode: FinancialSecurityReasonCode | null;
  transport: 'bearer' | 'cookie';
  actorAuthAgeSeconds: number | null;
  correlationId: string;
};

/**
 * Emit categorical security telemetry only. The type intentionally accepts no
 * arbitrary metadata or financial payload fields, preventing accidental logging
 * of bank references, transaction hashes, payout destinations, notes, tokens,
 * OTPs, emails, or raw request bodies.
 *
 * Phase 5A is deliberately schema-free so it can deploy against the currently
 * certified 0114 production database. A durable append-only PostgreSQL journal
 * belongs to Phase 5B after Supabase migration-write permission is restored.
 */
export async function recordFinancialSecurityEvent(
  input: FinancialSecurityEventInput,
): Promise<boolean> {
  const context = {
    actor_user_id: input.actorUserId,
    operation: input.operation,
    outcome_reason_code: input.reasonCode,
    auth_transport: input.transport,
    actor_auth_age_seconds: input.actorAuthAgeSeconds,
    correlation_id: input.correlationId,
  };

  switch (input.eventType) {
    case 'FINANCIAL_OPERATION_SUCCEEDED':
      logger.info('security.financial.operation_succeeded', context);
      break;
    case 'FINANCIAL_AUTHORIZATION_UNAVAILABLE':
      logger.error('security.financial.authorization_unavailable', context);
      break;
    case 'FINANCIAL_AUTHORIZATION_DENIED':
      logger.error('security.financial.authorization_denied', context);
      break;
    case 'FINANCIAL_OPERATION_REJECTED':
      logger.warn('security.financial.operation_rejected', context);
      break;
    case 'FINANCIAL_STEP_UP_REQUIRED':
      logger.warn('security.financial.step_up_required', context);
      break;
  }

  return true;
}
