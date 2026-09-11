import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  WORLDMAKERS_AUDIENCES,
  WORLDMAKERS_INTEREST_STATUSES,
  isWorldMakersAudience,
  isWorldMakersInterestStatus,
} from '@/lib/worldmakers/community';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(WORLDMAKERS_INTEREST_STATUSES),
  adminNotes: z.string().trim().max(1200).nullable().optional(),
});

async function requireSuperAdmin() {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const [{ data: profile }, { data: investmentProfile }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('investment_participant_profiles').select('investment_role').eq('user_id', user.id).maybeSingle(),
  ]);

  if (profile?.role !== 'admin' || investmentProfile?.investment_role !== 'SUPER_ADMIN') return null;
  return user;
}

export async function GET(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const statusParam = request.nextUrl.searchParams.get('status');
  const audienceParam = request.nextUrl.searchParams.get('audience');
  if (statusParam && !isWorldMakersInterestStatus(statusParam)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }
  if (audienceParam && !isWorldMakersAudience(audienceParam)) {
    return NextResponse.json({ error: 'Audiencia inválida' }, { status: 400 });
  }

  const admin = createAdminClient();
  let query = admin
    .from('worldmakers_interest_profiles')
    .select('id,email,display_name,audience,wants_product_updates,wants_playtesting,wants_educator_pilot,wants_family_research,source_path,status,admin_notes,submission_count,first_registered_at,last_registered_at,shortlisted_at,ready_to_invite_at,contacted_at,withdrawn_at,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(150);

  if (statusParam && isWorldMakersInterestStatus(statusParam)) query = query.eq('status', statusParam);
  if (audienceParam && isWorldMakersAudience(audienceParam)) query = query.eq('audience', audienceParam);

  const statusCountsPromise = Promise.all(
    WORLDMAKERS_INTEREST_STATUSES.map(async (status) => {
      const { count, error } = await admin
        .from('worldmakers_interest_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('status', status);
      return { status, count: error ? 0 : count ?? 0 };
    }),
  );

  const audienceCountsPromise = Promise.all(
    WORLDMAKERS_AUDIENCES.map(async (audience) => {
      const { count, error } = await admin
        .from('worldmakers_interest_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('audience', audience);
      return { audience, count: error ? 0 : count ?? 0 };
    }),
  );

  const [{ data: rows, error }, statusCounts, audienceCounts] = await Promise.all([
    query,
    statusCountsPromise,
    audienceCountsPromise,
  ]);

  if (error) {
    return NextResponse.json({ error: 'No fue posible cargar la comunidad.' }, { status: 500 });
  }

  return NextResponse.json({
    rows: rows ?? [],
    statusCounts,
    audienceCounts,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: NextRequest) {
  const user = await requireSuperAdmin();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

  const { id, status, adminNotes } = parsed.data;
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    status,
    last_status_changed_at: now,
    last_status_changed_by: user.id,
  };
  if (adminNotes !== undefined) update.admin_notes = adminNotes || null;
  if (status === 'shortlisted') update.shortlisted_at = now;
  if (status === 'ready_to_invite') update.ready_to_invite_at = now;
  if (status === 'contacted') update.contacted_at = now;
  if (status === 'withdrawn') update.withdrawn_at = now;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('worldmakers_interest_profiles')
    .update(update)
    .eq('id', id)
    .select('id,status,admin_notes,updated_at')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'No fue posible actualizar el perfil.' }, { status: 500 });
  }

  return NextResponse.json({ updated: data }, { headers: { 'Cache-Control': 'no-store' } });
}
