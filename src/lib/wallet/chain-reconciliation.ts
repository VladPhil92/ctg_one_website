import 'server-only';

import { createHash } from 'node:crypto';
import { Interface } from 'ethers';

export const WALLET_CHAIN_SUBMISSION_VERSION = 'ctg-wallet-chain-submission-v1' as const;
export const WALLET_CHAIN_RECONCILIATION_VERSION = 'ctg-wallet-chain-reconciliation-v1' as const;
export const WALLET_CHAIN_POLYGON_ID = 137 as const;
export const WALLET_CHAIN_DEFAULT_MIN_CONFIRMATIONS = 12 as const;

const ERC20_TRANSFER = new Interface([
  'function transfer(address to, uint256 amount) returns (bool)',
]);
const EVM_ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const TX_HASH_RE = /^0x[0-9a-f]{64}$/;
const BASE_UNITS_RE = /^[1-9][0-9]*$/;
const HEX_QUANTITY_RE = /^0x[0-9a-f]+$/i;
const HEX_DATA_RE = /^0x[0-9a-f]*$/i;
const SUPPORTED_ASSETS = new Set(['POL', 'CTG', 'USDC', 'USDT']);

// Must remain aligned with the exact token contracts used by trusted-simulation.ts.
// The reconciliation adapter validates what was actually mined against the same
// immutable transfer semantics that were simulated before authorization.
const TOKEN_CONTRACTS = {
  CTG: '0xe4200d6bed0db8e720cbb840c572182676515132',
  USDC: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
  USDT: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
} as const;

export type WalletChainObservationStatus =
  | 'pending_external'
  | 'confirmed_external'
  | 'reconciled'
  | 'failed';

export class WalletChainReconciliationError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'WalletChainReconciliationError';
  }
}

export interface WalletChainIntentInput {
  intentId: string;
  canonicalUserId: string;
  txHash: string;
  chainId: number;
  assetSymbol: string;
  amountBaseUnits: string;
  destinationAddress: string;
  authorizedWalletAddress: string;
}

export interface WalletChainObservation {
  version: typeof WALLET_CHAIN_RECONCILIATION_VERSION;
  status: WalletChainObservationStatus;
  evidenceDigestSha256: string;
  chainObserved: boolean;
  blockNumber: number | null;
  confirmations: number | null;
  failureCode: string | null;
  evidence: {
    intentId: string;
    canonicalUserId: string;
    txHash: string;
    chainId: typeof WALLET_CHAIN_POLYGON_ID;
    assetSymbol: 'POL' | 'CTG' | 'USDC' | 'USDT';
    amountBaseUnits: string;
    destinationAddress: string;
    authorizedWalletAddress: string;
    minConfirmations: number;
    transactionFound: boolean;
    receiptFound: boolean;
    observedFrom: string | null;
    observedTo: string | null;
    observedValue: string | null;
    observedInput: string | null;
    receiptStatus: 'success' | 'reverted' | null;
    blockNumber: number | null;
    latestBlockNumber: number | null;
    confirmations: number | null;
    failureCode: string | null;
  };
}

type JsonRpcResponse = {
  jsonrpc?: unknown;
  id?: unknown;
  result?: unknown;
  error?: { code?: unknown; message?: unknown } | null;
};

type RpcTransaction = {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  input: string;
  blockNumber: string | null;
};

type RpcReceipt = {
  transactionHash: string;
  from: string;
  to: string | null;
  status: string;
  blockNumber: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireTrustedPolygonRpcUrl() {
  const configured = process.env.POLYGON_RPC_URL?.trim() ?? '';
  if (!configured) throw new WalletChainReconciliationError('WALLET_CHAIN_RPC_UNAVAILABLE');

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new WalletChainReconciliationError('WALLET_CHAIN_RPC_INVALID');
  }

  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new WalletChainReconciliationError('WALLET_CHAIN_RPC_INSECURE');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new WalletChainReconciliationError('WALLET_CHAIN_RPC_INVALID');
  }
  return url.toString();
}

function configuredMinConfirmations() {
  const raw = process.env.WALLET_POLYGON_MIN_CONFIRMATIONS?.trim();
  if (!raw) return WALLET_CHAIN_DEFAULT_MIN_CONFIRMATIONS;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 256) {
    throw new WalletChainReconciliationError('WALLET_CHAIN_CONFIRMATION_CONFIG_INVALID');
  }
  return parsed;
}

