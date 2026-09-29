import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { consumeAuthenticatedRateLimit } from '@/lib/security/api-rate-limit';
import { validateAndPersistWalletCryptoTopup } from '@/lib/wallet-crypto-settlement';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ claimId: string }> },
) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'crypto top-ups are not available' }, { status: 503 });
  }
  const participantClient = await createClient();
  const { data: { user } } = await participantClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  const rateLimit = await consumeAuthenticatedRateLimit(participantClient, 'wallet.crypto-topup-status');
  if (!rateLimit.allowed) return NextResponse.json({ error: 'too many validation attempts' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } });

  const { claimId } = await context.params;
  if (!/^[0-9a-fA-F-]{36}$/.test(claimId)) return NextResponse.json({ error: 'invalid claim id' }, { status: 400 });
  const { data: ownClaim } = await participantClient.from('wallet_crypto_topup_claims').select('id,state').eq('id', claimId).eq('user_id', user.id).maybeSingle();
  if (!ownClaim) return NextResponse.json({ error: 'crypto top-up claim not found' }, { status: 404 });
  if (ownClaim.state === 'confirmed' || ownClaim.state === 'rejected') return NextResponse.json(ownClaim);

  try {
    const data = await validateAndPersistWalletCryptoTopup(createAdminClient(), claimId);
    return NextResponse.json(data, { headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) } });
  } catch (error) {
    return NextResponse.json({ claimId, state: ownClaim.state, warning: error instanceof Error ? error.message : 'validation unavailable' }, { status: 202 });
  }
}
