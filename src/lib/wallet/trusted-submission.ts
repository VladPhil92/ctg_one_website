import 'server-only';

import { Interface } from 'ethers';

export const WALLET_SUBMISSION_VERSION = 'ctg-wallet-submission-v1' as const;
export const WALLET_POLYGON_CHAIN_ID = 137 as const;

const ERC20_TRANSFER = new Interface([
  'function transfer(address to, uint256 amount) returns (bool)',
]);
const EVM_ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const TX_HASH_RE = /^0x[0-9a-f]{64}$/;
const BASE_UNITS_RE = /^[1-9][0-9]*$/;
const HEX_QUANTITY_RE = /^0x[0-9a-f]+$/i;
const SUPPORTED_ASSETS = new Set(['POL', 'CTG', 'USDC', 'USDT']);
const TOKEN_CONTRACTS = {
  CTG: '0xe4200d6bed0db8e720cbb840c572182676515132',
  USDC: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
  USDT: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
} as const;

export class WalletTrustedSubmissionError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'WalletTrustedSubmissionError';
  }
}

export interface TrustedWalletSubmissionInput {
  txHash: string;
  chainId: number;
  assetSymbol: string;
  amountBaseUnits: string;
  destinationAddress: string;
  fromAddress: string;
}

type JsonRpcResponse = {
  jsonrpc?: unknown;
  id?: unknown;
  result?: unknown;
  error?: { code?: unknown; message?: unknown } | null;
};

type TransactionResult = {
  hash?: unknown;
  from?: unknown;
  to?: unknown;
  input?: unknown;
  value?: unknown;
};

function requireTrustedPolygonRpcUrl() {
  const configured = process.env.POLYGON_RPC_URL?.trim() ?? '';
  if (!configured) throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_RPC_UNAVAILABLE');

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_RPC_INVALID');
  }

  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_RPC_INSECURE');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_RPC_INVALID');
  }
  return url.toString();
}

function normalizeInput(input: TrustedWalletSubmissionInput) {
  const txHash = input.txHash.trim().toLowerCase();
  const assetSymbol = input.assetSymbol.trim().toUpperCase();
  const amountBaseUnits = input.amountBaseUnits.trim();
  const destinationAddress = input.destinationAddress.trim().toLowerCase();
  const fromAddress = input.fromAddress.trim().toLowerCase();

  if (!TX_HASH_RE.test(txHash)) throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_TX_HASH_INVALID');
  if (input.chainId !== WALLET_POLYGON_CHAIN_ID) throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_CHAIN_UNSUPPORTED');
  if (!SUPPORTED_ASSETS.has(assetSymbol)) throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_ASSET_UNSUPPORTED');
  if (!BASE_UNITS_RE.test(amountBaseUnits) || amountBaseUnits.length > 78) {
    throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_AMOUNT_INVALID');
  }
  if (!EVM_ADDRESS_RE.test(destinationAddress) || !EVM_ADDRESS_RE.test(fromAddress)) {
    throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_ADDRESS_INVALID');
  }

  return {
    txHash,
    chainId: WALLET_POLYGON_CHAIN_ID,
    assetSymbol: assetSymbol as 'POL' | 'CTG' | 'USDC' | 'USDT',
    amountBaseUnits,
    destinationAddress,
    fromAddress,
  };
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
    throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_RPC_FAILED');
  }

  if (!response.ok) throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_RPC_FAILED');

  let body: JsonRpcResponse;
  try {
    body = await response.json() as JsonRpcResponse;
  } catch {
    throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_RPC_RESPONSE_INVALID');
  }

  if (body.error || body.id !== id || body.jsonrpc !== '2.0') {
    throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_RPC_REJECTED');
  }
  return body.result;
}

function parseRpcQuantity(value: unknown, code: string) {
  if (typeof value !== 'string' || !HEX_QUANTITY_RE.test(value)) {
    throw new WalletTrustedSubmissionError(code);
  }
  try {
    return BigInt(value);
  } catch {
    throw new WalletTrustedSubmissionError(code);
  }
}

function expectedTransaction(input: ReturnType<typeof normalizeInput>) {
  const amount = BigInt(input.amountBaseUnits);
  if (input.assetSymbol === 'POL') {
    return {
      to: input.destinationAddress,
      value: amount,
      input: '0x',
    };
  }

  const contract = TOKEN_CONTRACTS[input.assetSymbol];
  return {
    to: contract,
    value: BigInt(0),
    input: ERC20_TRANSFER.encodeFunctionData('transfer', [input.destinationAddress, amount]).toLowerCase(),
  };
}

/**
 * Verifies that a hash already broadcast by the user's verified embedded Privy
 * signer represents exactly the authorized immutable Polygon transfer. This
 * helper never signs, broadcasts, waits for confirmation or mutates financial
 * state. If propagation has not reached the trusted RPC yet, callers must retry
 * registration of the same hash and must never ask the client to rebroadcast.
 */
export async function verifyTrustedWalletSubmissionV1(rawInput: TrustedWalletSubmissionInput) {
  const input = normalizeInput(rawInput);
  const rpcUrl = requireTrustedPolygonRpcUrl();
  const chainId = parseRpcQuantity(
    await rpcCall(rpcUrl, 1, 'eth_chainId', []),
    'WALLET_SUBMISSION_CHAIN_INVALID',
  );
  if (chainId !== BigInt(WALLET_POLYGON_CHAIN_ID)) {
    throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_CHAIN_MISMATCH');
  }

  const rawTransaction = await rpcCall(rpcUrl, 2, 'eth_getTransactionByHash', [input.txHash]);
  if (rawTransaction === null) {
    throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_TX_NOT_PROPAGATED');
  }
  if (typeof rawTransaction !== 'object' || rawTransaction === null || Array.isArray(rawTransaction)) {
    throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_TX_RESPONSE_INVALID');
  }

  const tx = rawTransaction as TransactionResult;
  const hash = typeof tx.hash === 'string' ? tx.hash.toLowerCase() : '';
  const from = typeof tx.from === 'string' ? tx.from.toLowerCase() : '';
  const to = typeof tx.to === 'string' ? tx.to.toLowerCase() : '';
  const callData = typeof tx.input === 'string' ? tx.input.toLowerCase() : '';
  const value = parseRpcQuantity(tx.value, 'WALLET_SUBMISSION_TX_VALUE_INVALID');
  const expected = expectedTransaction(input);

  if (hash !== input.txHash) throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_HASH_MISMATCH');
  if (from !== input.fromAddress) throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_SIGNER_MISMATCH');
  if (to !== expected.to) throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_TO_MISMATCH');
  if (value !== expected.value) throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_VALUE_MISMATCH');
  if (callData !== expected.input) throw new WalletTrustedSubmissionError('WALLET_SUBMISSION_CALLDATA_MISMATCH');

  return {
    version: WALLET_SUBMISSION_VERSION,
    txHash: input.txHash,
    fromAddress: input.fromAddress,
  };
}
