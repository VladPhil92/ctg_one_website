import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';

const bodySchema = z.object({ reason: z.string().trim().min(1, 'Motivo requerido').max(2000) });

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
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Solicitud inválida' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.rpc('reject_kyc_server', {
    p_actor_user_id: user.id,
    p_submission_id: id,
    p_reason: parsed.data.reason,
  });
  if (error) return NextResponse.json({ error: 'No fue posible rechazar la verificación' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
