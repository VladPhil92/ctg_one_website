import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuthenticatedRequestContext } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const decisionSchema = z.object({ action: z.enum(['accept', 'decline']) }).strict();

function json(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  const context = await createAuthenticatedRequestContext(request);
  if (!context) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);
  if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ ok: false, error: 'CROSS_SITE_FORBIDDEN' }, 403);

  const { quoteId } = await params;
  if (!UUID_RE.test(quoteId)) return json({ ok: false, error: 'EDUCATION_QUOTE_ID_INVALID' }, 400);

  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') return json({ ok: false, error: 'CONTENT_TYPE_INVALID' }, 415);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'BODY_INVALID' }, 400);
  }

  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, error: 'DECISION_INVALID' }, 400);

  const rpcName = parsed.data.action === 'accept'
    ? 'accept_education_service_quote'
    : 'decline_education_service_quote';

  const { data, error } = await context.supabase.rpc(rpcName, { p_quote_id: quoteId });
  if (error) {
    const known = [
      'EDUCATION_QUOTE_UNAUTHENTICATED',
      'EDUCATION_QUOTE_ID_REQUIRED',
      'EDUCATION_QUOTE_NOT_FOUND',
      'EDUCATION_QUOTE_NOT_ACTIONABLE',
      'EDUCATION_QUOTE_EXPIRED',
    ];
    const code = known.find((candidate) => error.message.includes(candidate)) ?? 'EDUCATION_QUOTE_DECISION_FAILED';
    const status = code === 'EDUCATION_QUOTE_NOT_FOUND' ? 404
      : code === 'EDUCATION_QUOTE_NOT_ACTIONABLE' || code === 'EDUCATION_QUOTE_EXPIRED' ? 409
        : code === 'EDUCATION_QUOTE_DECISION_FAILED' ? 503 : 400;
    return json({ ok: false, error: code }, status);
  }

  return json({ ok: true, decision: data });
}
