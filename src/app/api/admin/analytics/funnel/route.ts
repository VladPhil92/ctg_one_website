import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { logger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const daysParam = request.nextUrl.searchParams.get('days') ?? '30';
  const days = Number.parseInt(daysParam, 10);
  if (!Number.isInteger(days) || days < 1 || days > 365 || String(days) !== daysParam) {
    return NextResponse.json({ error: 'Invalid analytics window' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const [{ data: profile }, { data: investmentProfile }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('investment_participant_profiles').select('investment_role').eq('user_id', user.id).maybeSingle(),
  ]);

  if (profile?.role !== 'admin' || investmentProfile?.investment_role !== 'SUPER_ADMIN') {
    logger.warn('acquisition_funnel_access_denied', { userId: user.id });
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { data, error } = await supabase.rpc('get_acquisition_funnel_snapshot', {
    p_days: days,
  });

  if (error) {
    logger.error('acquisition_funnel_snapshot_failed', {
      userId: user.id,
      error: { code: error.code, message: error.message },
    });
    return NextResponse.json({ error: 'No fue posible calcular el embudo.' }, { status: 500 });
  }

  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
