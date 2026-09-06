import 'server-only';

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

/**
 * Write categorical security telemetry only. This helper deliberately accepts no
 * arbitrary metadata or financial payload fields, preventing accidental logging
 * of bank references, transaction hashes, payout destinations, notes, tokens,
 * OTPs, emails, or request bodies.
 *
 * Authoritative domain mutations remain fail-closed in their own PostgreSQL
 * boundaries. Telemetry is best-effort so an observability outage cannot become
 * a money-rail outage; failures are surfaced to server logs with identifiers only.
 */
export async function recordFinancialSecurityEvent(
  input: FinancialSecurityEventInput,
): Promise<boolean> {
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
      console.error('[security] financial telemetry write failed', {
        eventType: input.eventType,
        operation: input.operation,
        correlationId: input.correlationId,
        code: error.code ?? 'UNKNOWN',
      });
      return false;
    }
    return true;
  } catch {
    console.error('[security] financial telemetry unavailable', {
      eventType: input.eventType,
      operation: input.operation,
      correlationId: input.correlationId,
    });
    return false;
  }
}
