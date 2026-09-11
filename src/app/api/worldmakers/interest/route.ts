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

function isAllowedOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'https:' && hostname !== 'localhost' && hostname !== '127.0.0.1') return false;
    return [
      'worldmakers.ctgone.com',
      'www.worldmakers.ctgone.com',
      'ctgone.com',
      'www.ctgone.com',
      'localhost',
      '127.0.0.1',
    ].includes(hostname);
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

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ accepted: false, error: 'Origen no permitido.' }, { status: 403 });
  }

  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ accepted: false, error: 'Registro temporalmente no disponible.' }, { status: 503 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ accepted: false, error: 'Solicitud demasiado grande.' }, { status: 413 });
  }

  if (isRateLimited(request)) {
    return NextResponse.json({ accepted: false, error: 'Demasiados intentos. Intenta nuevamente más tarde.' }, { status: 429 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ accepted: false, error: 'Solicitud inválida.' }, { status: 400 });
  }

  const parsed = intakeSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ accepted: false, error: 'Revisa los datos del formulario.' }, { status: 400 });
  }

  const body = parsed.data;

  // Honeypot: bots commonly fill hidden website fields. Return a neutral success
  // without persisting anything so the endpoint does not become an oracle.
  if (body.website?.trim()) {
    return NextResponse.json({ accepted: true, state: 'registered' }, { status: 202 });
  }

  if (!isWorldMakersSourcePath(body.sourcePath)) {
    return NextResponse.json({ accepted: false, error: 'Fuente inválida.' }, { status: 400 });
  }

  const email = normalizeWorldMakersEmail(body.email);
  const now = new Date().toISOString();
  const admin = createAdminClient();

  const { data: existing, error: lookupError } = await admin
    .from('worldmakers_interest_profiles')
    .select('id,status,submission_count')
    .eq('email', email)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ accepted: false, error: 'No fue posible procesar el registro.' }, { status: 503 });
  }

  const common = {
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
    last_registered_at: now,
  };

  if (existing) {
    const status = existing.status === 'withdrawn' ? 'registered' : existing.status;
    const { error } = await admin
      .from('worldmakers_interest_profiles')
      .update({
        ...common,
        status,
        withdrawn_at: status === 'registered' ? null : undefined,
        submission_count: Math.max(1, Number(existing.submission_count) || 1) + 1,
      })
      .eq('id', existing.id);

    if (error) {
      return NextResponse.json({ accepted: false, error: 'No fue posible actualizar el registro.' }, { status: 503 });
    }

    return NextResponse.json({ accepted: true, state: 'updated' }, {
      status: 202,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const { error } = await admin.from('worldmakers_interest_profiles').insert({
    ...common,
    first_registered_at: now,
    status: 'registered',
    submission_count: 1,
  });

  if (error) {
    return NextResponse.json({ accepted: false, error: 'No fue posible completar el registro.' }, { status: 503 });
  }

  return NextResponse.json({ accepted: true, state: 'registered' }, {
    status: 201,
    headers: { 'Cache-Control': 'no-store' },
  });
}