function normalizeInput(input: WalletChainIntentInput) {
  const txHash = input.txHash.trim().toLowerCase();
  const assetSymbol = input.assetSymbol.trim().toUpperCase();
  const amountBaseUnits = input.amountBaseUnits.trim();
  const destinationAddress = input.destinationAddress.trim().toLowerCase();
  const authorizedWalletAddress = input.authorizedWalletAddress.trim().toLowerCase();

  if (input.chainId !== WALLET_CHAIN_POLYGON_ID) {
    throw new WalletChainReconciliationError('WALLET_CHAIN_UNSUPPORTED');
  }
  if (!SUPPORTED_ASSETS.has(assetSymbol)) {
    throw new WalletChainReconciliationError('WALLET_CHAIN_ASSET_UNSUPPORTED');
  }
  if (!TX_HASH_RE.test(txHash)) {
    throw new WalletChainReconciliationError('WALLET_CHAIN_TX_HASH_INVALID');
  }
  if (!BASE_UNITS_RE.test(amountBaseUnits) || amountBaseUnits.length > 78) {
    throw new WalletChainReconciliationError('WALLET_CHAIN_AMOUNT_INVALID');
  }
  if (!EVM_ADDRESS_RE.test(destinationAddress) || !EVM_ADDRESS_RE.test(authorizedWalletAddress)) {
    throw new WalletChainReconciliationError('WALLET_CHAIN_ADDRESS_INVALID');
  }

  return {
    ...input,
    txHash,
    chainId: WALLET_CHAIN_POLYGON_ID,
    assetSymbol: assetSymbol as 'POL' | 'CTG' | 'USDC' | 'USDT',
    amountBaseUnits,
    destinationAddress,
    authorizedWalletAddress,
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
    throw new WalletChainReconciliationError('WALLET_CHAIN_RPC_FAILED');
  }

  if (!response.ok) throw new WalletChainReconciliationError('WALLET_CHAIN_RPC_FAILED');

  let body: JsonRpcResponse;
  try {
    body = await response.json() as JsonRpcResponse;
  } catch {
    throw new WalletChainReconciliationError('WALLET_CHAIN_RPC_RESPONSE_INVALID');
  }

  if (body.error || body.id !== id || body.jsonrpc !== '2.0') {
    throw new WalletChainReconciliationError('WALLET_CHAIN_RPC_REJECTED');
  }
  return body.result;
}

function parseQuantity(value: unknown, code: string) {
  if (typeof value !== 'string' || !HEX_QUANTITY_RE.test(value)) {
    throw new WalletChainReconciliationError(code);
  }
  try {
    return BigInt(value);
  } catch {
    throw new WalletChainReconciliationError(code);
  }
}

function parseNullableAddress(value: unknown, code: string) {
  if (value === null) return null;
  if (typeof value !== 'string') throw new WalletChainReconciliationError(code);
  const normalized = value.toLowerCase();
  if (!EVM_ADDRESS_RE.test(normalized)) throw new WalletChainReconciliationError(code);
  return normalized;
}

function parseTransaction(value: unknown): RpcTransaction | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new WalletChainReconciliationError('WALLET_CHAIN_TRANSACTION_INVALID');

  const hash = typeof value.hash === 'string' ? value.hash.toLowerCase() : '';
  const from = typeof value.from === 'string' ? value.from.toLowerCase() : '';
  const to = parseNullableAddress(value.to, 'WALLET_CHAIN_TRANSACTION_TO_INVALID');
  const txValue = typeof value.value === 'string' ? value.value.toLowerCase() : '';
  const input = typeof value.input === 'string' ? value.input.toLowerCase() : '';
  const blockNumber = value.blockNumber === null
    ? null
    : typeof value.blockNumber === 'string' ? value.blockNumber.toLowerCase() : '__invalid__';

  if (!TX_HASH_RE.test(hash) || !EVM_ADDRESS_RE.test(from)) {
    throw new WalletChainReconciliationError('WALLET_CHAIN_TRANSACTION_INVALID');
  }
  if (!HEX_QUANTITY_RE.test(txValue) || !HEX_DATA_RE.test(input)) {
    throw new WalletChainReconciliationError('WALLET_CHAIN_TRANSACTION_INVALID');
  }
  if (blockNumber !== null && !HEX_QUANTITY_RE.test(blockNumber)) {
    throw new WalletChainReconciliationError('WALLET_CHAIN_TRANSACTION_BLOCK_INVALID');
  }

  return { hash, from, to, value: txValue, input, blockNumber };
}

