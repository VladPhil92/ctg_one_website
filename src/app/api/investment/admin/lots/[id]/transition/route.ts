import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type { LotStatus } from '@/types/investment';

const transitionSchema = z.object({
  newStatus: z.string().trim().min(1) as z.ZodType<LotStatus>,
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: 'not available' }, { status: 503 });
  const { id } = await params;
  const parsed = transitionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid request' }, { status: 422 });

  const supabase = await createClient();
  const { error } = await supabase.rpc('transition_lot_status', {
    p_lot_id: id,
    p_new_status: parsed.data.newStatus,
    p_notes: parsed.data.notes ?? null,
  });

  if (error) {
    const status = error.message.includes('not authorized') ? 403 : 409;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json({ ok: true });
}
