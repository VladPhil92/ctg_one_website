import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
  type AuthenticatedRequestContext,
} from '@/lib/supabase/server';
import { evaluateFinancialAuthAssurance } from '@/lib/security/financial-auth-assurance';
import {
  recordFinancialSecurityEvent,
  type FinancialSecurityOperation,
  type FinancialSecurityReasonCode,
} from '@/lib/security/financial-security-events';
import {
  evaluateFinancialStepUp,
  FINANCIAL_STEP_UP_MAX_AGE_SECONDS,
} from '@/lib/security/financial-step-up';

const uuid = z.string().uuid();
const optionalNotes = z.string().trim().max(1000).nullable().optional();
const positiveCents = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const investmentRole = z.enum([
  'SUPER_ADMIN',
  'FINANCE_ADMIN',
  'PRODUCTION_MANAGER',
  'INVENTORY_MANAGER',
  'SALES_MANAGER',
  'AUDITOR',
  'PARTICIPANT',
]);

const requestSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('withdrawal.approve'), requestId: uuid }),
  z.object({ operation: z.literal('withdrawal.reject'), requestId: uuid, reason: z.string().trim().min(3).max(1000) }),
  z.object({ operation: z.literal('role.set'), userId: uuid, role: investmentRole }),
  z.object({
    operation: z.literal('funding.verifyBankTransfer'),
    orderId: uuid,
    bankReference: z.string().trim().min(3).max(240),
    receivedAmountCents: positiveCents,
    bankReceivedAt: z.string().datetime({ offset: true }),
    notes: optionalNotes,
  }),
  z.object({
    operation: z.literal('funding.verifyCryptoTransfer'),
    orderId: uuid,
    transactionHash: z.string().trim().min(16).max(240),
    network: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/),
    receivedAmountCents: positiveCents,
    receivedAt: z.string().datetime({ offset: true }),
    notes: optionalNotes,
  }),
  z.object({
    operation: z.literal('payout.initiate'),
    requestId: uuid,
    payoutRail: z.enum(['bank_transfer', 'bre_b', 'crypto', 'other']),
    providerCode: z.string().trim().min(2).max(64),
    destinationMasked: z.string().trim().min(4).max(180),
    destinationFingerprint: z.string().trim().min(8).max(256),
    idempotencyKey: z.string().trim().min(8).max(180),
    notes: optionalNotes,
  }),
  z.object({
    operation: z.literal('payout.confirm'),
    payoutId: uuid,
    externalReference: z.string().trim().min(3).max(240),
    paidAt: z.string().datetime({ offset: true }),
    notes: optionalNotes,
  }),
  z.object({
    operation: z.literal('payout.fail'),
    payoutId: uuid,
    reason: z.string().trim().min(3).max(1000),
    externalReference: z.string().trim().min(3).max(240).nullable().optional(),
  }),
]);

type FinancialRequest = z.infer<typeof requestSchema>;
type AuthorizationDecision = { allowed: boolean; failed: boolean };

async function authorizeFinancialOperation(
  context: AuthenticatedRequestContext,
  operation: FinancialRequest['operation'],
): Promise<AuthorizationDecision> {
  if (operation === 'role.set') {
    const { data, error } = await context.supabase.rpc('get_investment_role');
    return { allowed: !error && data === 'SUPER_ADMIN', failed: !!error };
  }
  if (operation === 'withdrawal.approve' || operation === 'withdrawal.reject') {
    const { data, error } = await context.supabase.rpc('is_investment_admin');
    return { allowed: !error && data === true, failed: !!error };
  }
  const { data, error } = await context.supabase.rpc('has_investment_permission', {
    p_permission: 'finance.manage',
  });
  return { allowed: !error && data === true, failed: !!error };
}

function serverRpcFor(request: FinancialRequest): { rpc: string; args: Record<string, unknown> } {
  switch (request.operation) {
    case 'withdrawal.approve':
      return { rpc: 'approve_withdrawal_server', args: { p_request_id: request.requestId } };
    case 'withdrawal.reject':
      return { rpc: 'reject_withdrawal_server', args: { p_request_id: request.requestId, p_reason: request.reason } };
    case 'role.set':
      return { rpc: 'set_investment_user_role_server', args: { p_user_id: request.userId, p_role: request.role } };
    case 'funding.verifyBankTransfer':
      return {
        rpc: 'verify_investment_bancolombia_transfer_server',
        args: {
          p_order_id: request.orderId,
          p_bank_reference: request.bankReference,
          p_received_amount_cents: request.receivedAmountCents,
          p_bank_received_at: request.bankReceivedAt,
          p_notes: request.notes ?? null,
        },
      };
    case 'funding.verifyCryptoTransfer':
      return {
        rpc: 'verify_investment_crypto_transfer_server',
        args: {
          p_order_id: request.orderId,
          p_transaction_hash: request.transactionHash,
          p_network: request.network,
          p_received_amount_cents: request.receivedAmountCents,
          p_received_at: request.receivedAt,
          p_notes: request.notes ?? null,
        },
      };
    case 'payout.initiate':
      return {
        rpc: 'initiate_investment_payout_server',
        args: {
          p_request_id: request.requestId,
          p_payout_rail: request.payoutRail,
          p_provider_code: request.providerCode,
          p_destination_masked: request.destinationMasked,
          p_destination_fingerprint: request.destinationFingerprint,
          p_idempotency_key: request.idempotencyKey,
          p_notes: request.notes ?? null,
        },
      };
    case 'payout.confirm':
      return {
        rpc: 'confirm_investment_payout_server',
        args: {
          p_payout_id: request.payoutId,
          p_external_reference: request.externalReference,
          p_paid_at: request.paidAt,
          p_notes: request.notes ?? null,
        },
      };
    case 'payout.fail':
      return {
        rpc: 'fail_investment_payout_server',
        args: {
          p_payout_id: request.payoutId,
          p_reason: request.reason,
          p_external_reference: request.externalReference ?? null,
        },
      };
  }
}

