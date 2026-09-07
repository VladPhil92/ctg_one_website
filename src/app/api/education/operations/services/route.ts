import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const quoteSchema = z.object({
  action: z.literal('create_quote'),
  requestId: z.string().regex(UUID_RE),
  title: z.string().trim().min(2).max(180),
  scopeSummary: z.string().trim().min(20).max(6000),
  totalAmount: z.number().int().min(0).max(2_000_000_000),
  currency: z.string().regex(/^[A-Z]{3}$/).default('COP'),
  validUntil: z.string().datetime({ offset: true }).nullable().optional(),
}).strict();

const sessionSchema = z.object({
  action: z.literal('schedule_session'),
  requestId: z.string().regex(UUID_RE),
  quoteId: z.string().regex(UUID_RE).nullable().optional(),
  title: z.string().trim().min(2).max(180),
  sessionType: z.enum(['diagnostic', 'tutoring', 'class', 'advisory', 'project', 'conference', 'other']),
  modality: z.enum(['virtual', 'in_person', 'hybrid']),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  timezone: z.string().trim().min(3).max(80).default('America/Bogota'),
  meetingUrl: z.union([z.string().url().max(2000), z.literal('')]).optional(),
  locationLabel: z.union([z.string().trim().min(2).max(500), z.literal('')]).optional(),
  participantNote: z.string().max(2000).optional(),
}).strict();

const payloadSchema = z.discriminatedUnion('action', [quoteSchema, sessionSchema]);

function json(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

async function authorizeAdmin(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { response: json({ ok: false, error: 'EDUCATION_OPERATIONS_UNAVAILABLE' }, 503) } as const;
  }
  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) return { response: json({ ok: false, error: 'UNAUTHENTICATED' }, 401) } as const;

  const { data: isAdmin, error } = await auth.supabase.rpc('is_admin');
  if (error) return { response: json({ ok: false, error: 'AUTHORIZATION_UNAVAILABLE' }, 503) } as const;
  if (isAdmin !== true) return { response: json({ ok: false, error: 'FORBIDDEN' }, 403) } as const;

  return { auth, admin: createAdminClient() } as const;
}

export async function GET(request: Request) {
  const access = await authorizeAdmin(request);
  if ('response' in access) return access.response;

  const [requestsResult, quotesResult, sessionsResult] = await Promise.all([
    access.admin.from('education_advisory_requests')
      .select('id,user_id,request_kind,institution_name,contact_name,contact_email,contact_phone,service_area,message,status,created_at,updated_at')
      .order('updated_at', { ascending: false }).limit(100),
    access.admin.from('education_service_quotes')
      .select('id,request_id,user_id,version,title,scope_summary,status,currency,total_amount,valid_until,sent_at,accepted_at,declined_at,created_at,updated_at')
      .order('updated_at', { ascending: false }).limit(100),
    access.admin.from('education_sessions')
      .select('id,user_id,request_id,quote_id,session_type,title,status,modality,starts_at,ends_at,timezone,meeting_url,location_label,participant_note,created_at,updated_at')
      .order('starts_at', { ascending: true }).limit(100),
  ]);

  if (requestsResult.error || quotesResult.error || sessionsResult.error) {
    return json({ ok: false, error: 'EDUCATION_SERVICE_OPERATIONS_UNAVAILABLE' }, 503);
  }

  return json({
    ok: true,
    requests: requestsResult.data ?? [],
    quotes: quotesResult.data ?? [],
    sessions: sessionsResult.data ?? [],
  });
}

export async function POST(request: Request) {
  const access = await authorizeAdmin(request);
  if ('response' in access) return access.response;
  if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ ok: false, error: 'CROSS_SITE_FORBIDDEN' }, 403);

  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') return json({ ok: false, error: 'CONTENT_TYPE_INVALID' }, 415);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'BODY_INVALID' }, 400);
  }
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, error: 'PAYLOAD_INVALID' }, 400);

  const { data: serviceRequest, error: requestError } = await access.admin
    .from('education_advisory_requests')
    .select('id,user_id,status')
    .eq('id', parsed.data.requestId)
    .maybeSingle();
  if (requestError) return json({ ok: false, error: 'REQUEST_LOOKUP_FAILED' }, 503);
  if (!serviceRequest) return json({ ok: false, error: 'REQUEST_NOT_FOUND' }, 404);

  if (parsed.data.action === 'create_quote') {
    const { data: latestQuote, error: latestError } = await access.admin
      .from('education_service_quotes')
      .select('version')
      .eq('request_id', serviceRequest.id)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) return json({ ok: false, error: 'QUOTE_VERSION_LOOKUP_FAILED' }, 503);

    const now = new Date().toISOString();
    const { data: quote, error } = await access.admin
      .from('education_service_quotes')
      .insert({
        request_id: serviceRequest.id,
        user_id: serviceRequest.user_id,
        version: (latestQuote?.version ?? 0) + 1,
        title: parsed.data.title,
        scope_summary: parsed.data.scopeSummary,
        status: 'sent',
        currency: parsed.data.currency,
        total_amount: parsed.data.totalAmount,
        valid_until: parsed.data.validUntil ?? null,
        sent_at: now,
        created_by: access.auth.user.id,
        updated_at: now,
      })
      .select('id,request_id,user_id,version,title,status,currency,total_amount,valid_until,sent_at')
      .single();
    if (error || !quote) return json({ ok: false, error: 'QUOTE_CREATE_FAILED' }, 503);

    await access.admin.from('education_advisory_requests')
      .update({ status: 'proposal', updated_at: now })
      .eq('id', serviceRequest.id);

    return json({ ok: true, quote }, 201);
  }

  if (Date.parse(parsed.data.endsAt) <= Date.parse(parsed.data.startsAt)) {
    return json({ ok: false, error: 'SESSION_WINDOW_INVALID' }, 400);
  }

  if (parsed.data.quoteId) {
    const { data: quote, error } = await access.admin
      .from('education_service_quotes')
      .select('id,request_id,user_id,status')
      .eq('id', parsed.data.quoteId)
      .maybeSingle();
    if (error) return json({ ok: false, error: 'QUOTE_LOOKUP_FAILED' }, 503);
    if (!quote || quote.request_id !== serviceRequest.id || quote.user_id !== serviceRequest.user_id) {
      return json({ ok: false, error: 'QUOTE_REQUEST_MISMATCH' }, 409);
    }
    if (quote.status !== 'accepted') return json({ ok: false, error: 'QUOTE_NOT_ACCEPTED' }, 409);
  }

  const now = new Date().toISOString();
  const { data: session, error: sessionError } = await access.admin
    .from('education_sessions')
    .insert({
      user_id: serviceRequest.user_id,
      request_id: serviceRequest.id,
      quote_id: parsed.data.quoteId ?? null,
      session_type: parsed.data.sessionType,
      title: parsed.data.title,
      status: 'scheduled',
      modality: parsed.data.modality,
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      timezone: parsed.data.timezone,
      meeting_url: parsed.data.meetingUrl || null,
      location_label: parsed.data.locationLabel || null,
      participant_note: parsed.data.participantNote?.trim() || null,
      created_by: access.auth.user.id,
      updated_at: now,
    })
    .select('id,user_id,request_id,quote_id,session_type,title,status,modality,starts_at,ends_at,timezone,meeting_url,location_label')
    .single();
  if (sessionError || !session) return json({ ok: false, error: 'SESSION_CREATE_FAILED' }, 503);

  await access.admin.from('education_advisory_requests')
    .update({ status: 'scheduled', updated_at: now })
    .eq('id', serviceRequest.id);

  return json({ ok: true, session }, 201);
}
