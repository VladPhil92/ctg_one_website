import { NextResponse } from 'next/server';
import { createAuthenticatedRequestContext } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function json(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export async function GET(request: Request) {
  const context = await createAuthenticatedRequestContext(request);
  if (!context) {
    return json({ ok: false }, 401);
  }

  const [accountResult, ledgerResult] = await Promise.all([
    context.supabase
      .from('reward_accounts')
      .select('user_id,status,points_balance,lifetime_earned,lifetime_reversed,created_at,updated_at')
      .eq('user_id', context.user.id)
      .maybeSingle(),
    context.supabase
      .from('reward_ledger_entries')
      .select('id,entry_type,points_delta,balance_after,source_domain,source_reference,description,created_at')
      .eq('user_id', context.user.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (accountResult.error || ledgerResult.error) {
    return json({ ok: false, code: 'REWARDS_READ_UNAVAILABLE' }, 503);
  }

  if (!accountResult.data) {
    // Foundation migration guarantees one Rewards account per CTG One profile.
    // Missing state is an operational inconsistency, not a zero-balance claim.
    return json({ ok: false, code: 'REWARDS_ACCOUNT_MISSING' }, 503);
  }

  return json({
    ok: true,
    userId: context.user.id,
    transport: context.transport,
    program: {
      phase: 'foundation_v1',
      commercialStatus: 'inactive',
      earningActive: false,
      redemptionActive: false,
      transfersActive: false,
      referralsActive: false,
      tokenConversionActive: false,
      monetaryValue: false,
    },
    account: accountResult.data,
    ledger: ledgerResult.data ?? [],
  });
}
