import 'server-only';

import { logger } from '@/lib/observability/logger';
import { createAdminClient } from '@/lib/supabase/server';

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

function structuredContext(input: FinancialSecurityEventInput) {
  return {
    actor_user_id: input.actorUserId,
    operation: input.operation,
    outcome_reason_code: input.reasonCode,
    auth_transport: input.transport,
    actor_auth_age_seconds: input.actorAuthAgeSeconds,
    correlation_id: input.correlationId,
  };
}

function emitStructuredSecurityEvent(input: FinancialSecurityEventInput) {
  const context = structuredContext(input);

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
}

/**
 * Record categorical financial-security telemetry in two independent sinks:
 * structured application logs and the append-only PostgreSQL security journal.
 *
 * The input type deliberately accepts no arbitrary metadata or financial payload
 * fields, preventing accidental persistence of bank references, transaction
 * hashes, payout destinations, notes, tokens, OTPs, emails, or raw request bodies.
 *
 * The journal is best-effort observability rather than domain authority. A
 * telemetry outage must never replay, duplicate, or roll back a money mutation;
 * journal failures are therefore elevated in structured logs and reported by the
 * boolean return value without throwing into the financial-control transaction.
 */
export async function recordFinancialSecurityEvent(
  input: FinancialSecurityEventInput,
): Promise<boolean> {
  emitStructuredSecurityEvent(input);

  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc('record_financial_security_event_server', {
      p_actor_user_id: input.actorUserId,
      p_event_type: input.eventType,
      p_operation: input.operation,
      p_reason_code: input.reasonCode,
      p_transport: input.transport,
      p_actor_auth_age_seconds: input.actorAuthAgeSeconds,
      p_correlation_id: input.correlationId,
    });

    if (error) {
      logger.error('security.financial.durable_journal_write_failed', {
        event_type: input.eventType,
        operation: input.operation,
        correlation_id: input.correlationId,
        database_error_code: error.code ?? 'UNKNOWN',
      });
      return false;
    }

    return true;
  } catch {
    logger.error('security.financial.durable_journal_unavailable', {
      event_type: input.eventType,
      operation: input.operation,
      correlation_id: input.correlationId,
    });
    return false;
  }
}
