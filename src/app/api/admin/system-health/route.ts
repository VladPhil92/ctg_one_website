import { NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { collectSystemHealth } from '@/lib/observability/health';
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
    logger.warn('system_health_access_denied', { userId: user.id });
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const snapshot = await collectSystemHealth(supabase, user.id);
    logger.info('system_health_checked', {
      userId: user.id,
      status: snapshot.status,
      summary: snapshot.summary,
    });
    return NextResponse.json(snapshot, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    logger.error('system_health_failed', {
      userId: user.id,
      error: error instanceof Error ? { name: error.name, message: error.message } : String(error),
    });
    return NextResponse.json({ error: 'No fue posible completar el diagnóstico.' }, { status: 500 });
  }
}
