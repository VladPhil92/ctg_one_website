import 'server-only';

export const WALLET_CANARY_PREFLIGHT_VERSION = 'ctg-wallet-canary-preflight-v1' as const;
export const WALLET_CANARY_POLYGON_CHAIN_ID = 137 as const;
export const WALLET_CANARY_DEFAULT_MIN_CONFIRMATIONS = 12 as const;

const EVM_ADDRESS_RE = /^0x[0-9a-f]{40}$/i;
const HEX_RE = /^0x[0-9a-f]+$/i;
const RPC_TIMEOUT_MS = 8_000;
const BIGINT_ZERO = BigInt(0);

type JsonRpcEnvelope = {
  jsonrpc?: unknown;
  id?: unknown;
  result?: unknown;
  error?: unknown;
};

export type WalletCanaryInfrastructureSnapshot = {
  chainId: 137;
  observedBlockNumber: number;
  gasPriceAvailable: boolean;
  hasNativeGasBalance: boolean;
  minConfirmations: number;
};

export class WalletCanaryPreflightError extends Error {
  constructor(
    public readonly code:
      | 'WALLET_CANARY_PREFLIGHT_CONFIG_INVALID'
      | 'WALLET_CANARY_PREFLIGHT_RPC_UNAVAILABLE'
      | 'WALLET_CANARY_PREFLIGHT_RPC_INSECURE'
      | 'WALLET_CANARY_PREFLIGHT_RPC_FAILED'
      | 'WALLET_CANARY_PREFLIGHT_RPC_RESPONSE_INVALID'
      | 'WALLET_CANARY_PREFLIGHT_CHAIN_MISMATCH'
      | 'WALLET_CANARY_PREFLIGHT_WALLET_INVALID',
  ) {
    super(code);
    this.name = 'WalletCanaryPreflightError';
  }
}

function readPolygonRpcUrl() {
  const raw = process.env.POLYGON_RPC_URL?.trim();
  if (!raw) throw new WalletCanaryPreflightError('WALLET_CANARY_PREFLIGHT_RPC_UNAVAILABLE');

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new WalletCanaryPreflightError('WALLET_CANARY_PREFLIGHT_CONFIG_INVALID');
  }

  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new WalletCanaryPreflightError('WALLET_CANARY_PREFLIGHT_RPC_INSECURE');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new WalletCanaryPreflightError('WALLET_CANARY_PREFLIGHT_CONFIG_INVALID');
  }

  return url.toString();
}

function readMinConfirmations() {
  const raw = process.env.WALLET_POLYGON_MIN_CONFIRMATIONS?.trim();
  if (!raw) return WALLET_CANARY_DEFAULT_MIN_CONFIRMATIONS;
  if (!/^[1-9][0-9]*$/.test(raw)) {
    throw new WalletCanaryPreflightError('WALLET_CANARY_PREFLIGHT_CONFIG_INVALID');
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > 256) {
    throw new WalletCanaryPreflightError('WALLET_CANARY_PREFLIGHT_CONFIG_INVALID');
  }
  return value;
}

function parseHexBigInt(value: unknown) {
  if (typeof value !== 'string' || !HEX_RE.test(value)) {
    throw new WalletCanaryPreflightError('WALLET_CANARY_PREFLIGHT_RPC_RESPONSE_INVALID');
  }
  try {
    return BigInt(value);
  } catch {
    throw new WalletCanaryPreflightError('WALLET_CANARY_PREFLIGHT_RPC_RESPONSE_INVALID');
  }
}

function parseSafeHexNumber(value: unknown) {
  const parsed = parseHexBigInt(value);
  if (parsed < BIGINT_ZERO || parsed > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new WalletCanaryPreflightError('WALLET_CANARY_PREFLIGHT_RPC_RESPONSE_INVALID');
  }
  return Number(parsed);
}

async function polygonRpc(method: string, params: unknown[]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    const response = await fetch(readPolygonRpcUrl(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'error',
    });

    if (!response.ok) {
      throw new WalletCanaryPreflightError('WALLET_CANARY_PREFLIGHT_RPC_FAILED');
    }

    const payload = await response.json() as JsonRpcEnvelope;
    if (
      payload.jsonrpc !== '2.0'
      || payload.id !== 1
      || payload.error
      || payload.result === undefined
    ) {
      throw new WalletCanaryPreflightError('WALLET_CANARY_PREFLIGHT_RPC_RESPONSE_INVALID');
    }
    return payload.result;
  } catch (error) {
    if (error instanceof WalletCanaryPreflightError) throw error;
    throw new WalletCanaryPreflightError('WALLET_CANARY_PREFLIGHT_RPC_FAILED');
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Read-only Polygon infrastructure probe used before activating the first real
 * crypto-send canary. It never signs, sends, broadcasts or mutates wallet data.
 */
export async function probePolygonCanaryInfrastructureV1(
  fromAddress: string,
): Promise<WalletCanaryInfrastructureSnapshot> {
  const normalizedAddress = fromAddress.trim().toLowerCase();
  if (!EVM_ADDRESS_RE.test(normalizedAddress)) {
    throw new WalletCanaryPreflightError('WALLET_CANARY_PREFLIGHT_WALLET_INVALID');
  }

  const chainId = parseSafeHexNumber(await polygonRpc('eth_chainId', []));
  if (chainId !== WALLET_CANARY_POLYGON_CHAIN_ID) {
    throw new WalletCanaryPreflightError('WALLET_CANARY_PREFLIGHT_CHAIN_MISMATCH');
  }

  const [blockRaw, gasPriceRaw, balanceRaw] = await Promise.all([
    polygonRpc('eth_blockNumber', []),
    polygonRpc('eth_gasPrice', []),
    polygonRpc('eth_getBalance', [normalizedAddress, 'latest']),
  ]);

  const observedBlockNumber = parseSafeHexNumber(blockRaw);
  const gasPrice = parseHexBigInt(gasPriceRaw);
  const nativeBalance = parseHexBigInt(balanceRaw);

  if (observedBlockNumber < 1 || gasPrice <= BIGINT_ZERO) {
    throw new WalletCanaryPreflightError('WALLET_CANARY_PREFLIGHT_RPC_RESPONSE_INVALID');
  }

  return {
    chainId: WALLET_CANARY_POLYGON_CHAIN_ID,
    observedBlockNumber,
    gasPriceAvailable: true,
    hasNativeGasBalance: nativeBalance > BIGINT_ZERO,
    minConfirmations: readMinConfirmations(),
  };
}
