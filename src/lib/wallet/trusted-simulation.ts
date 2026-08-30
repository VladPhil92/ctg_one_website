import 'server-only';

import { createHash } from 'node:crypto';
import { Interface } from 'ethers';

export const WALLET_TRUSTED_SIMULATION_VERSION = 'ctg-wallet-trusted-simulation-v1' as const;
export const WALLET_POLYGON_CHAIN_ID = 137 as const;

const ERC20_TRANSFER = new Interface([
  'function transfer(address to, uint256 amount) returns (bool)',
]);
const EVM_ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const BASE_UNITS_RE = /^[1-9][0-9]*$/;
const HEX_QUANTITY_RE = /^0x[0-9a-f]+$/i;
const SUPPORTED_ASSETS = new Set(['POL', 'CTG', 'USDC', 'USDT']);
const TOKEN_CONTRACTS = {
  CTG: '0xe4200d6bed0db8e720cbb840c572182676515132',
  USDC: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
  USDT: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
} as const;

export class WalletTrustedSimulationError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'WalletTrustedSimulationError';
  }
}

export interface TrustedWalletIntentInput {
  intentId: string;
  canonicalUserId: string;
  chainId: number;
  assetSymbol: string;
  amountBaseUnits: string;
  destinationAddress: string;
  fromAddress: string;
}

export interface TrustedWalletSimulationEvidence {
  version: typeof WALLET_TRUSTED_SIMULATION_VERSION;
  intentId: string;
  canonicalUserId: string;
  chainId: typeof WALLET_POLYGON_CHAIN_ID;
  assetSymbol: 'POL' | 'CTG' | 'USDC' | 'USDT';
  amountBaseUnits: string;
  destinationAddress: string;
  fromAddress: string;
  transaction: {
    to: string;
    value: string;
    data: string;
  };
  blockNumber: string;
  estimatedGas: string;
  quotedGasPrice: string;
  observedNativeBalance: string;
  requiredNativeReserve: string;
  callResult: string;
}

export interface TrustedWalletSimulationResult {
  simulationDigestSha256: string;
  evidence: TrustedWalletSimulationEvidence;
}

type JsonRpcResponse = {
  jsonrpc?: unknown;
  id?: unknown;
  result?: unknown;
  error?: { code?: unknown; message?: unknown } | null;
};

function requireTrustedPolygonRpcUrl() {
  const configured = process.env.POLYGON_RPC_URL?.trim() ?? '';
  if (!configured) {
    throw new WalletTrustedSimulationError('WALLET_AUTH_TRUSTED_RPC_UNAVAILABLE');
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new WalletTrustedSimulationError('WALLET_AUTH_TRUSTED_RPC_INVALID');
  }

  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new WalletTrustedSimulationError('WALLET_AUTH_TRUSTED_RPC_INSECURE');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new WalletTrustedSimulationError('WALLET_AUTH_TRUSTED_RPC_INVALID');
  }

  return url.toString();
}

function normalizeInput(input: TrustedWalletIntentInput) {
  const assetSymbol = input.assetSymbol.trim().toUpperCase();
  const amountBaseUnits = input.amountBaseUnits.trim();
  const destinationAddress = input.destinationAddress.trim().toLowerCase();
  const fromAddress = input.fromAddress.trim().toLowerCase();

  if (input.chainId !== WALLET_POLYGON_CHAIN_ID) {
    throw new WalletTrustedSimulationError('WALLET_AUTH_CHAIN_UNSUPPORTED');
  }
  if (!SUPPORTED_ASSETS.has(assetSymbol)) {
    throw new WalletTrustedSimulationError('WALLET_AUTH_ASSET_UNSUPPORTED');
  }
  if (!BASE_UNITS_RE.test(amountBaseUnits) || amountBaseUnits.length > 78) {
    throw new WalletTrustedSimulationError('WALLET_AUTH_AMOUNT_INVALID');
  }
  if (!EVM_ADDRESS_RE.test(destinationAddress) || !EVM_ADDRESS_RE.test(fromAddress)) {
    throw new WalletTrustedSimulationError('WALLET_AUTH_ADDRESS_INVALID');
  }

  return {
    ...input,
    chainId: WALLET_POLYGON_CHAIN_ID,
    assetSymbol: assetSymbol as 'POL' | 'CTG' | 'USDC' | 'USDT',
    amountBaseUnits,
    destinationAddress,
    fromAddress,
  };
}

function toRpcQuantity(value: bigint) {
  return `0x${value.toString(16)}`;
}

function parseRpcQuantity(value: unknown, code: string) {
  if (typeof value !== 'string' || !HEX_QUANTITY_RE.test(value)) {
    throw new WalletTrustedSimulationError(code);
  }
  try {
    return BigInt(value);
  } catch {
    throw new WalletTrustedSimulationError(code);
  }
}

async function rpcCall(rpcUrl: string, id: number, method: string, params: unknown[]) {
  let response: Response;
  try {
    response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new WalletTrustedSimulationError('WALLET_AUTH_TRUSTED_RPC_FAILED');
  }

  if (!response.ok) {
    throw new WalletTrustedSimulationError('WALLET_AUTH_TRUSTED_RPC_FAILED');
  }

  let body: JsonRpcResponse;
  try {
    body = await response.json() as JsonRpcResponse;
  } catch {
    throw new WalletTrustedSimulationError('WALLET_AUTH_TRUSTED_RPC_RESPONSE_INVALID');
  }

  if (body.error || body.id !== id || body.jsonrpc !== '2.0') {
    throw new WalletTrustedSimulationError('WALLET_AUTH_TRUSTED_RPC_REJECTED');
  }

  return body.result;
}

