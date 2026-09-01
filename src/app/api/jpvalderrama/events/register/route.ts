import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 4096;
const EVENT_SLUG = 'filosofia-o-dinero' as const;

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

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ ok: false }, 503);
  }

  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ ok: false }, 403);
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ ok: false }, 413);
  }

  let body: unknown;
  try {
    body = await request.json();
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

  const admin = createAdminClient();
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

  // Do not expose database errors or submitted PII to the client or logs.
  return json({ ok: false }, 503);
}
