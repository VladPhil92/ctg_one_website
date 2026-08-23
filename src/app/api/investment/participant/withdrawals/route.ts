import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

// Real authorization (auth.uid() required) and the available-balance check
// both live in request_withdrawal() itself — this handler only validates
// the request shape before calling it.
//
// The resulting REQUESTED row already reserves the amount: _investment_reserved_spend()
// counts REQUESTED alongside UNDER_REVIEW/APPROVED/PAYMENT_PROCESSING, so the
// participant's spendable balance drops here even though no ledger entry exists yet.
// Finance drives the rest from /admin/finance/rails: approve_withdrawal() re-checks
// that the amount is still covered once *other* reservations are counted and advances
// the row to APPROVED, then initiate_investment_payout() and confirm_investment_payout()
// record the external movement and the WITHDRAWAL_DEBIT atomically. The older
// mark_withdrawal_paid() was disabled in 0031 and revoked in 0047; it now raises
// rather than paying anything.
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
