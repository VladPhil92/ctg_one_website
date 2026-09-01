import { NextResponse } from 'next/server';
import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';

const MAX_BODY_BYTES = 2048;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type CheckoutPayload = {
  slug?: unknown;
  requestKey?: unknown;
};

function json(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

function rpcStatus(message: string) {
  if (message.includes('EDUCATION_ALREADY_ENTITLED')) return 409;
  if (message.includes('EDUCATION_CHECKOUT_IDEMPOTENCY_CONFLICT')) return 409;
  if (message.includes('EDUCATION_OFFERING_UNAVAILABLE')) return 404;
  if (message.includes('EDUCATION_PRICE_UNAVAILABLE')) return 409;
  if (message.includes('EDUCATION_CHECKOUT_NOT_REQUIRED')) return 409;
  if (message.includes('EDUCATION_')) return 400;
  return 503;
}

function publicCode(message: string) {
  const known = [
    'EDUCATION_ALREADY_ENTITLED',
    'EDUCATION_CHECKOUT_IDEMPOTENCY_CONFLICT',
    'EDUCATION_OFFERING_UNAVAILABLE',
    'EDUCATION_PRICE_UNAVAILABLE',
    'EDUCATION_CHECKOUT_NOT_REQUIRED',
    'EDUCATION_OFFERING_SLUG_INVALID',
    'EDUCATION_REQUEST_KEY_INVALID',
  ];
  return known.find((code) => message.includes(code)) ?? 'EDUCATION_CHECKOUT_FAILED';
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ ok: false, error: 'EDUCATION_CHECKOUT_UNAVAILABLE' }, 503);
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) {
    return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
  }

  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    return json({ ok: false, error: 'EDUCATION_CHECKOUT_CONTENT_TYPE_INVALID' }, 415);
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ ok: false, error: 'EDUCATION_CHECKOUT_BODY_TOO_LARGE' }, 413);
  }

  let body: CheckoutPayload;
  try {
    body = (await request.json()) as CheckoutPayload;
  } catch {
    return json({ ok: false, error: 'EDUCATION_CHECKOUT_BODY_INVALID' }, 400);
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  const requestKey = typeof body.requestKey === 'string' ? body.requestKey.trim() : '';

  if (!SLUG_RE.test(slug) || slug.length > 100) {
    return json({ ok: false, error: 'EDUCATION_OFFERING_SLUG_INVALID' }, 400);
  }

  if (requestKey.length < 16 || requestKey.length > 128) {
    return json({ ok: false, error: 'EDUCATION_REQUEST_KEY_INVALID' }, 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('create_education_order', {
    p_user_id: auth.user.id,
    p_offering_slug: slug,
    p_request_key: requestKey,
  });

  if (error) {
    return json(
      { ok: false, error: publicCode(error.message) },
      rpcStatus(error.message),
    );
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return json({ ok: false, error: 'EDUCATION_CHECKOUT_RESPONSE_INVALID' }, 503);
  }

  return json({ ok: true, ...data }, (data as { replayed?: boolean }).replayed ? 200 : 201);
}
