import { createHash } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

const inboundRails = ['bank_transfer', 'pse', 'bre_b_qr', 'crypto'] as const;
const outboundRails = ['bank_transfer', 'bre_b', 'crypto', 'other'] as const;

const eventSchema = z.object({
  providerCode: z.string().trim().min(2).max(64),
  providerEventKey: z.string().trim().min(3).max(180),
  direction: z.enum(['INBOUND', 'OUTBOUND']),
  eventType: z.enum(['SETTLED', 'CONFIRMED', 'FAILED']),
  paymentRail: z.enum(['bank_transfer', 'pse', 'bre_b_qr', 'bre_b', 'crypto', 'other']),
  amountCents: z.number().int().positive().safe(),
  externalReference: z.string().trim().min(3).max(240).nullable().optional(),
  merchantReference: z.string().trim().min(3).max(240).nullable().optional(),
  occurredAt: z.string().datetime({ offset: true }),
}).superRefine((event, ctx) => {
  if (event.direction === 'INBOUND') {
    if (event.eventType !== 'SETTLED') ctx.addIssue({ code: 'custom', message: 'INBOUND events must be SETTLED', path: ['eventType'] });
    if (!inboundRails.includes(event.paymentRail as (typeof inboundRails)[number])) ctx.addIssue({ code: 'custom', message: 'Invalid inbound payment rail', path: ['paymentRail'] });
    if (!event.externalReference) ctx.addIssue({ code: 'custom', message: 'Inbound externalReference is required', path: ['externalReference'] });
  } else {
    if (!['CONFIRMED', 'FAILED'].includes(event.eventType)) ctx.addIssue({ code: 'custom', message: 'OUTBOUND events must be CONFIRMED or FAILED', path: ['eventType'] });
    if (!outboundRails.includes(event.paymentRail as (typeof outboundRails)[number])) ctx.addIssue({ code: 'custom', message: 'Invalid outbound payout rail', path: ['paymentRail'] });
    if (event.eventType === 'CONFIRMED' && !event.externalReference) ctx.addIssue({ code: 'custom', message: 'Confirmed outbound externalReference is required', path: ['externalReference'] });
  }
});

const importSchema = z.object({
  events: z.array(eventSchema).min(1).max(100),
  autoMatch: z.boolean().default(true),
});

function hashNormalizedEvent(event: z.infer<typeof eventSchema>) {
  const canonical = JSON.stringify({
    providerCode: event.providerCode.toUpperCase(),
    providerEventKey: event.providerEventKey,
    direction: event.direction,
    eventType: event.eventType,
    paymentRail: event.paymentRail,
    amountCents: event.amountCents,
    externalReference: event.externalReference ?? null,
    merchantReference: event.merchantReference ?? null,
    occurredAt: new Date(event.occurredAt).toISOString(),
  });
  return createHash('sha256').update(canonical).digest('hex');
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'not available' }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid request' }, { status: 422 });
  }

  const supabase = await createClient();
  const results: Array<{ providerEventKey: string; eventId?: string; outcome?: unknown; error?: string }> = [];

  for (const event of parsed.data.events) {
    const occurredAt = new Date(event.occurredAt).toISOString();
    const { data: eventId, error: ingestError } = await supabase.rpc('ingest_investment_financial_event', {
      p_provider_code: event.providerCode,
      p_provider_event_key: event.providerEventKey,
      p_direction: event.direction,
      p_event_type: event.eventType,
      p_payment_rail: event.paymentRail,
      p_amount_cents: event.amountCents,
      p_external_reference: event.externalReference ?? null,
      p_merchant_reference: event.merchantReference ?? null,
      p_occurred_at: occurredAt,
      p_payload_sha256: hashNormalizedEvent(event),
    });

    if (ingestError) {
      results.push({ providerEventKey: event.providerEventKey, error: ingestError.message });
      continue;
    }

    let outcome: unknown = null;
    if (parsed.data.autoMatch) {
      const { data, error } = await supabase.rpc('auto_match_investment_financial_event', { p_event_id: eventId });
      if (error) {
        results.push({ providerEventKey: event.providerEventKey, eventId: String(eventId), error: error.message });
        continue;
      }
      outcome = data;
    }

    results.push({ providerEventKey: event.providerEventKey, eventId: String(eventId), outcome });
  }

  const failures = results.filter((row) => row.error).length;
  const permissionFailure = results.find((row) => row.error?.includes('finance.manage'));
  return NextResponse.json(
    { imported: results.length - failures, failed: failures, results },
    { status: permissionFailure ? 403 : failures === results.length ? 409 : 200 }
  );
}
