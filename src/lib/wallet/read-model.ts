import {
  WALLET_OVERVIEW_VERSION,
  WALLET_V2_BALANCE_AUTHORITY,
  WALLET_V2_JOURNAL_POSTING_ENABLED,
  normalizeWalletAddress,
  type WalletChainFamily,
  type WalletExternalAccountKind,
  type WalletExternalAccountProvider,
  type WalletExternalAccountStatus,
  type WalletIdentityLinkMode,
  type WalletIdentityLinkStatus,
  type WalletKycStatus,
  type WalletOverviewActivityItem,
  type WalletOverviewV2,
} from '@/lib/wallet/domain';

const KYC_STATUSES = new Set<WalletKycStatus>([
  'not_submitted',
  'pending',
  'verified',
  'rejected',
]);
const IDENTITY_STATUSES = new Set<WalletIdentityLinkStatus>(['pending', 'verified', 'revoked']);
const IDENTITY_LINK_MODES = new Set<WalletIdentityLinkMode>(['new', 'legacy_preserve']);
const ACCOUNT_PROVIDERS = new Set<WalletExternalAccountProvider>(['privy', 'external']);
const CHAIN_FAMILIES = new Set<WalletChainFamily>(['evm', 'bitcoin']);
const ACCOUNT_KINDS = new Set<WalletExternalAccountKind>(['embedded', 'external', 'watch_only']);
const ACCOUNT_STATUSES = new Set<WalletExternalAccountStatus>(['pending', 'verified', 'revoked']);
const MAX_ACTIVITY_ITEMS = 20;

export class WalletReadModelError extends Error {
  constructor(
    public readonly code: 'INVALID_WALLET_READ_MODEL' | 'WALLET_OWNER_MISMATCH',
    message: string,
  ) {
    super(message);
    this.name = 'WalletReadModelError';
  }
}

export type WalletOverviewProfileRow = {
  id: string;
  kyc_status: string;
};

export type WalletOverviewBalanceRow = {
  account_id: string;
  user_id: string;
  legacy_wallet_id: string;
  currency: string;
  available_balance_cents: number | string;
  balance_authority: string;
  journal_posting_enabled: boolean;
  balance_updated_at: string;
};

export type WalletOverviewIdentityRow = {
  user_id: string;
  provider: string;
  status: string;
  link_mode: string;
  linked_at: string | null;
  verified_at: string | null;
};

export type WalletOverviewExternalAccountRow = {
  id: string;
  user_id: string;
  provider: string;
  chain_family: string;
  account_kind: string;
  address: string;
  status: string;
  is_primary: boolean;
  legacy_preserved: boolean;
  verified_at: string | null;
  created_at: string;
};

