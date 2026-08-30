export const CANONICAL_WALLET_IDENTITY = 'supabase-profile' as const;
export const WALLET_V2_BALANCE_AUTHORITY = 'ctg_ledger_v2' as const;
export const WALLET_V2_JOURNAL_POSTING_ENABLED = true as const;
export const WALLET_OVERVIEW_VERSION = 'ctg-wallet-overview-v2' as const;

export type WalletIdentityProvider = 'privy';
export type WalletIdentityLinkStatus = 'pending' | 'verified' | 'revoked';
export type WalletIdentityLinkMode = 'new' | 'legacy_preserve';
export type WalletChainFamily = 'evm' | 'bitcoin';
export type WalletExternalAccountProvider = 'privy' | 'external';
export type WalletExternalAccountKind = 'embedded' | 'external' | 'watch_only';
export type WalletExternalAccountStatus = 'pending' | 'verified' | 'revoked';

export interface CanonicalWalletIdentity {
  userId: string;
  provider: WalletIdentityProvider;
  providerUserId: string;
  status: WalletIdentityLinkStatus;
  linkMode: WalletIdentityLinkMode;
  linkedAt: string | null;
  verifiedAt: string | null;
}

export interface WalletExternalAccount {
  id: string;
  userId: string;
  identityLinkId: string | null;
  provider: WalletExternalAccountProvider;
  chainFamily: WalletChainFamily;
  accountKind: WalletExternalAccountKind;
  address: string;
  status: WalletExternalAccountStatus;
  isPrimary: boolean;
  legacyPreserved: boolean;
  verifiedAt: string | null;
}

export type WalletAuthority =
  | 'supabase-auth'
  | 'ctg-ledger'
  | 'investment-ledger'
  | 'blockchain'
  | 'derived-read-model';

export interface WalletPositionReference {
  authority: WalletAuthority;
  assetOrPositionId: string;
  units: string;
  displayCurrency?: string;
  displayValue?: string;
}

// ---------------------------------------------------------------------------
// Wallet Domain V2
// ---------------------------------------------------------------------------

export type WalletInternalAccountKind =
  | 'user_available'
  | 'user_pending'
  | 'system_clearing'
  | 'system_adjustment';

export type WalletInternalAccountStatus = 'active' | 'frozen' | 'closed';

export interface WalletInternalAccount {
  id: string;
  userId: string | null;
  accountCode: string;
  accountKind: WalletInternalAccountKind;
  currency: string;
  status: WalletInternalAccountStatus;
  createdAt: string;
  updatedAt: string;
}

export type WalletIntentStatus =
  | 'created'
  | 'authorized'
  | 'submitted'
  | 'reconciled'
  | 'failed'
  | 'cancelled';

