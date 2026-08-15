import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type { LotStatus } from '@/types/investment';

// Real authorization + the legal-transition allow-list both live in
// transition_lot_status() itself — this handler only validates the
// request shape before calling it.
const transitionSchema = z.object({
  newStatus: z.string().trim().min(1) as z.ZodType<LotStatus>,
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'not available' }, { status: 503 });
  }

  const parsed = transitionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid request' }, { status: 422 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('transition_lot_status', {
    p_lot_id: params.id,
    p_new_status: parsed.data.newStatus,
    p_notes: parsed.data.notes ?? null,
  });

  if (error) {
    const status = error.message.includes('not authorized') ? 403 : 409;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ ok: true });
}