export type WalletOverviewLegacyTransactionRow = {
  id: string;
  user_id: string;
  type: string;
  method: string | null;
  amount_cents: number | string;
  status: string;
  external_reference: string | null;
  crypto_tx_hash: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type WalletOverviewIntentRow = {
  id: string;
  user_id: string;
  intent_type: string;
  status: string;
  currency: string;
  amount_cents: number | string | null;
  external_reference: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

function ownerMismatch(label: string): never {
  throw new WalletReadModelError(
    'WALLET_OWNER_MISMATCH',
    `${label} does not belong to the authenticated CTG user.`,
  );
}

function requireOwned(actualUserId: string, expectedUserId: string, label: string) {
  if (actualUserId !== expectedUserId) ownerMismatch(label);
}

function requireSafeCents(value: number | string, label: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new WalletReadModelError(
      'INVALID_WALLET_READ_MODEL',
      `${label} is outside the safe non-negative integer range.`,
    );
  }
  return parsed;
}

function optionalSafeCents(value: number | string | null, label: string): number | null {
  return value === null ? null : requireSafeCents(value, label);
}

function requireCurrency(value: string, label: string): string {
  if (!/^[A-Z]{3}$/.test(value)) {
    throw new WalletReadModelError('INVALID_WALLET_READ_MODEL', `${label} is invalid.`);
  }
  return value;
}

function requireKycStatus(value: string): WalletKycStatus {
  if (!KYC_STATUSES.has(value as WalletKycStatus)) {
    throw new WalletReadModelError('INVALID_WALLET_READ_MODEL', 'KYC status is invalid.');
  }
  return value as WalletKycStatus;
}

function requireIdentityStatus(value: string): WalletIdentityLinkStatus {
  if (!IDENTITY_STATUSES.has(value as WalletIdentityLinkStatus)) {
    throw new WalletReadModelError('INVALID_WALLET_READ_MODEL', 'Wallet identity status is invalid.');
  }
  return value as WalletIdentityLinkStatus;
}

function requireLinkMode(value: string): WalletIdentityLinkMode {
  if (!IDENTITY_LINK_MODES.has(value as WalletIdentityLinkMode)) {
    throw new WalletReadModelError('INVALID_WALLET_READ_MODEL', 'Wallet identity link mode is invalid.');
  }
  return value as WalletIdentityLinkMode;
}

function requireAccountProvider(value: string): WalletExternalAccountProvider {
  if (!ACCOUNT_PROVIDERS.has(value as WalletExternalAccountProvider)) {
    throw new WalletReadModelError('INVALID_WALLET_READ_MODEL', 'External wallet provider is invalid.');
  }
  return value as WalletExternalAccountProvider;
}

function requireChainFamily(value: string): WalletChainFamily {
  if (!CHAIN_FAMILIES.has(value as WalletChainFamily)) {
    throw new WalletReadModelError('INVALID_WALLET_READ_MODEL', 'Wallet chain family is invalid.');
  }
  return value as WalletChainFamily;
}

function requireAccountKind(value: string): WalletExternalAccountKind {
  if (!ACCOUNT_KINDS.has(value as WalletExternalAccountKind)) {
    throw new WalletReadModelError('INVALID_WALLET_READ_MODEL', 'External wallet account kind is invalid.');
  }
  return value as WalletExternalAccountKind;
}

function requireAccountStatus(value: string): WalletExternalAccountStatus {
  if (!ACCOUNT_STATUSES.has(value as WalletExternalAccountStatus)) {
    throw new WalletReadModelError('INVALID_WALLET_READ_MODEL', 'External wallet status is invalid.');
  }
  return value as WalletExternalAccountStatus;
}

export function buildWalletOverviewV2(params: {
  authenticatedUserId: string;
  asOf: string;
  profile: WalletOverviewProfileRow;
  balance: WalletOverviewBalanceRow;
  identity: WalletOverviewIdentityRow | null;
  externalAccounts: WalletOverviewExternalAccountRow[];
  legacyTransactions: WalletOverviewLegacyTransactionRow[];
  intents: WalletOverviewIntentRow[];
}): WalletOverviewV2 {
  const {
    authenticatedUserId,
    asOf,
    profile,
    balance,
    identity,
    externalAccounts,
    legacyTransactions,
    intents,
  } = params;

  requireOwned(profile.id, authenticatedUserId, 'profile');
  requireOwned(balance.user_id, authenticatedUserId, 'balance');

  if (balance.balance_authority !== WALLET_V2_BALANCE_AUTHORITY) {
    throw new WalletReadModelError(
      'INVALID_WALLET_READ_MODEL',
      'Wallet balance authority changed without a reviewed API contract update.',
    );
  }
  if (balance.journal_posting_enabled !== WALLET_V2_JOURNAL_POSTING_ENABLED) {
    throw new WalletReadModelError(
      'INVALID_WALLET_READ_MODEL',
      'Wallet journal posting state changed without a reviewed API contract update.',
    );
  }

  if (identity) {
    requireOwned(identity.user_id, authenticatedUserId, 'wallet identity');
    if (identity.provider !== 'privy') {
      throw new WalletReadModelError('INVALID_WALLET_READ_MODEL', 'Wallet identity provider is invalid.');
    }
  }

  const mappedAccounts = externalAccounts.map((account) => {
    requireOwned(account.user_id, authenticatedUserId, 'external wallet account');
    const chainFamily = requireChainFamily(account.chain_family);
    return {
      id: account.id,
      provider: requireAccountProvider(account.provider),
      chainFamily,
      accountKind: requireAccountKind(account.account_kind),
      address: normalizeWalletAddress(chainFamily, account.address),
      status: requireAccountStatus(account.status),
      isPrimary: account.is_primary,
      legacyPreserved: account.legacy_preserved,
      verifiedAt: account.verified_at,
    };
  });

  const activity: WalletOverviewActivityItem[] = [];

  for (const transaction of legacyTransactions) {
    requireOwned(transaction.user_id, authenticatedUserId, 'legacy transaction');
    activity.push({
      id: transaction.id,
      source: 'legacy_transaction',
      kind: transaction.type,
      rail: transaction.method,
      status: transaction.status,
      currency: requireCurrency(balance.currency, 'wallet balance currency'),
      amountCents: requireSafeCents(transaction.amount_cents, 'legacy transaction amount'),
      reference: transaction.crypto_tx_hash ?? transaction.external_reference,
      occurredAt: transaction.created_at,
      settledAt: transaction.reviewed_at,
    });
  }

  for (const intent of intents) {
    requireOwned(intent.user_id, authenticatedUserId, 'wallet intent');
    activity.push({
      id: intent.id,
      source: 'wallet_intent',
      kind: intent.intent_type,
      rail: null,
      status: intent.status,
      currency: requireCurrency(intent.currency, 'wallet intent currency'),
      amountCents: optionalSafeCents(intent.amount_cents, 'wallet intent amount'),
      reference: intent.external_reference,
      occurredAt: intent.created_at,
      settledAt: intent.status === 'reconciled' ? intent.updated_at : null,
    });
  }

  activity.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  return {
    version: WALLET_OVERVIEW_VERSION,
    asOf,
    user: {
      id: authenticatedUserId,
      kycStatus: requireKycStatus(profile.kyc_status),
    },
    balance: {
      accountId: balance.account_id,
      currency: requireCurrency(balance.currency, 'wallet balance currency'),
      availableBalanceCents: requireSafeCents(
        balance.available_balance_cents,
        'wallet available balance',
      ),
      authority: WALLET_V2_BALANCE_AUTHORITY,
      journalPostingEnabled: WALLET_V2_JOURNAL_POSTING_ENABLED,
      updatedAt: balance.balance_updated_at,
    },
    identity: identity
      ? {
          provider: 'privy',
          status: requireIdentityStatus(identity.status),
          linkMode: requireLinkMode(identity.link_mode),
          linkedAt: identity.linked_at,
          verifiedAt: identity.verified_at,
        }
      : null,
    externalAccounts: mappedAccounts,
    activity: activity.slice(0, MAX_ACTIVITY_ITEMS),
    capabilities: {
      copBalanceRead: true,
      walletIdentityRead: true,
      activityRead: true,
      journalPosting: false,
      moneyMovement: false,
      blockchainBalances: false,
      investmentPositions: false,
    },
  };
}
