export const CANONICAL_WALLET_IDENTITY = 'supabase-profile' as const;
export const WALLET_V2_BALANCE_AUTHORITY = 'legacy_wallets' as const;
export const WALLET_V2_JOURNAL_POSTING_ENABLED = false as const;

export type WalletIdentityProvider = 'privy';
export type WalletIdentityLinkStatus = 'pending' | 'verified' | 'revoked';
export type WalletIdentityLinkMode = 'new' | 'legacy_preserve';
export type WalletChainFamily = 'evm' | 'bitcoin';
export type WalletExternalAccountProvider = 'privy' | 'external';
export type WalletExternalAccountKind = 'embedded' | 'external' | 'watch_only';
export type WalletExternalAccountStatus = 'pending' | 'verified' | 'revoked';

/**
 * Canonical CTG One identity.
 *
 * userId is always public.profiles.id / auth.users.id. Provider-specific IDs
 * are linked metadata and must never replace the canonical user identifier.
 */
export interface CanonicalWalletIdentity {
  userId: string;
  provider: WalletIdentityProvider;
  providerUserId: string;
  status: WalletIdentityLinkStatus;
  linkMode: WalletIdentityLinkMode;
  linkedAt: string | null;
  verifiedAt: string | null;
}

/**
 * A blockchain account associated with the canonical CTG identity.
 * Crypto balances remain authoritative on-chain; this record only captures
 * verified association, migration provenance and product-level preferences.
 */
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

/**
 * A wallet intent represents what an authenticated CTG user asked the system to
 * do. It is not proof that money moved and is never an authoritative balance.
 */
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

/**
 * Journal entries/postings are schema-only in migration 0078. Posting remains
 * fail-closed until opening balances and a trusted posting RPC are introduced.
 */
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
 * Transitional balance projection. availableBalanceCents is still read from
 * public.wallets.balance_cents. Consumers must not infer that the V2 journal is
 * live from the presence of a V2 account row.
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
