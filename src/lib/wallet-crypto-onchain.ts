import 'server-only';

import {
  createPublicClient,
  erc20Abi,
  http,
  parseEventLogs,
  type Address,
  type Hash,
} from 'viem';
import { mainnet } from 'viem/chains';
import { bsc } from 'viem/chains';
import type { WalletCryptoAsset } from '@/lib/wallet-crypto-topups';

export type CryptoValidationResult = {
  state: 'confirmed' | 'confirming' | 'manual_review' | 'rejected';
  confirmations: number;
  receivedAmount: number | null;
  reason?: string;
  details: Record<string, unknown>;
};

type ClaimInput = {
  asset: WalletCryptoAsset;
  network: string;
  destinationAddress: string;
  txHash: string;
  expectedAmount: number;
};

const MIN_CONFIRMATIONS: Record<WalletCryptoAsset, number> = {
  BTC: Number(process.env.WALLET_BTC_MIN_CONFIRMATIONS ?? 2),
  ETH: Number(process.env.WALLET_ETH_MIN_CONFIRMATIONS ?? 12),
  BNB: Number(process.env.WALLET_BNB_MIN_CONFIRMATIONS ?? 15),
  USDT: Number(process.env.WALLET_USDT_MIN_CONFIRMATIONS ?? 15),
  USDC: Number(process.env.WALLET_USDC_MIN_CONFIRMATIONS ?? 15),
};

function toDecimalString(value: bigint, decimals: number) {
  const zero = BigInt(0);
  const negative = value < zero;
  const absolute = negative ? -value : value;
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = absolute / divisor;
  const fraction = (absolute % divisor).toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

function amountAtLeast(received: number, expected: number) {
  // Numerical comparison is acceptable here only after exact integer on-chain
  // units have been converted for the UI/RPC boundary. A 1e-9 relative epsilon
  // absorbs JS decimal serialization, never a payment shortfall.
  return received + Math.max(expected * 1e-9, 1e-12) >= expected;
}

async function validateBitcoin(input: ClaimInput): Promise<CryptoValidationResult> {
  const txId = input.txHash.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(txId)) {
    return { state: 'rejected', confirmations: 0, receivedAmount: null, reason: 'invalid BTC transaction hash', details: {} };
  }

  const base = process.env.WALLET_BTC_EXPLORER_API?.replace(/\/$/, '') || 'https://blockstream.info/api';
  const [txResponse, tipResponse] = await Promise.all([
    fetch(`${base}/tx/${txId}`, { signal: AbortSignal.timeout(8_000), cache: 'no-store' }),
    fetch(`${base}/blocks/tip/height`, { signal: AbortSignal.timeout(8_000), cache: 'no-store' }),
  ]);
  if (txResponse.status === 404) {
    return { state: 'confirming', confirmations: 0, receivedAmount: null, reason: 'transaction not found yet', details: { provider: base } };
  }
  if (!txResponse.ok || !tipResponse.ok) throw new Error('BTC_VALIDATOR_UNAVAILABLE');

  const tx = await txResponse.json() as {
    vout?: Array<{ value?: number; scriptpubkey_address?: string }>;
    status?: { confirmed?: boolean; block_height?: number };
  };
  const tip = Number(await tipResponse.text());
  const sats = (tx.vout ?? [])
    .filter((output) => output.scriptpubkey_address === input.destinationAddress)
    .reduce((sum, output) => sum + Number(output.value ?? 0), 0);
  const received = sats / 100_000_000;
  const confirmations = tx.status?.confirmed && Number.isInteger(tx.status.block_height) && Number.isInteger(tip)
    ? Math.max(0, tip - Number(tx.status!.block_height) + 1)
    : 0;

  if (sats <= 0) {
    return { state: 'rejected', confirmations, receivedAmount: 0, reason: 'destination address not found in BTC outputs', details: { provider: base } };
  }
  if (!amountAtLeast(received, input.expectedAmount)) {
    return { state: 'manual_review', confirmations, receivedAmount: received, reason: 'received BTC amount is below quoted amount', details: { provider: base } };
  }
  if (confirmations < MIN_CONFIRMATIONS.BTC) {
    return { state: 'confirming', confirmations, receivedAmount: received, details: { provider: base, requiredConfirmations: MIN_CONFIRMATIONS.BTC } };
  }
  return { state: 'confirmed', confirmations, receivedAmount: received, details: { provider: base, requiredConfirmations: MIN_CONFIRMATIONS.BTC } };
}

