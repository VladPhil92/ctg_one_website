import { NextResponse } from 'next/server';
import { createAuthenticatedRequestContext } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function json(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function GET(request: Request) {
  const context = await createAuthenticatedRequestContext(request);
  if (!context) {
    return json({ ok: false }, 401);
  }

  const [entitlementsResult, ordersResult, advisoryResult] = await Promise.all([
    context.supabase
      .from('education_entitlements')
      .select(`
        id,
        status,
        source_type,
        starts_at,
        ends_at,
        granted_at,
        offering:education_offerings (
          id,
          slug,
          title,
          offering_type,
          summary,
          access_path,
          metadata
        )
      `)
      .eq('user_id', context.user.id)
      .order('granted_at', { ascending: false }),
    context.supabase
      .from('education_orders')
      .select('id, status, currency, total_amount, payment_provider, provider_reference, verified_at, created_at')
      .eq('user_id', context.user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    context.supabase
      .from('education_advisory_requests')
      .select('id, institution_name, service_area, status, created_at, updated_at')
      .eq('user_id', context.user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  if (entitlementsResult.error || ordersResult.error || advisoryResult.error) {
    return json({ ok: false }, 503);
  }

  return json({
    ok: true,
    userId: context.user.id,
    transport: context.transport,
    entitlements: entitlementsResult.data ?? [],
    orders: ordersResult.data ?? [],
    advisoryRequests: advisoryResult.data ?? [],
  });
}
