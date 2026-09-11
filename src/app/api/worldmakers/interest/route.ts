import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  WORLDMAKERS_AUDIENCES,
  WORLDMAKERS_CONSENT_VERSION,
  isWorldMakersSourcePath,
  normalizeWorldMakersEmail,
} from '@/lib/worldmakers/community';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 6 * 1024;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 8;
const buckets = new Map<string, { count: number; resetAt: number }>();

const intakeSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional().or(z.literal('')),
  email: z.string().trim().email().max(254),
  audience: z.enum(WORLDMAKERS_AUDIENCES),
  wantsProductUpdates: z.boolean(),
  wantsPlaytesting: z.boolean(),
  wantsEducatorPilot: z.boolean(),
  wantsFamilyResearch: z.boolean(),
  adultConfirmed: z.literal(true),
  privacyConsent: z.literal(true),
  sourcePath: z.string().max(120),
  website: z.string().max(200).optional(),
}).refine(
  (value) => value.wantsProductUpdates || value.wantsPlaytesting || value.wantsEducatorPilot || value.wantsFamilyResearch,
  { message: 'Selecciona al menos un tipo de interés.' },
);

function normalizeHostname(value: string | null) {
  return value?.split(':')[0]?.trim().toLowerCase() ?? '';
}

function isAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    const normalizedOriginHost = hostname.toLowerCase();
    const requestHost = normalizeHostname(request.headers.get('host'));
    const isLocalhost = normalizedOriginHost === 'localhost' || normalizedOriginHost === '127.0.0.1';

    if (protocol !== 'https:' && !isLocalhost) return false;

    // Allow any same-origin deployment host (including ephemeral Render previews)
    // while keeping cross-origin submissions constrained to canonical CTG hosts.
    if (requestHost && normalizedOriginHost === requestHost) return true;

    return [
      'worldmakers.ctgone.com',
      'www.worldmakers.ctgone.com',
      'ctgone.com',
      'www.ctgone.com',
      'localhost',
      '127.0.0.1',
    ].includes(normalizedOriginHost);
  } catch {
    return false;
  }
}

function rateLimitKey(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const raw = forwarded || request.headers.get('x-real-ip')?.trim();
  if (!raw) return null;
  return createHash('sha256').update(raw).digest('hex');
}

function isRateLimited(request: NextRequest) {
  const key = rateLimitKey(request);
  if (!key) return false;

  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  if (current.count > RATE_LIMIT_MAX_REQUESTS) return true;

  if (buckets.size > 1000) {
    for (const [candidate, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(candidate);
    }
  }
  return false;
}

async function readJsonWithByteLimit(request: NextRequest): Promise<
  | { ok: true; value: unknown }
  | { ok: false; tooLarge: boolean }
> {
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return { ok: false, tooLarge: true };
    }
  }

  const reader = request.body?.getReader();
  if (!reader) return { ok: false, tooLarge: false };

  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return { ok: false, tooLarge: true };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, tooLarge: false };
  }
}

function acceptedResponse() {
  // Keep first-time and duplicate submissions indistinguishable so the endpoint
  // cannot be used to enumerate registered email addresses.
  return NextResponse.json({ accepted: true, state: 'received' }, {
    status: 202,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ accepted: false, error: 'Origen no permitido.' }, { status: 403 });
  }

  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ accepted: false, error: 'Registro temporalmente no disponible.' }, { status: 503 });
  }

  if (isRateLimited(request)) {
    return NextResponse.json({ accepted: false, error: 'Demasiados intentos. Intenta nuevamente más tarde.' }, { status: 429 });
  }

  const rawBody = await readJsonWithByteLimit(request);
  if (!rawBody.ok) {
    return NextResponse.json(
      { accepted: false, error: rawBody.tooLarge ? 'Solicitud demasiado grande.' : 'Solicitud inválida.' },
      { status: rawBody.tooLarge ? 413 : 400 },
    );
  }

  const parsed = intakeSchema.safeParse(rawBody.value);
  if (!parsed.success) {
    return NextResponse.json({ accepted: false, error: 'Revisa los datos del formulario.' }, { status: 400 });
  }

  const body = parsed.data;

  // Honeypot: bots commonly fill hidden website fields. Return the same neutral
  // success as a legitimate submission without persisting anything.
  if (body.website?.trim()) return acceptedResponse();

  if (!isWorldMakersSourcePath(body.sourcePath)) {
    return NextResponse.json({ accepted: false, error: 'Fuente inválida.' }, { status: 400 });
  }

  const email = normalizeWorldMakersEmail(body.email);
  const now = new Date().toISOString();
  const admin = createAdminClient();

  const { error } = await admin.from('worldmakers_interest_profiles').insert({
    email,
    display_name: body.displayName?.trim() || null,
    audience: body.audience,
    wants_product_updates: body.wantsProductUpdates,
    wants_playtesting: body.wantsPlaytesting,
    wants_educator_pilot: body.wantsEducatorPilot,
    wants_family_research: body.wantsFamilyResearch,
    source_path: body.sourcePath,
    consent_version: WORLDMAKERS_CONSENT_VERSION,
    privacy_consent_at: now,
    adult_attested_at: now,
    first_registered_at: now,
    last_registered_at: now,
    status: 'registered',
    submission_count: 1,
  });

  if (error && error.code !== '23505') {
    return NextResponse.json({ accepted: false, error: 'No fue posible completar el registro.' }, { status: 503 });
  }

  // A duplicate email is intentionally a no-op. Updating an existing or withdrawn
  // profile requires a future ownership-verification flow; knowing an address is
  // not sufficient authority to alter its preferences or revive its status.
  return acceptedResponse();
}
