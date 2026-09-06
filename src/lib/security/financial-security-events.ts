import 'server-only';

import { logger } from '@/lib/observability/logger';
import { EXPECTED_DATABASE_MIGRATION } from '@/lib/observability/schema-version';
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

const durableJournalAvailable = Number(EXPECTED_DATABASE_MIGRATION) >= 115;

function emitStructuredSecurityEvent(input: FinancialSecurityEventInput) {
  const context = {
    actor_user_id: input.actorUserId,
    operation: input.operation,
    outcome_reason_code: input.reasonCode,
    auth_transport: input.transport,
    actor_auth_age_seconds: input.actorAuthAgeSeconds,
    correlation_id: input.correlationId,
    durable_journal_expected: durableJournalAvailable,
  };

  switch (input.eventType) {
    case 'FINANCIAL_OPERATION_SUCCEEDED':
      logger.info('security.financial.operation_succeeded', context);
      return;
    case 'FINANCIAL_AUTHORIZATION_UNAVAILABLE':
    case 'FINANCIAL_AUTHORIZATION_DENIED':
      logger.error(`security.financial.${input.eventType.toLowerCase()}`, context);
      return;
    default:
      logger.warn(`security.financial.${input.eventType.toLowerCase()}`, context);
  }
}

/**
 * Emit categorical security telemetry only. This helper deliberately accepts no
 * arbitrary metadata or financial payload fields, preventing accidental logging
 * of bank references, transaction hashes, payout destinations, notes, tokens,
 * OTPs, emails, or request bodies.
 *
 * Structured Render telemetry is always emitted. The append-only PostgreSQL sink
 * is activated only once the runtime schema contract advances to 0115, so code
 * deployed against the currently certified 0114 production schema never depends
 * on a migration that has not been authorized yet.
 */
export async function recordFinancialSecurityEvent(
  input: FinancialSecurityEventInput,
): Promise<boolean> {
  emitStructuredSecurityEvent(input);

  if (!durableJournalAvailable) return true;

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
