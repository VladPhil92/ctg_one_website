import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

// Real authorization (auth.uid() required) and the available-balance check
// both live in request_withdrawal() itself — this handler only validates
// the request shape before calling it. The request enters a REQUESTED
// queue and moves no money until an admin approves and marks it paid
// (approve_withdrawal()/mark_withdrawal_paid()) — not built as a route yet.
const requestWithdrawalSchema = z.object({
  amountCents: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'not available' }, { status: 503 });
  }

  const parsed = requestWithdrawalSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'invalid request' }, { status: 422 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('request_withdrawal', {
    p_amount_cents: parsed.data.amountCents,
  });

  if (error) {
    const status = error.message.includes('not authenticated') ? 401 : 422;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ requestId: data });
}
