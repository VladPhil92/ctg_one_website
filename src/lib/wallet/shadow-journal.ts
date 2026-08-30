export const WALLET_SHADOW_JOURNAL_ENABLED = true as const;
export const WALLET_SHADOW_AUTHORITATIVE = false as const;
export const WALLET_SHADOW_BALANCE_AUTHORITY = 'legacy_wallets' as const;

/**
 * Per-wallet equivalence signal for the non-authoritative Wallet V2 shadow journal.
 * driftCents is always shadowBalanceCents - legacyBalanceCents.
 */
export interface WalletShadowReconciliationV2 {
  accountId: string;
  userId: string;
  legacyWalletId: string;
  currency: string;
  legacyBalanceCents: number;
  shadowBalanceCents: number;
  driftCents: number;
  baselineInitialized: boolean;
  openingBalanceCents: number | null;
  baselineCapturedAt: string | null;
  lastShadowPostedAt: string | null;
  inSync: boolean;
  balanceAuthority: typeof WALLET_SHADOW_BALANCE_AUTHORITY;
  shadowAuthoritative: typeof WALLET_SHADOW_AUTHORITATIVE;
}

export interface WalletShadowReconciliationHealthV2 {
  walletCount: number;
  driftWalletCount: number;
  totalAbsoluteDriftCents: number;
  allInSync: boolean;
  lastShadowPostedAt: string | null;
  captureFailureCount: number;
  lastCaptureFailureAt: string | null;
  balanceAuthority: typeof WALLET_SHADOW_BALANCE_AUTHORITY;
  shadowAuthoritative: typeof WALLET_SHADOW_AUTHORITATIVE;
}
