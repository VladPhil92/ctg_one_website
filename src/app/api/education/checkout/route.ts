import { NextResponse } from 'next/server';
import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import { buildWompiCheckoutUrl, getWompiConfig } from '@/lib/education/wompi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 2048;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const WOMPI_PREP_ERRORS = [
  'EDUCATION_WOMPI_ORDER_REQUIRED',
  'EDUCATION_WOMPI_USER_REQUIRED',
  'EDUCATION_WOMPI_ORDER_NOT_FOUND',
  'EDUCATION_WOMPI_ORDER_OWNER_MISMATCH',
  'EDUCATION_WOMPI_ORDER_NOT_PENDING',
  'EDUCATION_WOMPI_CURRENCY_UNSUPPORTED',
  'EDUCATION_WOMPI_PROVIDER_CONFLICT',
  'EDUCATION_WOMPI_ORDER_TOTAL_INVALID',
] as const;

type CheckoutPayload = {
  slug?: unknown;
  requestKey?: unknown;
};

type CheckoutOrder = {
  id: string;
  status: string;
  totalAmount: number;
  currency: string;
  offeringSlug: string;
  offeringTitle: string;
};

type WompiPreparedOrder = {
  replayed?: boolean;
  orderId?: string;
  reference?: string;
  totalAmount?: number;
  amountInCents?: number;
  currency?: string;
  status?: string;
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

function wompiPrepareCode(message: string) {
  return WOMPI_PREP_ERRORS.find((code) => message.includes(code)) ?? 'EDUCATION_WOMPI_PREPARE_FAILED';
}

function wompiPrepareStatus(code: string) {
  if (code === 'EDUCATION_WOMPI_ORDER_NOT_FOUND') return 404;
  if (code === 'EDUCATION_WOMPI_ORDER_OWNER_MISMATCH') return 403;
  if (
    code === 'EDUCATION_WOMPI_ORDER_NOT_PENDING' ||
    code === 'EDUCATION_WOMPI_CURRENCY_UNSUPPORTED' ||
    code === 'EDUCATION_WOMPI_PROVIDER_CONFLICT' ||
    code === 'EDUCATION_WOMPI_ORDER_TOTAL_INVALID'
  ) return 409;
  if (code === 'EDUCATION_WOMPI_PREPARE_FAILED') return 503;
  return 400;
}

function paymentRedirectUrl(request: Request) {
  const configured = process.env.WOMPI_REDIRECT_ORIGIN?.trim();
  if (configured) {
    try {
      const origin = new URL(configured);
      if (origin.protocol === 'https:' || origin.hostname === 'localhost' || origin.hostname === '127.0.0.1') {
        return new URL('/jpvalderrama/campus/pago/retorno', origin.origin).toString();
      }
    } catch {
      throw new Error('WOMPI_REDIRECT_ORIGIN_INVALID');
    }
    throw new Error('WOMPI_REDIRECT_ORIGIN_INVALID');
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1' || requestUrl.hostname.endsWith('.vercel.app')) {
    return new URL('/jpvalderrama/campus/pago/retorno', requestUrl.origin).toString();
  }
  return 'https://ctgone.com/jpvalderrama/campus/pago/retorno';
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ ok: false, error: 'EDUCATION_CHECKOUT_UNAVAILABLE' }, 503);
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) {
    return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
  }

  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ ok: false, error: 'CROSS_SITE_FORBIDDEN' }, 403);
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

  const result = data as { replayed?: boolean; order?: CheckoutOrder };
  const order = result.order;
  if (
    !order ||
    typeof order.id !== 'string' ||
    typeof order.totalAmount !== 'number' ||
    !Number.isSafeInteger(order.totalAmount) ||
    order.totalAmount <= 0 ||
    typeof order.currency !== 'string'
  ) {
    return json({ ok: false, error: 'EDUCATION_CHECKOUT_RESPONSE_INVALID' }, 503);
  }

  let wompi;
  try {
    wompi = getWompiConfig();
  } catch {
    return json({ ok: false, error: 'EDUCATION_PAYMENT_PROVIDER_CONFIGURATION_INVALID' }, 503);
  }

  if (!wompi) {
    return json({
      ok: true,
      replayed: Boolean(result.replayed),
      order,
      payment: {
        provider: 'manual_assisted',
        mode: 'assisted',
      },
    }, result.replayed ? 200 : 201);
  }

  const preparedResult = await admin.rpc('prepare_education_wompi_order', {
    p_order_id: order.id,
    p_user_id: auth.user.id,
  });

  if (preparedResult.error) {
    const code = wompiPrepareCode(preparedResult.error.message);
    return json({ ok: false, error: code }, wompiPrepareStatus(code));
  }

  if (!preparedResult.data || typeof preparedResult.data !== 'object' || Array.isArray(preparedResult.data)) {
    return json({ ok: false, error: 'EDUCATION_WOMPI_PREPARE_RESPONSE_INVALID' }, 503);
  }

  const prepared = preparedResult.data as WompiPreparedOrder;
  if (
    prepared.orderId !== order.id ||
    prepared.reference !== order.id ||
    !Number.isSafeInteger(prepared.amountInCents) ||
    (prepared.amountInCents as number) !== order.totalAmount * 100 ||
    prepared.currency !== order.currency
  ) {
    return json({ ok: false, error: 'EDUCATION_WOMPI_PREPARE_RESPONSE_INVALID' }, 503);
  }

  let checkoutUrl: string;
  try {
    checkoutUrl = buildWompiCheckoutUrl(wompi, {
      reference: prepared.reference,
      amountInCents: prepared.amountInCents as number,
      currency: prepared.currency,
      redirectUrl: paymentRedirectUrl(request),
      customerEmail: auth.user.email ?? null,
    });
  } catch {
    return json({ ok: false, error: 'EDUCATION_WOMPI_CHECKOUT_URL_FAILED' }, 503);
  }

  return json({
    ok: true,
    replayed: Boolean(result.replayed),
    order,
    payment: {
      provider: 'wompi',
      mode: wompi.mode,
      checkoutUrl,
      reference: prepared.reference,
      amountInCents: prepared.amountInCents,
      currency: prepared.currency,
    },
  }, result.replayed ? 200 : 201);
}