function parseReceipt(value: unknown): RpcReceipt | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new WalletChainReconciliationError('WALLET_CHAIN_RECEIPT_INVALID');

  const transactionHash = typeof value.transactionHash === 'string' ? value.transactionHash.toLowerCase() : '';
  const from = typeof value.from === 'string' ? value.from.toLowerCase() : '';
  const to = parseNullableAddress(value.to, 'WALLET_CHAIN_RECEIPT_TO_INVALID');
  const status = typeof value.status === 'string' ? value.status.toLowerCase() : '';
  const blockNumber = typeof value.blockNumber === 'string' ? value.blockNumber.toLowerCase() : '';

  if (!TX_HASH_RE.test(transactionHash) || !EVM_ADDRESS_RE.test(from)) {
    throw new WalletChainReconciliationError('WALLET_CHAIN_RECEIPT_INVALID');
  }
  if (!HEX_QUANTITY_RE.test(status) || !HEX_QUANTITY_RE.test(blockNumber)) {
    throw new WalletChainReconciliationError('WALLET_CHAIN_RECEIPT_INVALID');
  }

  return { transactionHash, from, to, status, blockNumber };
}

function transactionMatchesIntent(
  input: ReturnType<typeof normalizeInput>,
  transaction: RpcTransaction,
) {
  if (transaction.hash !== input.txHash || transaction.from !== input.authorizedWalletAddress) return false;

  const value = parseQuantity(transaction.value, 'WALLET_CHAIN_TRANSACTION_VALUE_INVALID');
  const amount = BigInt(input.amountBaseUnits);
  const zero = BigInt(0);

  if (input.assetSymbol === 'POL') {
    return transaction.to === input.destinationAddress
      && value === amount
      && transaction.input === '0x';
  }

  const tokenContract = TOKEN_CONTRACTS[input.assetSymbol];
  if (transaction.to !== tokenContract || value !== zero) return false;

  try {
    const [destination, decodedAmount] = ERC20_TRANSFER.decodeFunctionData('transfer', transaction.input);
    return String(destination).toLowerCase() === input.destinationAddress
      && BigInt(decodedAmount.toString()) === amount;
  } catch {
    return false;
  }
}

function canonicalEvidenceJson(evidence: WalletChainObservation['evidence']) {
  return JSON.stringify(evidence);
}

function finalizeObservation(
  evidence: WalletChainObservation['evidence'],
  status: WalletChainObservationStatus,
): WalletChainObservation {
  return {
    version: WALLET_CHAIN_RECONCILIATION_VERSION,
    status,
    evidenceDigestSha256: createHash('sha256').update(canonicalEvidenceJson(evidence)).digest('hex'),
    chainObserved: evidence.transactionFound,
    blockNumber: evidence.blockNumber,
    confirmations: evidence.confirmations,
    failureCode: evidence.failureCode,
    evidence,
  };
}

function toSafeBlockNumber(value: bigint, code: string) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new WalletChainReconciliationError(code);
  }
  return number;
}

/**
 * Independently inspects the transaction/receipt from the trusted Polygon RPC.
 * Browser input is limited to the already-registered hash; every immutable
 * transfer field is re-derived from the durable authorized intent.
 */