function buildTransaction(input: ReturnType<typeof normalizeInput>) {
  const amount = BigInt(input.amountBaseUnits);
  if (input.assetSymbol === 'POL') {
    return {
      to: input.destinationAddress,
      value: toRpcQuantity(amount),
      data: '0x',
    };
  }

  const contract = TOKEN_CONTRACTS[input.assetSymbol];
  return {
    to: contract,
    value: '0x0',
    data: ERC20_TRANSFER.encodeFunctionData('transfer', [input.destinationAddress, amount]),
  };
}

function canonicalEvidenceJson(evidence: TrustedWalletSimulationEvidence) {
  return JSON.stringify({
    version: evidence.version,
    intentId: evidence.intentId,
    canonicalUserId: evidence.canonicalUserId,
    chainId: evidence.chainId,
    assetSymbol: evidence.assetSymbol,
    amountBaseUnits: evidence.amountBaseUnits,
    destinationAddress: evidence.destinationAddress,
    fromAddress: evidence.fromAddress,
    transaction: evidence.transaction,
    blockNumber: evidence.blockNumber,
    estimatedGas: evidence.estimatedGas,
    quotedGasPrice: evidence.quotedGasPrice,
    observedNativeBalance: evidence.observedNativeBalance,
    requiredNativeReserve: evidence.requiredNativeReserve,
    callResult: evidence.callResult,
  });
}

/**
 * Independently simulates the immutable intent on Polygon from the server-side
 * trusted RPC endpoint. The browser cannot choose the RPC URL, signer address,
 * transaction calldata, amount or digest accepted by the authorization command.
 */
export async function simulateTrustedWalletIntentV1(
  rawInput: TrustedWalletIntentInput,
): Promise<TrustedWalletSimulationResult> {
  const input = normalizeInput(rawInput);
  const rpcUrl = requireTrustedPolygonRpcUrl();
  const transaction = buildTransaction(input);
  const rpcTransaction = {
    from: input.fromAddress,
    to: transaction.to,
    value: transaction.value,
    data: transaction.data,
  };

  const chainId = parseRpcQuantity(
    await rpcCall(rpcUrl, 1, 'eth_chainId', []),
    'WALLET_AUTH_TRUSTED_CHAIN_INVALID',
  );
  if (chainId !== BigInt(WALLET_POLYGON_CHAIN_ID)) {
    throw new WalletTrustedSimulationError('WALLET_AUTH_TRUSTED_CHAIN_MISMATCH');
  }

  const [callResultRaw, gasRaw, balanceRaw, blockRaw, gasPriceRaw] = await Promise.all([
    rpcCall(rpcUrl, 2, 'eth_call', [rpcTransaction, 'latest']),
    rpcCall(rpcUrl, 3, 'eth_estimateGas', [rpcTransaction]),
    rpcCall(rpcUrl, 4, 'eth_getBalance', [input.fromAddress, 'latest']),
    rpcCall(rpcUrl, 5, 'eth_blockNumber', []),
    rpcCall(rpcUrl, 6, 'eth_gasPrice', []),
  ]);

  if (typeof callResultRaw !== 'string' || !/^0x[0-9a-f]*$/i.test(callResultRaw)) {
    throw new WalletTrustedSimulationError('WALLET_AUTH_TRUSTED_CALL_RESULT_INVALID');
  }

  if (input.assetSymbol !== 'POL') {
    try {
      const [ok] = ERC20_TRANSFER.decodeFunctionResult('transfer', callResultRaw);
      if (ok !== true) throw new Error('transfer returned false');
    } catch {
      throw new WalletTrustedSimulationError('WALLET_AUTH_TRUSTED_TOKEN_CALL_REJECTED');
    }
  }

  const estimatedGas = parseRpcQuantity(gasRaw, 'WALLET_AUTH_TRUSTED_GAS_INVALID');
  const nativeBalance = parseRpcQuantity(balanceRaw, 'WALLET_AUTH_TRUSTED_BALANCE_INVALID');
  const blockNumber = parseRpcQuantity(blockRaw, 'WALLET_AUTH_TRUSTED_BLOCK_INVALID');
  const gasPrice = parseRpcQuantity(gasPriceRaw, 'WALLET_AUTH_TRUSTED_GAS_PRICE_INVALID');

  if (estimatedGas <= 0n || blockNumber <= 0n || gasPrice <= 0n) {
    throw new WalletTrustedSimulationError('WALLET_AUTH_TRUSTED_SIMULATION_INVALID');
  }

  const nativeValue = input.assetSymbol === 'POL' ? BigInt(input.amountBaseUnits) : 0n;
  const requiredNativeReserve = nativeValue + (estimatedGas * gasPrice);
  if (nativeBalance < requiredNativeReserve) {
    throw new WalletTrustedSimulationError('WALLET_AUTH_TRUSTED_NATIVE_BALANCE_INSUFFICIENT');
  }

  const evidence: TrustedWalletSimulationEvidence = {
    version: WALLET_TRUSTED_SIMULATION_VERSION,
    intentId: input.intentId,
    canonicalUserId: input.canonicalUserId,
    chainId: WALLET_POLYGON_CHAIN_ID,
    assetSymbol: input.assetSymbol,
    amountBaseUnits: input.amountBaseUnits,
    destinationAddress: input.destinationAddress,
    fromAddress: input.fromAddress,
    transaction,
    blockNumber: blockNumber.toString(),
    estimatedGas: estimatedGas.toString(),
    quotedGasPrice: gasPrice.toString(),
    observedNativeBalance: nativeBalance.toString(),
    requiredNativeReserve: requiredNativeReserve.toString(),
    callResult: callResultRaw.toLowerCase(),
  };

  return {
    evidence,
    simulationDigestSha256: createHash('sha256').update(canonicalEvidenceJson(evidence)).digest('hex'),
  };
}
