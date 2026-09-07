import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuthenticatedRequestContext } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 8192;

const advisorySchema = z.object({
  requestKind: z.enum(['institution', 'family', 'individual', 'project']).optional().default('institution'),
  institutionName: z.string().trim().min(2).max(180),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().max(254).email().transform((value) => value.toLowerCase()),
  contactPhone: z.union([z.string().trim().min(7).max(32), z.literal('')]).optional(),
  serviceArea: z.string().trim().min(2).max(120),
  message: z.string().trim().min(20).max(4000),
}).strict();

function json(body: Record<string, unknown>, status: number) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

export async function POST(request: Request) {
  const context = await createAuthenticatedRequestContext(request);
  if (!context) return json({ ok: false }, 401);

  if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ ok: false }, 403);

  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) return json({ ok: false }, 415);

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return json({ ok: false }, 413);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false }, 400);
  }

  const parsed = advisorySchema.safeParse(body);
  if (!parsed.success) return json({ ok: false }, 400);

  const { data, error } = await context.supabase
    .from('education_advisory_requests')
    .insert({
      user_id: context.user.id,
      request_kind: parsed.data.requestKind,
      institution_name: parsed.data.institutionName,
      contact_name: parsed.data.contactName,
      contact_email: parsed.data.contactEmail,
      contact_phone: parsed.data.contactPhone?.trim() || null,
      service_area: parsed.data.serviceArea,
      message: parsed.data.message,
    })
    .select('id, request_kind, status, created_at')
    .single();

  if (error || !data) return json({ ok: false }, 503);

  return json({ ok: true, request: data }, 201);
}