function evmConfig(asset: WalletCryptoAsset) {
  if (asset === 'ETH') {
    return {
      rpcUrl: process.env.WALLET_ETH_RPC_URL,
      chain: mainnet,
      tokenContract: null,
      requiredConfirmations: MIN_CONFIRMATIONS.ETH,
    };
  }
  if (asset === 'BNB') {
    return {
      rpcUrl: process.env.WALLET_BSC_RPC_URL,
      chain: bsc,
      tokenContract: null,
      requiredConfirmations: MIN_CONFIRMATIONS.BNB,
    };
  }
  if (asset === 'USDT') {
    return {
      rpcUrl: process.env.WALLET_BSC_RPC_URL,
      chain: bsc,
      tokenContract: process.env.WALLET_BSC_USDT_CONTRACT,
      requiredConfirmations: MIN_CONFIRMATIONS.USDT,
    };
  }
  if (asset === 'USDC') {
    return {
      rpcUrl: process.env.WALLET_USDC_RPC_URL || process.env.WALLET_BSC_RPC_URL,
      chain: bsc,
      tokenContract: process.env.WALLET_USDC_CONTRACT,
      requiredConfirmations: MIN_CONFIRMATIONS.USDC,
    };
  }
  return null;
}

async function validateEvm(input: ClaimInput): Promise<CryptoValidationResult> {
  const config = evmConfig(input.asset);
  if (!config?.rpcUrl) {
    return { state: 'manual_review', confirmations: 0, receivedAmount: null, reason: 'RPC validator is not configured for this network', details: {} };
  }
  if ((input.asset === 'USDT' || input.asset === 'USDC') && !config.tokenContract) {
    return { state: 'manual_review', confirmations: 0, receivedAmount: null, reason: 'token contract is not pinned for automated validation', details: {} };
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(input.txHash.trim())) {
    return { state: 'rejected', confirmations: 0, receivedAmount: null, reason: 'invalid EVM transaction hash', details: {} };
  }

  const client = createPublicClient({ chain: config.chain, transport: http(config.rpcUrl) });
  const hash = input.txHash.trim() as Hash;
  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash });
  } catch {
    return { state: 'confirming', confirmations: 0, receivedAmount: null, reason: 'transaction receipt not available yet', details: {} };
  }
  if (receipt.status !== 'success') {
    return { state: 'rejected', confirmations: 0, receivedAmount: null, reason: 'on-chain transaction reverted', details: { blockNumber: receipt.blockNumber.toString() } };
  }

  const currentBlock = await client.getBlockNumber();
  const one = BigInt(1);
  const zero = BigInt(0);
  const confirmations = Number(currentBlock >= receipt.blockNumber ? currentBlock - receipt.blockNumber + one : zero);
  let received = 0;

  if (input.asset === 'ETH' || input.asset === 'BNB') {
    const tx = await client.getTransaction({ hash });
    if (!tx.to || tx.to.toLowerCase() !== input.destinationAddress.toLowerCase()) {
      return { state: 'rejected', confirmations, receivedAmount: 0, reason: 'transaction recipient does not match configured destination', details: { blockNumber: receipt.blockNumber.toString() } };
    }
    received = Number(toDecimalString(tx.value, 18));
  } else {
    const contract = config.tokenContract as Address;
    const decimals = await client.readContract({ address: contract, abi: erc20Abi, functionName: 'decimals' });
    const transfers = parseEventLogs({ abi: erc20Abi, eventName: 'Transfer', logs: receipt.logs, strict: false });
    let units = BigInt(0);
    for (const log of transfers) {
      if (log.address.toLowerCase() !== contract.toLowerCase()) continue;
      const args = log.args as { to?: Address; value?: bigint };
      if (args.to?.toLowerCase() === input.destinationAddress.toLowerCase() && typeof args.value === 'bigint') {
        units += args.value;
      }
    }
    received = Number(toDecimalString(units, Number(decimals)));
    if (received <= 0) {
      return { state: 'rejected', confirmations, receivedAmount: 0, reason: 'configured token transfer to destination was not found', details: { tokenContract: contract, blockNumber: receipt.blockNumber.toString() } };
    }
  }

  if (!amountAtLeast(received, input.expectedAmount)) {
    return { state: 'manual_review', confirmations, receivedAmount: received, reason: 'received crypto amount is below quoted amount', details: { blockNumber: receipt.blockNumber.toString() } };
  }
  if (confirmations < config.requiredConfirmations) {
    return { state: 'confirming', confirmations, receivedAmount: received, details: { requiredConfirmations: config.requiredConfirmations, blockNumber: receipt.blockNumber.toString() } };
  }
  return { state: 'confirmed', confirmations, receivedAmount: received, details: { requiredConfirmations: config.requiredConfirmations, blockNumber: receipt.blockNumber.toString() } };
}

export async function validateWalletCryptoTopup(input: ClaimInput): Promise<CryptoValidationResult> {
  if (input.asset === 'BTC') return validateBitcoin(input);
  return validateEvm(input);
}
