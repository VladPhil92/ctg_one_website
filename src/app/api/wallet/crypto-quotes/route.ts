import { NextResponse, type NextRequest } from 'next/server';
import { consumeAuthenticatedRateLimit } from '@/lib/security/api-rate-limit';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getWalletCryptoMarketQuote } from '@/lib/wallet-crypto-market';
import {
  WALLET_CRYPTO_QUOTE_TTL_SECONDS,
  getWalletCryptoDestination,
  type WalletCryptoAsset,
} from '@/lib/wallet-crypto-topups';

const DECIMALS: Record<WalletCryptoAsset, number> = {
  BTC: 8,
  ETH: 8,
  BNB: 8,
  USDT: 6,
  USDC: 6,
};

function roundCryptoAmount(value: number, decimals: number) {
  return Number(value.toFixed(decimals));
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'crypto top-ups are not available' }, { status: 503 });
  }

  const participantClient = await createClient();
  const { data: { user } } = await participantClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 });

  const { data: profile, error: profileError } = await participantClient
    .from('profiles')
    .select('id,kyc_status')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });
  if (!profile || profile.kyc_status !== 'verified') {
    return NextResponse.json({ error: 'verified KYC is required' }, { status: 403 });
  }

  const rateLimit = await consumeAuthenticatedRateLimit(participantClient, 'wallet.crypto-quote');
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'too many quote requests', code: 'RATE_LIMITED' }, {
      status: 429,
      headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
    });
  }

  const body = await request.json().catch(() => null) as {
    asset?: string;
    amountCop?: number;
    displayCurrency?: string;
  } | null;
  const asset = body?.asset?.trim().toUpperCase() ?? '';
  const destination = getWalletCryptoDestination(asset);
  if (!destination) return NextResponse.json({ error: 'crypto asset is not configured' }, { status: 400 });

  const amountCents = Math.round(Number(body?.amountCop) * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: 'invalid COP amount' }, { status: 400 });
  }
  const displayCurrency = body?.displayCurrency === 'USD' ? 'USD' : 'COP';

  try {
    const market = await getWalletCryptoMarketQuote(destination.asset);
    const amountCop = amountCents / 100;
    const cryptoAmount = roundCryptoAmount(amountCop / market.priceCop, DECIMALS[destination.asset]);
    if (!Number.isFinite(cryptoAmount) || cryptoAmount <= 0) {
      return NextResponse.json({ error: 'calculated crypto amount is invalid' }, { status: 422 });
    }

    const expiresAt = new Date(Date.now() + WALLET_CRYPTO_QUOTE_TTL_SECONDS * 1_000);
    const admin = createAdminClient();
    const { data: quoteId, error: quoteError } = await admin.rpc('create_wallet_crypto_quote_server', {
      p_user_id: user.id,
      p_asset: destination.asset,
      p_network: destination.network,
      p_destination_address: destination.address,
      p_amount_cents: amountCents,
      p_price_cop: market.priceCop,
      p_price_usd: market.priceUsd,
      p_crypto_amount: cryptoAmount,
      p_display_currency: displayCurrency,
      p_market_provider: market.provider,
      p_market_fetched_at: market.fetchedAt,
      p_expires_at: expiresAt.toISOString(),
    });
    if (quoteError) return NextResponse.json({ error: quoteError.message }, { status: 409 });

    const amountUsd = cryptoAmount * market.priceUsd;
    return NextResponse.json({
      quoteId,
      asset: destination.asset,
      network: destination.network,
      destinationAddress: destination.address,
      amountCop,
      amountUsd: Number(amountUsd.toFixed(2)),
      cryptoAmount,
      priceCop: market.priceCop,
      priceUsd: market.priceUsd,
      displayCurrency,
      marketProvider: market.provider,
      marketFetchedAt: market.fetchedAt,
      expiresAt: expiresAt.toISOString(),
    }, { headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CRYPTO_MARKET_UNAVAILABLE';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
