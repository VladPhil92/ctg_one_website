const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVM_ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const BASE_UNITS_RE = /^[1-9][0-9]*$/;
const SUPPORTED_CANARY_ASSETS = new Set(['POL', 'CTG', 'USDC', 'USDT']);

export const WALLET_CRYPTO_SEND_EXECUTION_MODE_ENV = 'WALLET_CRYPTO_SEND_EXECUTION_MODE' as const;
export const WALLET_CRYPTO_SEND_CANARY_USER_IDS_ENV = 'WALLET_CRYPTO_SEND_CANARY_USER_IDS' as const;
export const WALLET_CRYPTO_SEND_CANARY_ASSET_SYMBOL_ENV = 'WALLET_CRYPTO_SEND_CANARY_ASSET_SYMBOL' as const;
export const WALLET_CRYPTO_SEND_CANARY_MAX_AMOUNT_BASE_UNITS_ENV = 'WALLET_CRYPTO_SEND_CANARY_MAX_AMOUNT_BASE_UNITS' as const;
export const WALLET_CRYPTO_SEND_CANARY_DESTINATION_ADDRESS_ENV = 'WALLET_CRYPTO_SEND_CANARY_DESTINATION_ADDRESS' as const;

export type WalletCryptoSendExecutionMode = 'disabled' | 'canary';
export type WalletCanaryAssetSymbol = 'POL' | 'CTG' | 'USDC' | 'USDT';

export type WalletCryptoSendExecutionDecision = {
  mode: WalletCryptoSendExecutionMode;
  allowed: boolean;
  code: 'WALLET_EXECUTION_DISABLED' | 'WALLET_EXECUTION_CANARY_NOT_ALLOWED' | null;
};

export type WalletCryptoSendExecutionConfiguration = {
  mode: WalletCryptoSendExecutionMode;
  canaryUserConfigured: boolean;
  canaryGuardrailsConfigured: boolean;
};

export type WalletCryptoSendCanaryGuardrails = {
  assetSymbol: WalletCanaryAssetSymbol;
  maxAmountBaseUnits: string;
  destinationAddress: string;
};

export type WalletCryptoSendCanaryIntent = {
  assetSymbol: string;
  amountBaseUnits: string;
  destinationAddress: string;
};

type WalletExecutionRolloutErrorCode =
  | 'WALLET_EXECUTION_CONFIG_INVALID'
  | 'WALLET_EXECUTION_DISABLED'
  | 'WALLET_EXECUTION_CANARY_NOT_ALLOWED'
  | 'WALLET_EXECUTION_CANARY_GUARDRAILS_NOT_CONFIGURED'
  | 'WALLET_EXECUTION_CANARY_ASSET_NOT_ALLOWED'
  | 'WALLET_EXECUTION_CANARY_AMOUNT_EXCEEDED'
  | 'WALLET_EXECUTION_CANARY_DESTINATION_NOT_ALLOWED';

export class WalletExecutionRolloutError extends Error {
  constructor(public readonly code: WalletExecutionRolloutErrorCode) {
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

function readCanaryGuardrails(): WalletCryptoSendCanaryGuardrails | null {
  const rawAsset = process.env[WALLET_CRYPTO_SEND_CANARY_ASSET_SYMBOL_ENV]?.trim().toUpperCase() ?? '';
  const rawAmount = process.env[WALLET_CRYPTO_SEND_CANARY_MAX_AMOUNT_BASE_UNITS_ENV]?.trim() ?? '';
  const rawDestination = process.env[WALLET_CRYPTO_SEND_CANARY_DESTINATION_ADDRESS_ENV]?.trim().toLowerCase() ?? '';

  if (!rawAsset && !rawAmount && !rawDestination) return null;
  if (!rawAsset || !rawAmount || !rawDestination) {
    throw new WalletExecutionRolloutError('WALLET_EXECUTION_CONFIG_INVALID');
  }
  if (!SUPPORTED_CANARY_ASSETS.has(rawAsset)) {
    throw new WalletExecutionRolloutError('WALLET_EXECUTION_CONFIG_INVALID');
  }
  if (!BASE_UNITS_RE.test(rawAmount) || rawAmount.length > 78) {
    throw new WalletExecutionRolloutError('WALLET_EXECUTION_CONFIG_INVALID');
  }
  if (!EVM_ADDRESS_RE.test(rawDestination)) {
    throw new WalletExecutionRolloutError('WALLET_EXECUTION_CONFIG_INVALID');
  }

  return {
    assetSymbol: rawAsset as WalletCanaryAssetSymbol,
    maxAmountBaseUnits: rawAmount,
    destinationAddress: rawDestination,
  };
}

/**
 * Returns only the execution configuration relevant to the authenticated
 * canonical user. The full allowlist and exact guardrail values are never
 * exposed to callers.
 */
export function inspectWalletCryptoSendExecutionConfiguration(
  canonicalUserId: string,
): WalletCryptoSendExecutionConfiguration {
  const userId = normalizeCanonicalUserId(canonicalUserId);
  const mode = readExecutionMode();
  const canaryUserIds = readCanaryUserIds();
  const guardrails = readCanaryGuardrails();
  return {
    mode,
    canaryUserConfigured: canaryUserIds.has(userId),
    canaryGuardrailsConfigured: guardrails !== null,
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

/**
 * Enforces the first real-money canary exposure boundary from server-only
 * configuration. The reviewed canary is restricted to one asset, one exact
 * destination and an upper bound expressed in that asset's base units.
 */
export function assertWalletCryptoSendCanaryIntentAllowed(
  intent: WalletCryptoSendCanaryIntent,
): WalletCryptoSendCanaryGuardrails {
  const guardrails = readCanaryGuardrails();
  if (!guardrails) {
    throw new WalletExecutionRolloutError('WALLET_EXECUTION_CANARY_GUARDRAILS_NOT_CONFIGURED');
  }

  const assetSymbol = intent.assetSymbol.trim().toUpperCase();
  const amountBaseUnits = intent.amountBaseUnits.trim();
  const destinationAddress = intent.destinationAddress.trim().toLowerCase();

  if (!SUPPORTED_CANARY_ASSETS.has(assetSymbol) || assetSymbol !== guardrails.assetSymbol) {
    throw new WalletExecutionRolloutError('WALLET_EXECUTION_CANARY_ASSET_NOT_ALLOWED');
  }
  if (!BASE_UNITS_RE.test(amountBaseUnits) || amountBaseUnits.length > 78) {
    throw new WalletExecutionRolloutError('WALLET_EXECUTION_CONFIG_INVALID');
  }
  if (BigInt(amountBaseUnits) > BigInt(guardrails.maxAmountBaseUnits)) {
    throw new WalletExecutionRolloutError('WALLET_EXECUTION_CANARY_AMOUNT_EXCEEDED');
  }
  if (!EVM_ADDRESS_RE.test(destinationAddress) || destinationAddress !== guardrails.destinationAddress) {
    throw new WalletExecutionRolloutError('WALLET_EXECUTION_CANARY_DESTINATION_NOT_ALLOWED');
  }

  return guardrails;
}
