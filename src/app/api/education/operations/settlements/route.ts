import { NextResponse } from 'next/server';
import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 4096;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f]/;

type SettlementPayload = {
  orderId?: unknown;
  providerReference?: unknown;
  note?: unknown;
};

function json(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
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

async function authorizeAdmin(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { response: json({ ok: false, error: 'EDUCATION_OPERATIONS_UNAVAILABLE' }, 503) } as const;
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) {
    return { response: json({ ok: false, error: 'UNAUTHENTICATED' }, 401) } as const;
  }

  const { data: isAdmin, error } = await auth.supabase.rpc('is_admin');
  if (error) {
    return { response: json({ ok: false, error: 'EDUCATION_OPERATIONS_AUTHORIZATION_UNAVAILABLE' }, 503) } as const;
  }
  if (isAdmin !== true) {
    return { response: json({ ok: false, error: 'FORBIDDEN' }, 403) } as const;
  }

  return { auth, admin: createAdminClient() } as const;
}

export async function GET(request: Request) {
  const access = await authorizeAdmin(request);
  if ('response' in access) return access.response;

  const { admin } = access;
  const { data: orders, error: ordersError } = await admin
    .from('education_orders')
    .select('id,user_id,status,currency,total_amount,payment_provider,created_at')
    .in('status', ['initiated', 'pending'])
    .eq('payment_provider', 'manual_assisted')
    .order('created_at', { ascending: true })
    .limit(100);

  if (ordersError) {
    return json({ ok: false, error: 'EDUCATION_SETTLEMENT_QUEUE_UNAVAILABLE' }, 503);
  }

  const orderIds = (orders ?? []).map((order) => order.id as string);
  let items: Array<{
    order_id: string;
    offering_id: string;
    quantity: number;
    unit_amount: number;
  }> = [];

  if (orderIds.length > 0) {
    const result = await admin
      .from('education_order_items')
      .select('order_id,offering_id,quantity,unit_amount')
      .in('order_id', orderIds);
    if (result.error) {
      return json({ ok: false, error: 'EDUCATION_SETTLEMENT_QUEUE_UNAVAILABLE' }, 503);
    }
    items = result.data ?? [];
  }

  const offeringIds = [...new Set(items.map((item) => item.offering_id))];
  let offerings: Array<{
    id: string;
    slug: string;
    title: string;
    offering_type: string;
  }> = [];

  if (offeringIds.length > 0) {
    const result = await admin
      .from('education_offerings')
      .select('id,slug,title,offering_type')
      .in('id', offeringIds);
    if (result.error) {
      return json({ ok: false, error: 'EDUCATION_SETTLEMENT_QUEUE_UNAVAILABLE' }, 503);
    }
    offerings = result.data ?? [];
  }

  const offeringById = new Map(offerings.map((offering) => [offering.id, offering]));
  const itemsByOrder = new Map<string, Array<Record<string, unknown>>>();
  for (const item of items) {
    const current = itemsByOrder.get(item.order_id) ?? [];
    current.push({
      offeringId: item.offering_id,
      quantity: item.quantity,
      unitAmount: item.unit_amount,
      offering: offeringById.get(item.offering_id) ?? null,
    });
    itemsByOrder.set(item.order_id, current);
  }

  const { data: recentSettlements, error: settlementsError } = await admin
    .from('education_payment_settlements')
    .select('id,order_id,payment_provider,provider_reference,total_amount,currency,operator_user_id,operator_note,settled_at')
    .order('settled_at', { ascending: false })
    .limit(50);

  if (settlementsError) {
    return json({ ok: false, error: 'EDUCATION_SETTLEMENT_HISTORY_UNAVAILABLE' }, 503);
  }

  return json({
    ok: true,
    queue: (orders ?? []).map((order) => ({
      ...order,
      items: itemsByOrder.get(order.id as string) ?? [],
    })),
    recentSettlements: recentSettlements ?? [],
  });
}

export async function POST(request: Request) {
  const access = await authorizeAdmin(request);
  if ('response' in access) return access.response;

  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    return json({ ok: false, error: 'EDUCATION_SETTLEMENT_CONTENT_TYPE_INVALID' }, 415);
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > MAX_BODY_BYTES) {
      return json({ ok: false, error: 'EDUCATION_SETTLEMENT_BODY_TOO_LARGE' }, 413);
    }
  }

  const rawBody = await readBoundedJson(request);
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return json({ ok: false, error: 'EDUCATION_SETTLEMENT_BODY_INVALID' }, 400);
  }

  const body = rawBody as SettlementPayload;
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const providerReference = typeof body.providerReference === 'string' ? body.providerReference.trim() : '';
  const note = typeof body.note === 'string' ? body.note.trim() : '';

  if (!UUID_RE.test(orderId)) {
    return json({ ok: false, error: 'EDUCATION_SETTLEMENT_ORDER_INVALID' }, 400);
  }
  if (
    providerReference.length < 1 ||
    providerReference.length > 240 ||
    CONTROL_CHAR_RE.test(providerReference)
  ) {
    return json({ ok: false, error: 'EDUCATION_SETTLEMENT_REFERENCE_INVALID' }, 400);
  }
  if (note.length > 2000 || note.includes('\u0000')) {
    return json({ ok: false, error: 'EDUCATION_SETTLEMENT_NOTE_INVALID' }, 400);
  }

  const { data, error } = await access.admin.rpc('settle_education_order', {
    p_order_id: orderId,
    p_operator_user_id: access.auth.user.id,
    p_provider_reference: providerReference,
    p_operator_note: note || null,
  });

  if (error) {
    if (error.code === '23505') {
      return json({ ok: false, error: 'EDUCATION_SETTLEMENT_REFERENCE_CONFLICT' }, 409);
    }

    const message = error.message;
    const known = [
      'EDUCATION_SETTLEMENT_ORDER_REQUIRED',
      'EDUCATION_SETTLEMENT_OPERATOR_REQUIRED',
      'EDUCATION_SETTLEMENT_OPERATOR_FORBIDDEN',
      'EDUCATION_SETTLEMENT_REFERENCE_INVALID',
      'EDUCATION_SETTLEMENT_NOTE_INVALID',
      'EDUCATION_SETTLEMENT_ORDER_NOT_FOUND',
      'EDUCATION_SETTLEMENT_ALREADY_COMPLETED',
      'EDUCATION_SETTLEMENT_ORDER_NOT_PENDING',
      'EDUCATION_SETTLEMENT_PROVIDER_UNSUPPORTED',
      'EDUCATION_SETTLEMENT_ORDER_TOTAL_INVALID',
    ];
    const code = known.find((candidate) => message.includes(candidate)) ?? 'EDUCATION_SETTLEMENT_FAILED';
    const status = code === 'EDUCATION_SETTLEMENT_ORDER_NOT_FOUND'
      ? 404
      : code === 'EDUCATION_SETTLEMENT_OPERATOR_FORBIDDEN'
        ? 403
        : code === 'EDUCATION_SETTLEMENT_ALREADY_COMPLETED' ||
            code === 'EDUCATION_SETTLEMENT_ORDER_NOT_PENDING' ||
            code === 'EDUCATION_SETTLEMENT_PROVIDER_UNSUPPORTED' ||
            code === 'EDUCATION_SETTLEMENT_ORDER_TOTAL_INVALID'
          ? 409
          : code === 'EDUCATION_SETTLEMENT_FAILED'
            ? 503
            : 400;
    return json({ ok: false, error: code }, status);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return json({ ok: false, error: 'EDUCATION_SETTLEMENT_RESPONSE_INVALID' }, 503);
  }

  return json({ ok: true, ...data });
}