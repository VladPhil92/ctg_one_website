import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const bodySchema = z.object({ notes: z.string().trim().max(2000).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_admin');
  if (adminCheckError || isAdmin !== true) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.rpc('approve_kyc_server', {
    p_actor_user_id: user.id,
    p_submission_id: id,
    p_admin_notes: parsed.data.notes ?? null,
  });
  if (error) return NextResponse.json({ error: 'No fue posible aprobar la verificación' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