export async function inspectPolygonWalletIntentV1(
  rawInput: WalletChainIntentInput,
): Promise<WalletChainObservation> {
  const input = normalizeInput(rawInput);
  const rpcUrl = requireTrustedPolygonRpcUrl();
  const minConfirmations = configuredMinConfirmations();

  const chainId = parseQuantity(
    await rpcCall(rpcUrl, 1, 'eth_chainId', []),
    'WALLET_CHAIN_RPC_CHAIN_INVALID',
  );
  if (chainId !== BigInt(WALLET_CHAIN_POLYGON_ID)) {
    throw new WalletChainReconciliationError('WALLET_CHAIN_RPC_CHAIN_MISMATCH');
  }

  const transaction = parseTransaction(
    await rpcCall(rpcUrl, 2, 'eth_getTransactionByHash', [input.txHash]),
  );

  const baseEvidence: WalletChainObservation['evidence'] = {
    intentId: input.intentId,
    canonicalUserId: input.canonicalUserId,
    txHash: input.txHash,
    chainId: WALLET_CHAIN_POLYGON_ID,
    assetSymbol: input.assetSymbol,
    amountBaseUnits: input.amountBaseUnits,
    destinationAddress: input.destinationAddress,
    authorizedWalletAddress: input.authorizedWalletAddress,
    minConfirmations,
    transactionFound: transaction !== null,
    receiptFound: false,
    observedFrom: transaction?.from ?? null,
    observedTo: transaction?.to ?? null,
    observedValue: transaction?.value ?? null,
    observedInput: transaction?.input ?? null,
    receiptStatus: null,
    blockNumber: null,
    latestBlockNumber: null,
    confirmations: null,
    failureCode: null,
  };

  if (!transaction) return finalizeObservation(baseEvidence, 'pending_external');

  if (!transactionMatchesIntent(input, transaction)) {
    return finalizeObservation(
      { ...baseEvidence, failureCode: 'WALLET_CHAIN_TRANSACTION_BINDING_MISMATCH' },
      'failed',
    );
  }

  const receipt = parseReceipt(
    await rpcCall(rpcUrl, 3, 'eth_getTransactionReceipt', [input.txHash]),
  );
  if (!receipt) return finalizeObservation(baseEvidence, 'pending_external');

  if (
    receipt.transactionHash !== input.txHash
    || receipt.from !== input.authorizedWalletAddress
    || receipt.to !== transaction.to
  ) {
    return finalizeObservation(
      {
        ...baseEvidence,
        receiptFound: true,
        failureCode: 'WALLET_CHAIN_RECEIPT_BINDING_MISMATCH',
      },
      'failed',
    );
  }

  const receiptStatus = parseQuantity(receipt.status, 'WALLET_CHAIN_RECEIPT_STATUS_INVALID');
  const receiptBlock = parseQuantity(receipt.blockNumber, 'WALLET_CHAIN_RECEIPT_BLOCK_INVALID');
  const blockNumber = toSafeBlockNumber(receiptBlock, 'WALLET_CHAIN_RECEIPT_BLOCK_INVALID');

  if (receiptStatus === BigInt(0)) {
    return finalizeObservation(
      {
        ...baseEvidence,
        receiptFound: true,
        receiptStatus: 'reverted',
        blockNumber,
        confirmations: 0,
        failureCode: 'WALLET_CHAIN_RECEIPT_REVERTED',
      },
      'failed',
    );
  }
  if (receiptStatus !== BigInt(1)) {
    throw new WalletChainReconciliationError('WALLET_CHAIN_RECEIPT_STATUS_INVALID');
  }

  const latestBlock = parseQuantity(
    await rpcCall(rpcUrl, 4, 'eth_blockNumber', []),
    'WALLET_CHAIN_LATEST_BLOCK_INVALID',
  );
  if (latestBlock < receiptBlock) {
    throw new WalletChainReconciliationError('WALLET_CHAIN_LATEST_BLOCK_INVALID');
  }

  const confirmationsBigInt = latestBlock - receiptBlock + BigInt(1);
  const confirmations = Number(confirmationsBigInt);
  if (!Number.isSafeInteger(confirmations) || confirmations < 1) {
    throw new WalletChainReconciliationError('WALLET_CHAIN_CONFIRMATIONS_INVALID');
  }

  const evidence = {
    ...baseEvidence,
    receiptFound: true,
    receiptStatus: 'success' as const,
    blockNumber,
    latestBlockNumber: toSafeBlockNumber(latestBlock, 'WALLET_CHAIN_LATEST_BLOCK_INVALID'),
    confirmations,
  };

  return finalizeObservation(
    evidence,
    confirmations >= minConfirmations ? 'reconciled' : 'confirmed_external',
  );
}
