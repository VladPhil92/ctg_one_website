import 'server-only';

const PRIVY_API_ORIGIN = 'https://api.privy.io';
const PRIVY_USER_ID_RE = /^did:privy:[a-zA-Z0-9_-]+$/;
const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

type PrivyLinkedAccount = Record<string, unknown>;

type PrivyUserResponse = {
  id?: unknown;
  linked_accounts?: unknown;
};

export type PrivyRegistryUser = {
  id: string;
  embeddedEvmWalletCount: number;
  linkedAccountCount: number;
};

export type PrivyOwnershipInspection =
  | {
      state: 'ready_to_link';
      customAuthOwnerExists: false;
      historicalWalletOwnerVerified: true;
    }
  | {
      state: 'already_same_principal';
      customAuthOwnerExists: true;
      historicalWalletOwnerVerified: true;
    }
  | {
      state: 'ownership_conflict';
      customAuthOwnerExists: true;
      historicalWalletOwnerVerified: true;
      conflictingPrincipalHasEmbeddedWallet: boolean;
      conflictingPrincipalLinkedAccountCount: number;
    };

export class PrivyUserRegistryError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'PrivyUserRegistryError';
  }
}

function appId(): string | null {
  const value = (process.env.PRIVY_APP_ID ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '').trim();
  return value || null;
}

function appSecret(): string | null {
  const value = (process.env.PRIVY_APP_SECRET ?? '').trim();
  return value || null;
}

export function isPrivyUserRegistryConfigured(): boolean {
  return Boolean(appId() && appSecret());
}

function linkedAccounts(value: unknown): PrivyLinkedAccount[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (account): account is PrivyLinkedAccount => Boolean(account) && typeof account === 'object' && !Array.isArray(account),
  );
}

function isEmbeddedEvmWallet(account: PrivyLinkedAccount): boolean {
  if (account.type !== 'wallet') return false;
  const address = typeof account.address === 'string' ? account.address.trim() : '';
  if (!EVM_ADDRESS_RE.test(address)) return false;

  const chainType = account.chain_type ?? account.chainType;
  if (typeof chainType === 'string' && !['ethereum', 'evm'].includes(chainType.toLowerCase())) {
    return false;
  }

  const walletClientType = account.wallet_client_type ?? account.walletClientType;
  if (typeof walletClientType === 'string' && walletClientType.toLowerCase() !== 'privy') {
    return false;
  }

  return true;
}

function normalizeUser(payload: unknown): PrivyRegistryUser {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new PrivyUserRegistryError('PRIVY_USER_REGISTRY_INVALID_RESPONSE');
  }
  const record = payload as PrivyUserResponse;
  if (typeof record.id !== 'string' || !PRIVY_USER_ID_RE.test(record.id)) {
    throw new PrivyUserRegistryError('PRIVY_USER_REGISTRY_INVALID_RESPONSE');
  }

  const accounts = linkedAccounts(record.linked_accounts);
  return {
    id: record.id,
    embeddedEvmWalletCount: accounts.filter(isEmbeddedEvmWallet).length,
    linkedAccountCount: accounts.length,
  };
}

async function lookup(path: string, body: Record<string, string>): Promise<PrivyRegistryUser | null> {
  const configuredAppId = appId();
  const configuredSecret = appSecret();
  if (!configuredAppId || !configuredSecret) {
    throw new PrivyUserRegistryError('PRIVY_USER_REGISTRY_NOT_CONFIGURED');
  }

  const authorization = Buffer.from(`${configuredAppId}:${configuredSecret}`, 'utf8').toString('base64');
  let response: Response;
  try {
    response = await fetch(`${PRIVY_API_ORIGIN}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${authorization}`,
        'Content-Type': 'application/json',
        'privy-app-id': configuredAppId,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new PrivyUserRegistryError('PRIVY_USER_REGISTRY_UNAVAILABLE');
  }

  if (response.status === 404) return null;
  if (response.status === 401 || response.status === 403) {
    throw new PrivyUserRegistryError('PRIVY_USER_REGISTRY_AUTH_FAILED');
  }
  if (!response.ok) {
    throw new PrivyUserRegistryError('PRIVY_USER_REGISTRY_UNAVAILABLE');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new PrivyUserRegistryError('PRIVY_USER_REGISTRY_INVALID_RESPONSE');
  }
  return normalizeUser(payload);
}

export async function getPrivyUserByCustomAuthId(customUserId: string) {
  return lookup('/v1/users/custom_auth/id', { custom_user_id: customUserId });
}

export async function getPrivyUserByWalletAddress(address: string) {
  const normalized = address.trim().toLowerCase();
  if (!EVM_ADDRESS_RE.test(normalized)) {
    throw new PrivyUserRegistryError('PRIVY_WALLET_ADDRESS_INVALID');
  }
  return lookup('/v1/users/wallet/address', { address: normalized });
}

/**
 * Read-only provider ownership preflight. This is sequencing evidence only and
 * never establishes wallet authority. `legacy-bootstrap` still requires a fresh,
 * signed Privy identity token and independently derives the embedded wallet.
 */
export async function inspectPrivyOwnership(params: {
  canonicalUserId: string;
  historicalPrivyUserId: string;
  historicalWalletAddress: string;
}): Promise<PrivyOwnershipInspection> {
  if (!PRIVY_USER_ID_RE.test(params.historicalPrivyUserId)) {
    throw new PrivyUserRegistryError('PRIVY_HISTORICAL_USER_INVALID');
  }

  const [walletOwner, customAuthOwner] = await Promise.all([
    getPrivyUserByWalletAddress(params.historicalWalletAddress),
    getPrivyUserByCustomAuthId(params.canonicalUserId),
  ]);

  if (!walletOwner) {
    throw new PrivyUserRegistryError('PRIVY_HISTORICAL_WALLET_NOT_FOUND');
  }
  if (walletOwner.id !== params.historicalPrivyUserId) {
    throw new PrivyUserRegistryError('PRIVY_HISTORICAL_WALLET_OWNER_MISMATCH');
  }

  if (!customAuthOwner) {
    return {
      state: 'ready_to_link',
      customAuthOwnerExists: false,
      historicalWalletOwnerVerified: true,
    };
  }

  if (customAuthOwner.id === walletOwner.id) {
    return {
      state: 'already_same_principal',
      customAuthOwnerExists: true,
      historicalWalletOwnerVerified: true,
    };
  }

  return {
    state: 'ownership_conflict',
    customAuthOwnerExists: true,
    historicalWalletOwnerVerified: true,
    conflictingPrincipalHasEmbeddedWallet: customAuthOwner.embeddedEvmWalletCount > 0,
    conflictingPrincipalLinkedAccountCount: customAuthOwner.linkedAccountCount,
  };
}
