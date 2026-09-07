import { NextResponse } from 'next/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { getWompiConfig, verifyWompiEventSignature } from '@/lib/education/wompi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 64 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRANSACTION_STATUSES = new Set(['PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR']);

function json(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

async function readBoundedJson(request: Request): Promise<unknown | null> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    return null;
  }
}

function eventChecksum(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const signature = (body as Record<string, unknown>).signature;
  if (!signature || typeof signature !== 'object' || Array.isArray(signature)) return null;
  const checksum = (signature as Record<string, unknown>).checksum;
  return typeof checksum === 'string' ? checksum.trim().toLowerCase() : null;
}

function transactionFromEvent(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  if (record.event !== 'transaction.updated') return null;
  const data = record.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const transaction = (data as Record<string, unknown>).transaction;
  if (!transaction || typeof transaction !== 'object' || Array.isArray(transaction)) return null;

  const tx = transaction as Record<string, unknown>;
  const id = typeof tx.id === 'string' ? tx.id.trim() : '';
  const reference = typeof tx.reference === 'string' ? tx.reference.trim() : '';
  const status = typeof tx.status === 'string' ? tx.status.trim().toUpperCase() : '';
  const currency = typeof tx.currency === 'string' ? tx.currency.trim().toUpperCase() : '';
  const amountInCents = tx.amount_in_cents;

  if (id.length < 1 || id.length > 240) return null;
  if (!UUID_RE.test(reference)) return null;
  if (!TRANSACTION_STATUSES.has(status)) return null;
  if (currency.length !== 3 || !/^[A-Z]{3}$/.test(currency)) return null;
  if (!Number.isSafeInteger(amountInCents) || (amountInCents as number) < 0) return null;

  return { id, orderId: reference, status, currency, amountInCents: amountInCents as number };
}

function providerErrorCode(message: string) {
  const known = [
    'EDUCATION_WOMPI_ORDER_REQUIRED',
    'EDUCATION_WOMPI_TRANSACTION_INVALID',
    'EDUCATION_WOMPI_STATUS_INVALID',
    'EDUCATION_WOMPI_AMOUNT_INVALID',
    'EDUCATION_WOMPI_CURRENCY_INVALID',
    'EDUCATION_WOMPI_CHECKSUM_INVALID',
    'EDUCATION_WOMPI_EVENT_REPLAY_CONFLICT',
    'EDUCATION_WOMPI_ORDER_NOT_FOUND',
    'EDUCATION_WOMPI_PROVIDER_MISMATCH',
    'EDUCATION_WOMPI_CURRENCY_MISMATCH',
    'EDUCATION_WOMPI_AMOUNT_MISMATCH',
    'EDUCATION_WOMPI_ORDER_TOTAL_INVALID',
    'EDUCATION_WOMPI_TRANSACTION_CONFLICT',
    'EDUCATION_WOMPI_ORDER_ALREADY_SETTLED',
    'EDUCATION_WOMPI_ORDER_NOT_SETTLEABLE',
  ];
  return known.find((code) => message.includes(code)) ?? 'EDUCATION_WOMPI_EVENT_PROCESSING_FAILED';
}

function providerErrorStatus(code: string) {
  if (code === 'EDUCATION_WOMPI_ORDER_NOT_FOUND') return 404;
  if (
    code === 'EDUCATION_WOMPI_EVENT_REPLAY_CONFLICT' ||
    code === 'EDUCATION_WOMPI_PROVIDER_MISMATCH' ||
    code === 'EDUCATION_WOMPI_CURRENCY_MISMATCH' ||
    code === 'EDUCATION_WOMPI_AMOUNT_MISMATCH' ||
    code === 'EDUCATION_WOMPI_ORDER_TOTAL_INVALID' ||
    code === 'EDUCATION_WOMPI_TRANSACTION_CONFLICT' ||
    code === 'EDUCATION_WOMPI_ORDER_ALREADY_SETTLED' ||
    code === 'EDUCATION_WOMPI_ORDER_NOT_SETTLEABLE'
  ) return 409;
  if (code === 'EDUCATION_WOMPI_EVENT_PROCESSING_FAILED') return 503;
  return 400;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ ok: false, error: 'EDUCATION_WOMPI_EVENTS_UNAVAILABLE' }, 503);
  }

  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    return json({ ok: false, error: 'EDUCATION_WOMPI_EVENT_CONTENT_TYPE_INVALID' }, 415);
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > MAX_BODY_BYTES) {
      return json({ ok: false, error: 'EDUCATION_WOMPI_EVENT_BODY_TOO_LARGE' }, 413);
    }
  }

  let wompi;
  try {
    wompi = getWompiConfig();
  } catch {
    return json({ ok: false, error: 'EDUCATION_PAYMENT_PROVIDER_CONFIGURATION_INVALID' }, 503);
  }
  if (!wompi) return json({ ok: false, error: 'EDUCATION_WOMPI_EVENTS_NOT_CONFIGURED' }, 503);

  const body = await readBoundedJson(request);
  if (!body) return json({ ok: false, error: 'EDUCATION_WOMPI_EVENT_BODY_INVALID' }, 400);

  const headerChecksum = request.headers.get('x-event-checksum');
  if (!verifyWompiEventSignature(body, headerChecksum, wompi.eventsSecret)) {
    return json({ ok: false, error: 'EDUCATION_WOMPI_EVENT_SIGNATURE_INVALID' }, 401);
  }

  const event = body as Record<string, unknown>;
  if (event.event !== 'transaction.updated') {
    return json({ ok: true, ignored: true, event: typeof event.event === 'string' ? event.event : null });
  }

  const transaction = transactionFromEvent(body);
  const checksum = eventChecksum(body);
  if (!transaction || !checksum) {
    return json({ ok: false, error: 'EDUCATION_WOMPI_TRANSACTION_EVENT_INVALID' }, 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('process_education_wompi_transaction_event', {
    p_order_id: transaction.orderId,
    p_transaction_id: transaction.id,
    p_status: transaction.status,
    p_amount_in_cents: transaction.amountInCents,
    p_currency: transaction.currency,
    p_event_checksum: checksum,
  });

  if (error) {
    const code = providerErrorCode(error.message);
    return json({ ok: false, error: code }, providerErrorStatus(code));
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return json({ ok: false, error: 'EDUCATION_WOMPI_EVENT_RESPONSE_INVALID' }, 503);
  }

  return json({ ok: true, ...data });
}
