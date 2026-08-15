import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const bodySchema = z.object({ notes: z.string().trim().max(2000).optional() });

// Calls approve_deposit() using the admin's own session-bound client
// (never the service-role key) — the RPC itself re-verifies is_admin()
// via auth.uid() and does the balance credit atomically. This route is a
// fast-fail/UX layer, not the real authorization boundary.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const { error } = await supabase.rpc('approve_deposit', {
    p_transaction_id: params.id,
    p_admin_notes: parsed.data.notes ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