function rejectedOperationStatus(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('actor_forbidden') || normalized.includes('not authorized') || normalized.includes('finance.manage required')) return 403;
  if (normalized.includes('not found')) return 404;
  if (normalized.includes('required') || normalized.includes('invalid') || normalized.includes('must ') || normalized.includes('cannot ')) return 422;
  return 409;
}

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function stepUpReasonCode(reason: string): FinancialSecurityReasonCode {
  switch (reason) {
    case 'MISSING_LAST_SIGN_IN':
    case 'INVALID_LAST_SIGN_IN':
    case 'FUTURE_LAST_SIGN_IN':
    case 'STALE_PRIMARY_AUTH':
      return reason;
    default:
      return 'STALE_PRIMARY_AUTH';
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson({ error: 'financial control unavailable' }, 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson({ error: 'invalid JSON body' }, 400);
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson({ error: parsed.error.issues[0]?.message ?? 'invalid request' }, 422);
  }

  const context = await createAuthenticatedRequestContext(request);
  if (!context) return noStoreJson({ error: 'authentication required' }, 401);

  const operation = parsed.data.operation as FinancialSecurityOperation;
  const correlationId = randomUUID();
  const stepUp = evaluateFinancialStepUp(context.user);
  const securityContext = {
    actorUserId: context.user.id,
    operation,
    transport: context.transport,
    actorAuthAgeSeconds: stepUp.ageSeconds,
    correlationId,
  } as const;

  if (!stepUp.allowed) {
    await recordFinancialSecurityEvent({
      ...securityContext,
      eventType: 'FINANCIAL_STEP_UP_REQUIRED',
      reasonCode: stepUpReasonCode(stepUp.reason),
    });
    return noStoreJson({
      error: 'recent authentication required',
      code: 'FINANCIAL_STEP_UP_REQUIRED',
      correlationId,
      maxAgeSeconds: FINANCIAL_STEP_UP_MAX_AGE_SECONDS,
    }, 428);
  }

  const assurance = await evaluateFinancialAuthAssurance(context);
  if (assurance.mode === 'assurance-unavailable') {
    await recordFinancialSecurityEvent({
      ...securityContext,
      eventType: 'FINANCIAL_AUTHORIZATION_UNAVAILABLE',
      reasonCode: 'AUTH_ASSURANCE_BACKEND_ERROR',
    });
    return noStoreJson({
      error: 'authentication assurance check unavailable',
      code: 'FINANCIAL_AUTH_ASSURANCE_UNAVAILABLE',
      correlationId,
    }, 503);
  }
  if (!assurance.allowed && assurance.mode === 'mfa-required') {
    await recordFinancialSecurityEvent({
      ...securityContext,
      eventType: 'FINANCIAL_STEP_UP_REQUIRED',
      reasonCode: 'AAL2_REQUIRED',
    });
    return noStoreJson({
      error: 'multi-factor authentication challenge required',
      code: 'FINANCIAL_MFA_CHALLENGE_REQUIRED',
      correlationId,
      currentLevel: assurance.currentLevel,
      nextLevel: assurance.nextLevel,
    }, 428);
  }

  const authorization = await authorizeFinancialOperation(context, parsed.data.operation);
  if (authorization.failed) {
    await recordFinancialSecurityEvent({
      ...securityContext,
      eventType: 'FINANCIAL_AUTHORIZATION_UNAVAILABLE',
      reasonCode: 'AUTHORIZATION_BACKEND_ERROR',
    });
    return noStoreJson({ error: 'authorization check unavailable', code: 'FINANCIAL_AUTHORIZATION_UNAVAILABLE', correlationId }, 503);
  }
  if (!authorization.allowed) {
    await recordFinancialSecurityEvent({
      ...securityContext,
      eventType: 'FINANCIAL_AUTHORIZATION_DENIED',
      reasonCode: 'INSUFFICIENT_PRIVILEGE',
    });
    return noStoreJson({ error: 'forbidden', code: 'FINANCIAL_AUTHORIZATION_DENIED', correlationId }, 403);
  }

  const { rpc, args } = serverRpcFor(parsed.data);
  const admin = createAdminClient();
  const { data, error } = await admin.rpc(rpc, { p_actor_user_id: context.user.id, ...args });

  if (error) {
    await recordFinancialSecurityEvent({
      ...securityContext,
      eventType: 'FINANCIAL_OPERATION_REJECTED',
      reasonCode: 'DOMAIN_REJECTED',
    });
    return noStoreJson({ error: 'financial operation rejected', code: 'FINANCIAL_OPERATION_REJECTED', correlationId }, rejectedOperationStatus(error.message));
  }

  await recordFinancialSecurityEvent({
    ...securityContext,
    eventType: 'FINANCIAL_OPERATION_SUCCEEDED',
    reasonCode: null,
  });
  return noStoreJson({ data, correlationId });
}
