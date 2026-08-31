import 'server-only';

import type { createAdminClient } from '@/lib/supabase/server';
import {
  inspectPolygonWalletIntentV1,
  WALLET_CHAIN_RECONCILIATION_VERSION,
  type WalletChainObservation,
} from '@/lib/wallet/chain-reconciliation';

export const WALLET_CHAIN_RECONCILABLE_STATUSES = [
  'submitted',
  'pending_external',
  'confirmed_external',
] as const;

const WALLET_CHAIN_SERVICE_STATUSES = [
  ...WALLET_CHAIN_RECONCILABLE_STATUSES,
  'reconciled',
  'failed',
] as const;

export const WALLET_CHAIN_INTENT_SELECT = [
  'id',
  'user_id',
  'status',
  'intent_type',
  'rail',
  'chain_id',
  'asset_symbol',
  'amount_base_units',
  'destination_address',
  'tx_hash',
  'submitted_at',
  'authorized_wallet_address',
  'chain_last_checked_at',
].join(',');

const TX_HASH_RE = /^0x[0-9a-f]{64}$/;
const EVM_ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const BASE_UNITS_RE = /^[1-9][0-9]*$/;
const SUPPORTED_ASSETS = new Set(['POL', 'CTG', 'USDC', 'USDT']);
const SERVICE_STATUSES = new Set<string>(WALLET_CHAIN_SERVICE_STATUSES);

type AdminClient = ReturnType<typeof createAdminClient>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export type WalletChainIntentSnapshot = {
  id: string;
  user_id: string;
  status: (typeof WALLET_CHAIN_SERVICE_STATUSES)[number];
  intent_type: 'crypto_send';
  rail: 'polygon';
  chain_id: 137;
  asset_symbol: 'POL' | 'CTG' | 'USDC' | 'USDT';
  amount_base_units: string;
  destination_address: string;
  tx_hash: string;
  submitted_at: string;
  authorized_wallet_address: string;
  chain_last_checked_at: string | null;
};

export type WalletChainReconciliationRecord = Record<string, unknown> & {
  version: typeof WALLET_CHAIN_RECONCILIATION_VERSION;
  replayed: boolean;
  intentId: string;
  status: string;
  txHash: string;
};

export class WalletChainPersistenceError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'WalletChainPersistenceError';
  }
}

export function normalizeWalletChainIntentSnapshot(value: unknown): WalletChainIntentSnapshot | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string'
    || typeof value.user_id !== 'string'
    || typeof value.status !== 'string'
    || !SERVICE_STATUSES.has(value.status)
    || value.intent_type !== 'crypto_send'
    || value.rail !== 'polygon'
    || value.chain_id !== 137
    || typeof value.asset_symbol !== 'string'
    || !SUPPORTED_ASSETS.has(value.asset_symbol)
    || typeof value.amount_base_units !== 'string'
    || !BASE_UNITS_RE.test(value.amount_base_units)
    || value.amount_base_units.length > 78
    || typeof value.destination_address !== 'string'
    || typeof value.tx_hash !== 'string'
    || typeof value.submitted_at !== 'string'
    || Number.isNaN(Date.parse(value.submitted_at))
    || typeof value.authorized_wallet_address !== 'string'
  ) return null;

  const destinationAddress = value.destination_address.toLowerCase();
  const txHash = value.tx_hash.toLowerCase();
  const authorizedWalletAddress = value.authorized_wallet_address.toLowerCase();
  const lastCheckedAt = typeof value.chain_last_checked_at === 'string'
    && !Number.isNaN(Date.parse(value.chain_last_checked_at))
    ? value.chain_last_checked_at
    : null;

  if (
    !EVM_ADDRESS_RE.test(destinationAddress)
    || !TX_HASH_RE.test(txHash)
    || !EVM_ADDRESS_RE.test(authorizedWalletAddress)
  ) return null;

  return {
    id: value.id,
    user_id: value.user_id,
    status: value.status as WalletChainIntentSnapshot['status'],
    intent_type: 'crypto_send',
    rail: 'polygon',
    chain_id: 137,
    asset_symbol: value.asset_symbol as WalletChainIntentSnapshot['asset_symbol'],
    amount_base_units: value.amount_base_units,
    destination_address: destinationAddress,
    tx_hash: txHash,
    submitted_at: value.submitted_at,
    authorized_wallet_address: authorizedWalletAddress,
    chain_last_checked_at: lastCheckedAt,
  };
}

/**
 * Executes the single canonical trusted reconciliation path for an already
 * submitted Polygon intent. Both the user-triggered route and the background
 * worker call this function so transaction validation and persistence cannot
 * drift into two authorities.
 */
export async function reconcileWalletChainIntentV1(
  admin: AdminClient,
  intent: WalletChainIntentSnapshot,
): Promise<{
  intent: WalletChainIntentSnapshot;
  observation: WalletChainObservation;
  record: WalletChainReconciliationRecord;
}> {
  const observation = await inspectPolygonWalletIntentV1({
    intentId: intent.id,
    canonicalUserId: intent.user_id,
    txHash: intent.tx_hash,
    chainId: intent.chain_id,
    assetSymbol: intent.asset_symbol,
    amountBaseUnits: intent.amount_base_units,
    destinationAddress: intent.destination_address,
    authorizedWalletAddress: intent.authorized_wallet_address,
  });

  const { data, error } = await admin.rpc('record_wallet_chain_reconciliation_v1_server', {
    p_user_id: intent.user_id,
    p_intent_id: intent.id,
    p_tx_hash: intent.tx_hash,
    p_observation_status: observation.status,
    p_evidence_digest_sha256: observation.evidenceDigestSha256,
    p_chain_observed: observation.chainObserved,
    p_block_number: observation.blockNumber,
    p_confirmations: observation.confirmations,
    p_failure_code: observation.failureCode,
  });

  if (error) {
    throw new WalletChainPersistenceError(
      error.message.includes('WALLET_CHAIN_')
        ? error.message
        : 'WALLET_CHAIN_RECONCILIATION_FAILED',
    );
  }

  if (
    !isRecord(data)
    || data.version !== WALLET_CHAIN_RECONCILIATION_VERSION
    || data.intentId !== intent.id
    || data.txHash !== intent.tx_hash
    || typeof data.status !== 'string'
    || typeof data.replayed !== 'boolean'
  ) {
    throw new WalletChainPersistenceError('WALLET_CHAIN_RECONCILIATION_RESPONSE_INVALID');
  }

  return {
    intent,
    observation,
    record: data as WalletChainReconciliationRecord,
  };
}
