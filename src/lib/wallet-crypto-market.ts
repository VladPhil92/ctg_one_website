import 'server-only';

import {
  WALLET_CRYPTO_MARKET_CACHE_SECONDS,
  type WalletCryptoAsset,
  getWalletCryptoDestination,
} from '@/lib/wallet-crypto-topups';

type CoinGeckoSimplePrice = Record<string, { cop?: number; usd?: number }>;

type MarketQuote = {
  asset: WalletCryptoAsset;
  priceCop: number;
  priceUsd: number;
  fetchedAt: string;
  provider: 'coingecko';
};

type CacheEntry = {
  quote: MarketQuote;
  expiresAtMs: number;
};

const cache = new Map<WalletCryptoAsset, CacheEntry>();

function positiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export async function getWalletCryptoMarketQuote(asset: WalletCryptoAsset): Promise<MarketQuote> {
  const destination = getWalletCryptoDestination(asset);
  if (!destination) throw new Error('CRYPTO_ASSET_NOT_CONFIGURED');

  const now = Date.now();
  const cached = cache.get(asset);
  if (cached && cached.expiresAtMs > now) return cached.quote;

  const apiKey = process.env.COINGECKO_API_KEY?.trim();
  if (!apiKey) throw new Error('CRYPTO_MARKET_PROVIDER_NOT_CONFIGURED');

  const url = new URL('https://api.coingecko.com/api/v3/simple/price');
  url.searchParams.set('ids', destination.coingeckoId);
  url.searchParams.set('vs_currencies', 'cop,usd');
  url.searchParams.set('include_last_updated_at', 'true');

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'x-cg-demo-api-key': apiKey,
    },
    signal: AbortSignal.timeout(8_000),
    next: { revalidate: WALLET_CRYPTO_MARKET_CACHE_SECONDS },
  });

  if (!response.ok) throw new Error(`CRYPTO_MARKET_PROVIDER_${response.status}`);
  const payload = await response.json() as CoinGeckoSimplePrice;
  const row = payload[destination.coingeckoId];
  if (!row || !positiveFinite(row.cop) || !positiveFinite(row.usd)) {
    throw new Error('CRYPTO_MARKET_PRICE_INVALID');
  }

  const quote: MarketQuote = {
    asset,
    priceCop: row.cop,
    priceUsd: row.usd,
    fetchedAt: new Date().toISOString(),
    provider: 'coingecko',
  };

  cache.set(asset, {
    quote,
    expiresAtMs: now + WALLET_CRYPTO_MARKET_CACHE_SECONDS * 1_000,
  });
  return quote;
}
