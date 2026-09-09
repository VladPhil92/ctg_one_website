import { timingSafeEqual } from 'node:crypto';

import { noStoreJson } from '@/lib/federation/secure-json';
import {
  BoldCrowdfundingUnavailableError,
  verifyBoldWebhookEvidence,
  type BoldWebhookEvidence,
} from '@/lib/payments/bold-crowdfunding';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  BoldCrowdfundingUnavailableError,
  type BoldWebhookEvidence,
  verifyBoldWebhookEvidence,
} from '@/lib/payments/bold-crowdfunding';

export const dynamic = 'force-dynamic';

const INTERNAL_SECRET_HEADER = 'x-ctg-crowdfunding-reconciliation-secret';

function noStoreJson(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

type InboxRow = {
  id: string;
  provider_event_id: string;
  provider_payment_id: string;
  event_type: BoldWebhookEvidence['eventType'];
  external_reference: string | null;
  amount_cop: number;
  currency: 'COP';
};

function reconciliationSecretState(request: Request): 'unconfigured' | 'authorized' | 'unauthorized' {
  const expected = process.env.CROWDFUNDING_RECONCILIATION_SECRET?.trim() ?? '';
  if (expected.length < 32) return 'unconfigured';
  const supplied = request.headers.get('x-ctg-reconciliation-secret')?.trim() ?? '';
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length) return 'unauthorized';
  return timingSafeEqual(expectedBytes, suppliedBytes) ? 'authorized' : 'unauthorized';
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson({ error: 'RECONCILIATION_UNAVAILABLE' }, 503);
  }
  const secret = reconciliationSecretState(request);
  if (secret === 'unconfigured') return noStoreJson({ error: 'RECONCILIATION_SECRET_NOT_CONFIGURED' }, 503);
  if (secret !== 'authorized') return noStoreJson({ error: 'UNAUTHORIZED' }, 401);
  amount_cop: number | string;
  currency: BoldWebhookEvidence['currency'];
};

export async function POST(request: Request) {
  const expected = process.env.CROWDFUNDING_RECONCILIATION_SECRET?.trim() ?? '';
  const supplied = request.headers.get(INTERNAL_SECRET_HEADER)?.trim() ?? '';
  if (expected.length < 32 || !safeEqual(expected, supplied)) {
    return noStoreJson({ error: 'UNAUTHORIZED' }, 401);
  }
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson({ error: 'RECONCILIATION_UNAVAILABLE' }, 503);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('federated_crowdfunding_provider_events')
    .select('id,provider_event_id,provider_payment_id,event_type,external_reference,amount_cop,currency')
    .eq('provider', 'bold')
    .eq('verification_status', 'received')
    .order('received_at', { ascending: true })
    .limit(10);

  if (error) return noStoreJson({ error: 'RECONCILIATION_QUEUE_UNAVAILABLE' }, 503);

  // PostgreSQL CHECK constraints on this server-only table restrict event_type
  // and currency to the exact BoldWebhookEvidence unions. Keep that trusted DB
  // boundary represented in TypeScript instead of widening the domain contract.
  const rows = (data ?? []) as InboxRow[];
  const results: Array<{ eventId: string; outcome: string }> = [];

  for (const row of rows) {
    const evidence: BoldWebhookEvidence = {
      eventId: row.provider_event_id,
      paymentId: row.provider_payment_id,
      eventType: row.event_type,
      externalReference: row.external_reference,
      amountCop: Number(row.amount_cop),
      currency: row.currency,
    };

    try {
      const verified = await verifyBoldWebhookEvidence(evidence);
      const { error: rpcError } = await admin.rpc('reconcile_crowdfunding_bold_event_server', {
        p_event_row_id: row.id,
        p_verified: verified,
        p_rejection_code: verified ? null : 'BOLD_PROVIDER_EVIDENCE_MISMATCH',
      });
      if (rpcError) {
        results.push({ eventId: row.id, outcome: 'settlement_failed_closed' });

      if (rpcError) {
        // A provider-verified event can still be permanently invalid for our
        // domain (unknown contribution, amount mismatch, impossible lifecycle).
        // Attempt to dead-letter it through the same audited RPC. If the error
        // was actually transient, this second call will also fail and the row
        // remains `received`, preserving deterministic retry semantics.
        const { error: deadLetterError } = await admin.rpc('reconcile_crowdfunding_bold_event_server', {
          p_event_row_id: row.id,
          p_verified: false,
          p_rejection_code: 'BOLD_SETTLEMENT_DOMAIN_REJECTED',
        });
        results.push({
          eventId: row.id,
          outcome: deadLetterError ? 'settlement_retryable' : 'settlement_rejected',
        });
      } else {
        results.push({ eventId: row.id, outcome: verified ? 'verified' : 'rejected' });
      }
    } catch (verifyError) {
      if (verifyError instanceof BoldCrowdfundingUnavailableError) {
        // Transient provider/configuration failure must not reject or settle the
        // event. Leave it queued for a later deterministic retry.
        results.push({ eventId: row.id, outcome: 'provider_unavailable' });
        continue;
      }
      results.push({ eventId: row.id, outcome: 'verification_failed_closed' });
        results.push({ eventId: row.id, outcome: 'provider_unavailable' });
        continue;
      }

      const { error: deadLetterError } = await admin.rpc('reconcile_crowdfunding_bold_event_server', {
        p_event_row_id: row.id,
        p_verified: false,
        p_rejection_code: 'BOLD_VERIFICATION_FAILED',
      });
      results.push({
        eventId: row.id,
        outcome: deadLetterError ? 'verification_retryable' : 'verification_rejected',
      });
    }
  }

  return noStoreJson({ processed: results.length, results }, 200);
}
