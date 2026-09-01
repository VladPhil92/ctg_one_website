import { createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 4096;
const EVENT_SLUG = 'filosofia-o-dinero' as const;
const RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const NETWORK_RATE_LIMIT_ATTEMPTS = 8;
const GLOBAL_RATE_LIMIT_ATTEMPTS = 150;

const registrationSchema = z.object({
  eventSlug: z.literal(EVENT_SLUG),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().max(254).email().transform((value) => value.toLowerCase()),
  phone: z.union([z.string().trim().min(7).max(32), z.literal('')]).optional(),
  consent: z.literal(true),
  website: z.string().max(200).optional(),
}).strict();

function json(body: Record<string, unknown>, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function rateLimitedResponse() {
  const response = json({ ok: false }, 429);
  response.headers.set('Retry-After', String(RATE_LIMIT_WINDOW_SECONDS));
  return response;
}

function hmacKey(secret: string, value: string) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function networkIdentity(request: NextRequest) {
  const cf = request.headers.get('cf-connecting-ip')?.trim() ?? '';
  const real = request.headers.get('x-real-ip')?.trim() ?? '';
  const forwarded = request.headers.get('x-forwarded-for')?.trim() ?? '';

  // Keep the whole proxy-provided tuple inside a server-only HMAC. No raw
  // network address is persisted, while a stable trusted header still keeps
  // spoofable additions from becoming the only throttle dimension.
  return [cf, real, forwarded].filter(Boolean).join('|') || 'unknown-network';
}

async function readBoundedBody(request: NextRequest): Promise<string | null> {
  if (!request.body) return null;

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        return null;
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isSupabaseConfigured || !serviceRoleKey) {
    return json({ ok: false }, 503);
  }

  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ ok: false }, 403);
  }

  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) {
    return json({ ok: false }, 415);
  }

  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    if (!/^\d+$/.test(contentLengthHeader)) return json({ ok: false }, 400);
    const contentLength = Number(contentLengthHeader);
    if (!Number.isSafeInteger(contentLength) || contentLength <= 0) return json({ ok: false }, 400);
    if (contentLength > MAX_BODY_BYTES) return json({ ok: false }, 413);
  }

  const admin = createAdminClient();
  const networkKey = hmacKey(
    serviceRoleKey,
    `jp-talks-registration:network:${networkIdentity(request)}`,
  );
  const globalKey = hmacKey(serviceRoleKey, 'jp-talks-registration:global:v1');

  const [networkLimit, globalLimit] = await Promise.all([
    admin.rpc('consume_jp_registration_rate_limit', {
      p_key_hash: networkKey,
      p_limit: NETWORK_RATE_LIMIT_ATTEMPTS,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    }),
    admin.rpc('consume_jp_registration_rate_limit', {
      p_key_hash: globalKey,
      p_limit: GLOBAL_RATE_LIMIT_ATTEMPTS,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    }),
  ]);

  if (networkLimit.error || globalLimit.error) {
    return json({ ok: false }, 503);
  }
  if (networkLimit.data !== true || globalLimit.data !== true) {
    return rateLimitedResponse();
  }

  let rawBody: string | null;
  try {
    rawBody = await readBoundedBody(request);
  } catch {
    return json({ ok: false }, 400);
  }
  if (rawBody === null) {
    return json({ ok: false }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ ok: false }, 400);
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false }, 400);
  }

  // Honeypot: automated submissions receive a neutral success response and are discarded.
  if (parsed.data.website?.trim()) {
    return json({ ok: true }, 202);
  }

  const { error } = await admin.from('jp_event_registrations').insert({
    event_slug: EVENT_SLUG,
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone?.trim() || null,
    consent_at: new Date().toISOString(),
    source_path: '/jpvalderrama/talks',
  });

  if (!error) {
    return json({ ok: true }, 201);
  }

  if (error.code === '23505') {
    return json({ ok: true, alreadyRegistered: true }, 200);
  }

  // Do not expose database errors, rate-limit keys, network data or submitted PII.
  return json({ ok: false }, 503);
}