export interface WalletIntent {
  id: string;
  userId: string;
  intentType: string;
  idempotencyKey: string;
  status: WalletIntentStatus;
  currency: string;
  amountCents: number | null;
  externalReference: string | null;
  metadata: Record<string, unknown>;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type WalletJournalEntryStatus = 'staged' | 'posted' | 'reversed';

export interface WalletJournalEntry {
  id: string;
  subjectUserId: string | null;
  intentId: string | null;
  eventType: string;
  status: WalletJournalEntryStatus;
  currency: string;
  idempotencyKey: string;
  sourceType: string | null;
  sourceId: string | null;
  externalReference: string | null;
  occurredAt: string;
  postedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface WalletJournalPosting {
  id: string;
  entryId: string;
  accountId: string;
  amountCents: number;
  memo: string | null;
  createdAt: string;
}

export type WalletTransactionReferenceAuthority =
  | 'ctg-ledger'
  | 'bank'
  | 'bre_b'
  | 'blockchain'
  | 'investment';

export interface WalletTransactionReference {
  id: string;
  subjectUserId: string | null;
  intentId: string | null;
  journalEntryId: string | null;
  authority: WalletTransactionReferenceAuthority;
  referenceKind: string;
  referenceValue: string;
  createdAt: string;
}

/**
 * Compatibility projection name retained for API stability. The value is now
 * derived from posted authoritative journal entries; public.wallets is only a
 * compatibility cache and no longer the financial source of truth.
 */
export interface WalletBalanceCompatibilityV2 {
  accountId: string;
  userId: string;
  legacyWalletId: string;
  currency: string;
  availableBalanceCents: number;
  balanceAuthority: typeof WALLET_V2_BALANCE_AUTHORITY;
  journalPostingEnabled: typeof WALLET_V2_JOURNAL_POSTING_ENABLED;
  balanceUpdatedAt: string;
}

// ---------------------------------------------------------------------------
// Authenticated Wallet V2 read model
// ---------------------------------------------------------------------------

export type WalletKycStatus = 'not_submitted' | 'pending' | 'verified' | 'rejected';

export interface WalletOverviewBalance {
  accountId: string;
  currency: string;
  availableBalanceCents: number;
  authority: typeof WALLET_V2_BALANCE_AUTHORITY;
  journalPostingEnabled: typeof WALLET_V2_JOURNAL_POSTING_ENABLED;
  updatedAt: string;
}

export interface WalletOverviewIdentity {
  provider: WalletIdentityProvider;
  status: WalletIdentityLinkStatus;
  linkMode: WalletIdentityLinkMode;
  linkedAt: string | null;
  verifiedAt: string | null;
}

export interface WalletOverviewExternalAccount {
  id: string;
  provider: WalletExternalAccountProvider;
  chainFamily: WalletChainFamily;
  accountKind: WalletExternalAccountKind;
  address: string;
  status: WalletExternalAccountStatus;
  isPrimary: boolean;
  legacyPreserved: boolean;
  verifiedAt: string | null;
}

export type WalletOverviewBlockchainStatus =
  | 'not_linked'
  | 'available'
  | 'degraded'
  | 'unavailable';

export type WalletOverviewBlockchainReason =
  | 'NO_VERIFIED_EVM_ACCOUNT'
  | 'INVALID_VERIFIED_EVM_ACCOUNT'
  | 'RPC_NOT_CONFIGURED'
  | 'RPC_READ_FAILED'
  | 'CTG_TOKEN_CONFIG_INVALID'
  | 'CTG_TOKEN_READ_FAILED'
  | null;

export interface WalletOverviewBlockchainPosition {
  authority: 'blockchain';
  network: 'polygon';
  chainId: 137;
  accountAddress: string;
  assetKind: 'native' | 'erc20';
  assetAddress: string | null;
  symbol: string;
  decimals: number;
  rawBalance: string;
  formattedBalance: string;
}

export interface WalletOverviewBlockchainPortfolio {
  network: 'polygon';
  chainId: 137;
  accountAddress: string | null;
  status: WalletOverviewBlockchainStatus;
  reason: WalletOverviewBlockchainReason;
  positions: WalletOverviewBlockchainPosition[];
  asOf: string;
}

export type WalletOverviewActivitySource = 'legacy_transaction' | 'wallet_intent' | 'ledger_entry';
export type WalletOverviewActivityDirection = 'credit' | 'debit' | null;

export interface WalletOverviewActivityItem {
  id: string;
  source: WalletOverviewActivitySource;
  kind: string;
  rail: string | null;
  status: string;
  currency: string;
  amountCents: number | null;
  direction: WalletOverviewActivityDirection;
  reference: string | null;
  occurredAt: string;
  settledAt: string | null;
}

export interface WalletOverviewCapabilities {
  copBalanceRead: true;
  walletIdentityRead: true;
  activityRead: true;
  journalPosting: true;
  moneyMovement: false;
  blockchainBalances: boolean;
  investmentPositions: false;
}

/**
 * Read-only aggregate returned by GET /api/wallet/overview. `journalPosting`
 * means the server-side canonical ledger is live; it does not grant the browser
 * any money-movement capability. Browser money movement remains false.
 */
export interface WalletOverviewV2 {
  version: typeof WALLET_OVERVIEW_VERSION;
  asOf: string;
  user: {
    id: string;
    kycStatus: WalletKycStatus;
  };
  balance: WalletOverviewBalance;
  identity: WalletOverviewIdentity | null;
  externalAccounts: WalletOverviewExternalAccount[];
  blockchain?: WalletOverviewBlockchainPortfolio;
  activity: WalletOverviewActivityItem[];
  capabilities: WalletOverviewCapabilities;
}

export function normalizeWalletAddress(
  chainFamily: WalletChainFamily,
  address: string
): string {
  const trimmed = address.trim();
  return chainFamily === 'evm' ? trimmed.toLowerCase() : trimmed;
}

export function normalizeWalletReference(reference: string): string {
  return reference.trim().toLowerCase();
}

export function isEvmAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address.trim());
}

export function shouldPreserveLegacyWallet(linkMode: WalletIdentityLinkMode): boolean {
  return linkMode === 'legacy_preserve';
}
