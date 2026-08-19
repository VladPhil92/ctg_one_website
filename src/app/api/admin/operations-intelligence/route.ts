import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { logger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
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
    logger.warn('operations_intelligence_access_denied', { userId: user.id });
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { data, error } = await supabase.rpc('get_operations_intelligence_snapshot');
  if (error) {
    logger.error('operations_intelligence_snapshot_failed', {
      userId: user.id,
      error: { code: error.code, message: error.message },
    });
    return NextResponse.json({ error: 'No fue posible construir el snapshot operativo.' }, { status: 500 });
  }

  logger.info('operations_intelligence_snapshot_checked', { userId: user.id });
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
