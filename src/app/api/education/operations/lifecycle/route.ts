import { NextResponse } from 'next/server';
import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 4096;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f]/;

type LifecyclePayload = {
  orderId?: unknown;
  action?: unknown;
  reason?: unknown;
  providerReference?: unknown;
};

function json(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
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

  const url = new URL(request.url);
  const page = parsePositiveInt(url.searchParams.get('page'), 1, 1000000);
  const pageSize = parsePositiveInt(url.searchParams.get('pageSize'), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { admin } = access;
  const { data: orders, error: ordersError, count } = await admin
    .from('education_orders')
    .select(
      'id,user_id,status,currency,total_amount,payment_provider,provider_reference,verified_at,created_at',
      { count: 'exact' },
    )
    .in('status', ['initiated', 'pending', 'paid'])
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);

  if (ordersError) {
    return json({ ok: false, error: 'EDUCATION_LIFECYCLE_QUEUE_UNAVAILABLE' }, 503);
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
      return json({ ok: false, error: 'EDUCATION_LIFECYCLE_QUEUE_UNAVAILABLE' }, 503);
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
      return json({ ok: false, error: 'EDUCATION_LIFECYCLE_QUEUE_UNAVAILABLE' }, 503);
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

  const { data: events, error: eventsError } = await admin
    .from('education_order_lifecycle_events')
    .select('id,order_id,event_type,previous_status,new_status,operator_user_id,reason,provider_reference,affected_entitlements,created_at')
    .order('created_at', { ascending: false })
    .limit(75);

  if (eventsError) {
    return json({ ok: false, error: 'EDUCATION_LIFECYCLE_HISTORY_UNAVAILABLE' }, 503);
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return json({
    ok: true,
    queue: (orders ?? []).map((order) => ({
      ...order,
      items: itemsByOrder.get(order.id as string) ?? [],
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
    recentEvents: events ?? [],
  });
}

export async function POST(request: Request) {
  const access = await authorizeAdmin(request);
  if ('response' in access) return access.response;

  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ ok: false, error: 'EDUCATION_LIFECYCLE_CROSS_SITE_FORBIDDEN' }, 403);
  }

  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    return json({ ok: false, error: 'EDUCATION_LIFECYCLE_CONTENT_TYPE_INVALID' }, 415);
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const parsedLength = Number(contentLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > MAX_BODY_BYTES) {
      return json({ ok: false, error: 'EDUCATION_LIFECYCLE_BODY_TOO_LARGE' }, 413);
    }
  }

  const rawBody = await readBoundedJson(request);
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return json({ ok: false, error: 'EDUCATION_LIFECYCLE_BODY_INVALID' }, 400);
  }

  const body = rawBody as LifecyclePayload;
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
  const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const providerReference = typeof body.providerReference === 'string' ? body.providerReference.trim() : '';

  if (!UUID_RE.test(orderId)) {
    return json({ ok: false, error: 'EDUCATION_LIFECYCLE_ORDER_INVALID' }, 400);
  }
  if (action !== 'cancel' && action !== 'refund') {
    return json({ ok: false, error: 'EDUCATION_LIFECYCLE_ACTION_INVALID' }, 400);
  }
  if (reason.length < 3 || reason.length > 2000 || CONTROL_CHAR_RE.test(reason)) {
    return json({ ok: false, error: 'EDUCATION_LIFECYCLE_REASON_INVALID' }, 400);
  }
  if (
    providerReference.length > 240 ||
    (providerReference.length > 0 && CONTROL_CHAR_RE.test(providerReference)) ||
    (action === 'refund' && providerReference.length < 1) ||
    (action === 'cancel' && providerReference.length > 0)
  ) {
    return json({ ok: false, error: 'EDUCATION_LIFECYCLE_REFERENCE_INVALID' }, 400);
  }

  const { data, error } = await access.admin.rpc('transition_education_order_lifecycle', {
    p_order_id: orderId,
    p_operator_user_id: access.auth.user.id,
    p_action: action,
    p_reason: reason,
    p_provider_reference: providerReference || null,
  });

  if (error) {
    const known = [
      'EDUCATION_LIFECYCLE_ORDER_REQUIRED',
      'EDUCATION_LIFECYCLE_OPERATOR_REQUIRED',
      'EDUCATION_LIFECYCLE_OPERATOR_FORBIDDEN',
      'EDUCATION_LIFECYCLE_ACTION_INVALID',
      'EDUCATION_LIFECYCLE_REASON_INVALID',
      'EDUCATION_LIFECYCLE_REFERENCE_INVALID',
      'EDUCATION_LIFECYCLE_ORDER_NOT_FOUND',
      'EDUCATION_LIFECYCLE_CANCEL_REFERENCE_FORBIDDEN',
      'EDUCATION_LIFECYCLE_ORDER_NOT_CANCELLABLE',
      'EDUCATION_LIFECYCLE_REFERENCE_REQUIRED',
      'EDUCATION_LIFECYCLE_REFUND_CONFLICT',
      'EDUCATION_LIFECYCLE_ORDER_NOT_REFUNDABLE',
    ];
    const code = known.find((candidate) => error.message.includes(candidate)) ?? 'EDUCATION_LIFECYCLE_FAILED';
    const status = code === 'EDUCATION_LIFECYCLE_ORDER_NOT_FOUND'
      ? 404
      : code === 'EDUCATION_LIFECYCLE_OPERATOR_FORBIDDEN' || code === 'EDUCATION_LIFECYCLE_CROSS_SITE_FORBIDDEN'
        ? 403
        : code === 'EDUCATION_LIFECYCLE_ORDER_NOT_CANCELLABLE' ||
            code === 'EDUCATION_LIFECYCLE_REFUND_CONFLICT' ||
            code === 'EDUCATION_LIFECYCLE_ORDER_NOT_REFUNDABLE'
          ? 409
          : code === 'EDUCATION_LIFECYCLE_FAILED'
            ? 503
            : 400;
    return json({ ok: false, error: code }, status);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return json({ ok: false, error: 'EDUCATION_LIFECYCLE_RESPONSE_INVALID' }, 503);
  }

  return json({ ok: true, ...data });
}