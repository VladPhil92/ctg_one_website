import {
  INVESTMENT_CRYPTO_DESTINATIONS,
  type InvestmentCryptoDestination,
} from '@/lib/payment-instructions';

export type WalletCryptoAsset = 'BTC' | 'ETH' | 'BNB' | 'USDT' | 'USDC';
export type WalletCryptoChainKind = 'bitcoin' | 'evm-native' | 'evm-token';
export type WalletCryptoSettlementBinding = 'shared-operator-address' | 'claimant-specific-address';

export type WalletCryptoDestination = {
  asset: WalletCryptoAsset;
  name: string;
  network: string;
  address: string;
  exchange: 'Binance';
  chainKind: WalletCryptoChainKind;
  coingeckoId: string;
  settlementBinding: WalletCryptoSettlementBinding;
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
    settlementBinding: 'shared-operator-address',
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
 * destinations already pinned by the investment rail. Those addresses are
 * shared operator destinations, so on-chain validation alone is not sufficient
 * to prove which CTG One user originated a transfer. Auto-settlement therefore
 * remains fail-closed until a claimant-specific receiving address (or another
 * cryptographically verifiable claimant binding) is introduced.
 *
 * USDC is additionally fail-closed until its exact network and receiving address
 * are explicitly configured.
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
        settlementBinding: 'shared-operator-address' as const,
      }]
    : []),
];

export const WALLET_CRYPTO_TOPUPS_CONFIGURED = WALLET_CRYPTO_DESTINATIONS.length >= 4;

export function getWalletCryptoDestination(asset: string | null | undefined) {
  const normalized = asset?.trim().toUpperCase();
  return WALLET_CRYPTO_DESTINATIONS.find((item) => item.asset === normalized) ?? null;
}

export function canAutoSettleWalletCryptoDestination(
  asset: string | null | undefined,
  destinationAddress: string | null | undefined,
) {
  const destination = getWalletCryptoDestination(asset);
  if (!destination || !destinationAddress) return false;
  return destination.settlementBinding === 'claimant-specific-address'
    && destination.address.toLowerCase() === destinationAddress.trim().toLowerCase();
}

export function isWalletCryptoAsset(value: string): value is WalletCryptoAsset {
  return WALLET_CRYPTO_DESTINATIONS.some((item) => item.asset === value);
}

export const WALLET_CRYPTO_QUOTE_TTL_SECONDS = 15 * 60;
export const WALLET_CRYPTO_MARKET_CACHE_SECONDS = 60 * 60;
