import { NextResponse } from 'next/server';
import { createAdminClient, createAuthenticatedRequestContext } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function json(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

/**
 * Referral reporting is intentionally isolated from CTG Rewards points
 * and every real-money wallet/investment balance.
 * A qualified referral is NOT an approved or payable monetary reward.
 */
export async function GET(request: Request) {
  const context = await createAuthenticatedRequestContext(request);
  if (!context) return json({ ok: false, code: 'UNAUTHORIZED' }, 401);
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ ok: false, code: 'ACCELERATE_UNAVAILABLE' }, 503);
  }

  const admin = createAdminClient();
  const [codeResult, statsResult] = await Promise.all([
    admin.from('ctg_accelerate_referral_codes')
      .select('code,created_at')
      .eq('user_id', context.user.id)
      .maybeSingle(),
    admin.rpc('ctg_accelerate_referral_stats', { p_referrer: context.user.id }),
  ]);

  if (codeResult.error || statsResult.error || !codeResult.data || !statsResult.data?.[0]) {
    // Missing migration or inconsistent runtime state is not a zero-balance claim.
    return json({ ok: false, code: 'ACCELERATE_READ_UNAVAILABLE' }, 503);
  }

  const registeredCount = Number(statsResult.data[0].registered_count);
  const qualifiedCount = Number(statsResult.data[0].qualified_count);
  if (!Number.isSafeInteger(registeredCount) || !Number.isSafeInteger(qualifiedCount) ||
      registeredCount < 0 || qualifiedCount < 0 || qualifiedCount > registeredCount) {
    return json({ ok: false, code: 'ACCELERATE_COUNT_INVALID' }, 503);
  }

  return json({
    ok: true,
    referralCode: codeResult.data.code,
    counts: { registered: registeredCount, qualified: qualifiedCount },
    status: {
      attributionTracking: 'enabled',
      rewards: 'not_approved',
      cashBalanceCredits: false,
      principalRecoveryCredits: false,
      contractMaturityChanges: false,
    },
    // Never expose referred users' names, UUIDs, emails or investment amounts.
    disclaimer: 'El seguimiento de referidos no genera por sí mismo bonificaciones económicas.',
  });
}
