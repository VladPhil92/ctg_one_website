export const CANONICAL_WALLET_IDENTITY = 'supabase-profile' as const;

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

export function normalizeWalletAddress(
  chainFamily: WalletChainFamily,
  address: string
): string {
  const trimmed = address.trim();
  return chainFamily === 'evm' ? trimmed.toLowerCase() : trimmed;
}

export function isEvmAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address.trim());
}

export function shouldPreserveLegacyWallet(linkMode: WalletIdentityLinkMode): boolean {
  return linkMode === 'legacy_preserve';
}
