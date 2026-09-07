import { NextResponse } from 'next/server';
import { createAuthenticatedRequestContext } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function json(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

export async function GET(request: Request) {
  const context = await createAuthenticatedRequestContext(request);
  if (!context) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);

  const [requestsResult, quotesResult, sessionsResult] = await Promise.all([
    context.supabase
      .from('education_advisory_requests')
      .select('id,request_kind,institution_name,service_area,message,status,created_at,updated_at')
      .eq('user_id', context.user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    context.supabase
      .from('education_service_quotes')
      .select('id,request_id,version,title,scope_summary,status,currency,total_amount,valid_until,sent_at,accepted_at,declined_at,created_at,updated_at')
      .eq('user_id', context.user.id)
      .neq('status', 'draft')
      .order('updated_at', { ascending: false })
      .limit(50),
    context.supabase
      .from('education_sessions')
      .select('id,request_id,quote_id,offering_id,session_type,title,status,modality,starts_at,ends_at,timezone,meeting_url,location_label,participant_note,created_at,updated_at')
      .eq('user_id', context.user.id)
      .order('starts_at', { ascending: true })
      .limit(100),
  ]);

  if (requestsResult.error || quotesResult.error || sessionsResult.error) {
    return json({ ok: false, error: 'EDUCATION_SERVICES_UNAVAILABLE' }, 503);
  }

  return json({
    ok: true,
    requests: requestsResult.data ?? [],
    quotes: quotesResult.data ?? [],
    sessions: sessionsResult.data ?? [],
  });
}
