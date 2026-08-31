const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const WALLET_CRYPTO_SEND_EXECUTION_MODE_ENV = 'WALLET_CRYPTO_SEND_EXECUTION_MODE' as const;
export const WALLET_CRYPTO_SEND_CANARY_USER_IDS_ENV = 'WALLET_CRYPTO_SEND_CANARY_USER_IDS' as const;

export type WalletCryptoSendExecutionMode = 'disabled' | 'canary';

export type WalletCryptoSendExecutionDecision = {
  mode: WalletCryptoSendExecutionMode;
  allowed: boolean;
  code: 'WALLET_EXECUTION_DISABLED' | 'WALLET_EXECUTION_CANARY_NOT_ALLOWED' | null;
};

export type WalletCryptoSendExecutionConfiguration = {
  mode: WalletCryptoSendExecutionMode;
  canaryUserConfigured: boolean;
};

export class WalletExecutionRolloutError extends Error {
  constructor(
    public readonly code: 'WALLET_EXECUTION_CONFIG_INVALID' | 'WALLET_EXECUTION_DISABLED' | 'WALLET_EXECUTION_CANARY_NOT_ALLOWED',
  ) {
    super(code);
    this.name = 'WalletExecutionRolloutError';
  }
}

function normalizeCanonicalUserId(canonicalUserId: string) {
  const userId = canonicalUserId.trim().toLowerCase();
  if (!UUID_RE.test(userId)) throw new WalletExecutionRolloutError('WALLET_EXECUTION_CONFIG_INVALID');
  return userId;
}

function readExecutionMode(): WalletCryptoSendExecutionMode {
  const raw = process.env[WALLET_CRYPTO_SEND_EXECUTION_MODE_ENV]?.trim().toLowerCase();
  if (!raw || raw === 'disabled') return 'disabled';
  if (raw === 'canary') return 'canary';
  throw new WalletExecutionRolloutError('WALLET_EXECUTION_CONFIG_INVALID');
}

function readCanaryUserIds(): Set<string> {
  const raw = process.env[WALLET_CRYPTO_SEND_CANARY_USER_IDS_ENV]?.trim() ?? '';
  if (!raw) return new Set();

  const ids = raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (ids.some((value) => !UUID_RE.test(value))) {
    throw new WalletExecutionRolloutError('WALLET_EXECUTION_CONFIG_INVALID');
  }

  return new Set(ids);
}

/**
 * Returns only the execution configuration relevant to the authenticated
 * canonical user. The full allowlist is never exposed to callers.
 */
export function inspectWalletCryptoSendExecutionConfiguration(
  canonicalUserId: string,
): WalletCryptoSendExecutionConfiguration {
  const userId = normalizeCanonicalUserId(canonicalUserId);
  const mode = readExecutionMode();
  const canaryUserIds = readCanaryUserIds();
  return {
    mode,
    canaryUserConfigured: canaryUserIds.has(userId),
  };
}

/**
 * Canary execution is intentionally not a public production mode. The only
 * executable server mode in this phase is `canary`, and it requires an exact
 * canonical Supabase user UUID allowlist. Missing or malformed configuration
 * fails closed.
 */
export function getWalletCryptoSendExecutionDecision(canonicalUserId: string): WalletCryptoSendExecutionDecision {
  const configuration = inspectWalletCryptoSendExecutionConfiguration(canonicalUserId);
  if (configuration.mode === 'disabled') {
    return { mode: configuration.mode, allowed: false, code: 'WALLET_EXECUTION_DISABLED' };
  }

  if (!configuration.canaryUserConfigured) {
    return { mode: configuration.mode, allowed: false, code: 'WALLET_EXECUTION_CANARY_NOT_ALLOWED' };
  }

  return { mode: configuration.mode, allowed: true, code: null };
}

export function assertWalletCryptoSendExecutionAllowed(canonicalUserId: string): WalletCryptoSendExecutionDecision {
  const decision = getWalletCryptoSendExecutionDecision(canonicalUserId);
  if (!decision.allowed) {
    throw new WalletExecutionRolloutError(decision.code ?? 'WALLET_EXECUTION_DISABLED');
  }
  return decision;
}
