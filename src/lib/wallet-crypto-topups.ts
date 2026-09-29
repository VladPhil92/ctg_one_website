import {
  INVESTMENT_CRYPTO_DESTINATIONS,
  type InvestmentCryptoDestination,
} from '@/lib/payment-instructions';

export type WalletCryptoAsset = 'BTC' | 'ETH' | 'BNB' | 'USDT' | 'USDC';
export type WalletCryptoChainKind = 'bitcoin' | 'evm-native' | 'evm-token';

export type WalletCryptoDestination = {
  asset: WalletCryptoAsset;
  name: string;
  network: string;
  address: string;
  exchange: 'Binance';
  chainKind: WalletCryptoChainKind;
  coingeckoId: string;
};

const byAsset = (asset: InvestmentCryptoDestination['asset']) =>
  INVESTMENT_CRYPTO_DESTINATIONS.find((item) => item.asset === asset);

const requiredDestination = (
  asset: InvestmentCryptoDestination['asset'],
  chainKind: WalletCryptoChainKind,
  coingeckoId: string,
): WalletCryptoDestination => {
  const destination = byAsset(asset);
  if (!destination) throw new Error(`Missing approved crypto destination for ${asset}`);
  return {
    ...destination,
    asset,
    chainKind,
    coingeckoId,
  };
};

const configured = (value: string | undefined | null) =>
  typeof value === 'string'
  && value.trim().length > 0
  && value.trim() !== 'PENDING_CONFIGURATION';

const usdcAddress = process.env.NEXT_PUBLIC_WALLET_USDC_ADDRESS?.trim();
const usdcNetwork = process.env.NEXT_PUBLIC_WALLET_USDC_NETWORK?.trim();

/**
 * Direct Wallet top-ups intentionally reuse the operator-approved Binance
 * destinations already pinned by the investment rail. USDC is fail-closed
 * until its exact network and receiving address are explicitly configured.
 */
export const WALLET_CRYPTO_DESTINATIONS: WalletCryptoDestination[] = [
  requiredDestination('BTC', 'bitcoin', 'bitcoin'),
  requiredDestination('ETH', 'evm-native', 'ethereum'),
  requiredDestination('BNB', 'evm-native', 'binancecoin'),
  requiredDestination('USDT', 'evm-token', 'tether'),
  ...(configured(usdcAddress) && configured(usdcNetwork)
    ? [{
        asset: 'USDC' as const,
        name: 'USD Coin',
        network: usdcNetwork!,
        address: usdcAddress!,
        exchange: 'Binance' as const,
        chainKind: 'evm-token' as const,
        coingeckoId: 'usd-coin',
      }]
    : []),
];

export const WALLET_CRYPTO_TOPUPS_CONFIGURED = WALLET_CRYPTO_DESTINATIONS.length >= 4;

export function getWalletCryptoDestination(asset: string | null | undefined) {
  const normalized = asset?.trim().toUpperCase();
  return WALLET_CRYPTO_DESTINATIONS.find((item) => item.asset === normalized) ?? null;
}

export function isWalletCryptoAsset(value: string): value is WalletCryptoAsset {
  return WALLET_CRYPTO_DESTINATIONS.some((item) => item.asset === value);
}

export const WALLET_CRYPTO_QUOTE_TTL_SECONDS = 15 * 60;
export const WALLET_CRYPTO_MARKET_CACHE_SECONDS = 60 * 60;
