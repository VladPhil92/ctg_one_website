import { createHash } from 'node:crypto';

import { BoundedJsonError, isJsonRequest, noStoreJson, readBoundedJson } from '@/lib/federation/secure-json';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_TYPES = new Set(['SALE_APPROVED', 'SALE_REJECTED', 'VOID_APPROVED', 'VOID_REJECTED']);

type EventShape = {
  id: string;
  type: string;
  paymentId: string;
  externalReference: string | null;
  amountCop: number;
  currency: string;
};

function parseEvent(value: unknown): EventShape | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const root = value as Record<string, unknown>;
  const data = root.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const dataRow = data as Record<string, unknown>;
  const amount = dataRow.amount;
  if (!amount || typeof amount !== 'object' || Array.isArray(amount)) return null;
  const amountRow = amount as Record<string, unknown>;
  const metadata = dataRow.metadata;
  const metadataRow = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : null;

  const id = typeof root.id === 'string' ? root.id.trim() : '';
  const type = typeof root.type === 'string' ? root.type.trim().toUpperCase() : '';
  const paymentId = typeof dataRow.payment_id === 'string' ? dataRow.payment_id.trim() : '';
  const externalReference = typeof metadataRow?.reference === 'string' ? metadataRow.reference.trim() : null;
  const currency = typeof amountRow.currency === 'string' ? amountRow.currency.trim().toUpperCase() : '';
  const amountCop = amountRow.total;

  if (!UUID.test(id) || !EVENT_TYPES.has(type) || !paymentId || paymentId.length > 180) return null;
  if (currency !== 'COP' || !Number.isSafeInteger(amountCop) || (amountCop as number) < 0) return null;
  if (externalReference !== null && (externalReference.length > 60 || !/^[A-Za-z0-9_-]+$/.test(externalReference))) return null;

  return { id, type, paymentId, externalReference, amountCop: amountCop as number, currency };
}

function checksum(event: EventShape): string {
  return createHash('sha256').update(JSON.stringify([
    event.id,
    event.type,
    event.paymentId,
    event.externalReference,
    event.amountCop,
    event.currency,
  ])).digest('hex');
}

export async function POST(request: Request) {
  // Bold requires a fast webhook acknowledgement. This endpoint stores only a
  // bounded untrusted inbox record. It never settles money synchronously.
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson({ received: false }, 503);
  }
  if (!isJsonRequest(request)) return noStoreJson({ received: false }, 415);

  let event: EventShape;
  try {
    const parsed = parseEvent(await readBoundedJson(request, 16 * 1024));
    if (!parsed) return noStoreJson({ received: false }, 400);
    event = parsed;
  } catch (error) {
    if (error instanceof BoundedJsonError) return noStoreJson({ received: false, error: error.code }, error.status);
    return noStoreJson({ received: false }, 400);
  }

  // Ignore unrelated Bold traffic without exposing merchant internals or
  // forcing retries. Only deterministic Vértice crowdfunding references enter
  // the reconciliation queue.
  if (!event.externalReference?.startsWith('VCF_')) {
    return noStoreJson({ received: true, ignored: true }, 200);
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc('record_crowdfunding_bold_webhook_inbox_server', {
    p_provider_event_id: event.id,
    p_provider_payment_id: event.paymentId,
    p_event_type: event.type,
    p_external_reference: event.externalReference,
    p_amount_cop: event.amountCop,
    p_currency: event.currency,
    p_event_checksum: checksum(event),
  });

  if (error) {
    if ((error.message ?? '').includes('REPLAY_CONFLICT')) {
      return noStoreJson({ received: false, error: 'EVENT_REPLAY_CONFLICT' }, 409);
    }
    return noStoreJson({ received: false }, 503);
  }

  return noStoreJson({ received: true }, 200);
}
