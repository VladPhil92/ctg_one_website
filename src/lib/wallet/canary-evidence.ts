import 'server-only';

import { createHash } from 'node:crypto';

import type { DeploymentMetadata } from '@/lib/observability/deployment';

export const WALLET_CANARY_EVIDENCE_VERSION = 'ctg-wallet-canary-evidence-v1' as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVM_ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const TX_HASH_RE = /^0x[0-9a-f]{64}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const GIT_COMMIT_RE = /^[0-9a-f]{40}$/;
const BASE_UNITS_RE = /^[1-9][0-9]*$/;
const FAILURE_CODE_RE = /^WALLET_CHAIN_[A-Z0-9_]+$/;
const SUPPORTED_ASSETS = new Set(['POL', 'CTG', 'USDC', 'USDT']);
const EVIDENCE_STATUSES = new Set([
  'authorized',
  'submitted',
  'pending_external',
  'confirmed_external',
  'reconciled',
  'failed',
]);
const OBSERVATION_STATUSES = new Set([
  'pending_external',
  'confirmed_external',
  'reconciled',
  'failed',
]);
const SUBMITTED_STATUSES = new Set([
  'submitted',
  'pending_external',
  'confirmed_external',
  'reconciled',
  'failed',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function nullableTimestamp(value: unknown) {
  return value === null || value === undefined
    ? null
    : validTimestamp(value)
      ? value
      : undefined;
}

function nullableNonNegativeInteger(value: unknown) {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

function nullablePositiveInteger(value: unknown) {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;
}

export type WalletCanaryEvidenceIntent = {
  id: string;
  status: 'authorized' | 'submitted' | 'pending_external' | 'confirmed_external' | 'reconciled' | 'failed';
  assetSymbol: 'POL' | 'CTG' | 'USDC' | 'USDT';
  amountBaseUnits: string;
  destinationAddress: string;
  createdAt: string;
  authorizedAt: string;
  simulationDigestSha256: string;
  txHash: string | null;
  submittedAt: string | null;
  chainLastCheckedAt: string | null;
  chainObservedAt: string | null;
  chainConfirmedAt: string | null;
  chainBlockNumber: number | null;
  chainConfirmations: number | null;
  chainReconciliationDigestSha256: string | null;
  chainFailureCode: string | null;
  settledAt: string | null;
};

export type WalletCanaryEvidenceObservation = {
  sequence: number;
  txHash: string;
  status: 'pending_external' | 'confirmed_external' | 'reconciled' | 'failed';
  evidenceDigestSha256: string;
  chainObserved: boolean;
  blockNumber: number | null;
  confirmations: number | null;
  failureCode: string | null;
  checkedAt: string;
};

export type WalletCanaryEvidenceClientArtifact = {
  repository: 'VladPhil92/CTG-Wallet';
  commit: string;
  boundAt: string;
};

export type WalletCanaryEvidenceSchema = {
  compatible: boolean;
  observedMigrationCount: number | null;
  observedLatestMigrationName: string | null;
};

export class WalletCanaryEvidenceError extends Error {
  constructor(public readonly code:
    | 'WALLET_CANARY_EVIDENCE_INTENT_INVALID'
    | 'WALLET_CANARY_EVIDENCE_OBSERVATION_INVALID'
    | 'WALLET_CANARY_EVIDENCE_CLIENT_PROVENANCE_INVALID') {
    super(code);
    this.name = 'WalletCanaryEvidenceError';
  }
}

export function normalizeWalletCanaryEvidenceIntent(value: unknown): WalletCanaryEvidenceIntent {
  if (!isRecord(value)) throw new WalletCanaryEvidenceError('WALLET_CANARY_EVIDENCE_INTENT_INVALID');

  const status = typeof value.status === 'string' ? value.status : '';
  const assetSymbol = typeof value.asset_symbol === 'string' ? value.asset_symbol : '';
  const destinationAddress = typeof value.destination_address === 'string'
    ? value.destination_address.toLowerCase()
    : '';
  const simulationDigest = typeof value.simulation_digest_sha256 === 'string'
    ? value.simulation_digest_sha256.toLowerCase()
    : '';
  const txHash = typeof value.tx_hash === 'string' ? value.tx_hash.toLowerCase() : null;
  const reconciliationDigest = typeof value.chain_reconciliation_digest_sha256 === 'string'
    ? value.chain_reconciliation_digest_sha256.toLowerCase()
    : null;
  const failureCode = typeof value.chain_failure_code === 'string' ? value.chain_failure_code : null;

  const submittedAt = nullableTimestamp(value.submitted_at);
  const chainLastCheckedAt = nullableTimestamp(value.chain_last_checked_at);
  const chainObservedAt = nullableTimestamp(value.chain_observed_at);
  const chainConfirmedAt = nullableTimestamp(value.chain_confirmed_at);
  const settledAt = nullableTimestamp(value.settled_at);
  const chainBlockNumber = nullablePositiveInteger(value.chain_block_number);
  const chainConfirmations = nullableNonNegativeInteger(value.chain_confirmations);

  if (
    typeof value.id !== 'string'
    || !UUID_RE.test(value.id)
    || !EVIDENCE_STATUSES.has(status)
    || value.intent_type !== 'crypto_send'
    || value.rail !== 'polygon'
    || value.chain_id !== 137
    || !SUPPORTED_ASSETS.has(assetSymbol)
    || typeof value.amount_base_units !== 'string'
    || !BASE_UNITS_RE.test(value.amount_base_units)
    || value.amount_base_units.length > 78
    || !EVM_ADDRESS_RE.test(destinationAddress)
    || !validTimestamp(value.created_at)
    || !validTimestamp(value.authorized_at)
    || !SHA256_RE.test(simulationDigest)
    || submittedAt === undefined
    || chainLastCheckedAt === undefined
    || chainObservedAt === undefined
    || chainConfirmedAt === undefined
    || settledAt === undefined
    || chainBlockNumber === undefined
    || chainConfirmations === undefined
    || (reconciliationDigest !== null && !SHA256_RE.test(reconciliationDigest))
    || (failureCode !== null && !FAILURE_CODE_RE.test(failureCode))
  ) {
    throw new WalletCanaryEvidenceError('WALLET_CANARY_EVIDENCE_INTENT_INVALID');
  }

  if (SUBMITTED_STATUSES.has(status) && (!txHash || !TX_HASH_RE.test(txHash) || !submittedAt)) {
    throw new WalletCanaryEvidenceError('WALLET_CANARY_EVIDENCE_INTENT_INVALID');
  }
  if (!SUBMITTED_STATUSES.has(status) && (txHash !== null || submittedAt !== null)) {
    throw new WalletCanaryEvidenceError('WALLET_CANARY_EVIDENCE_INTENT_INVALID');
  }
  if (status === 'reconciled' && (!settledAt || !chainConfirmedAt || !reconciliationDigest)) {
    throw new WalletCanaryEvidenceError('WALLET_CANARY_EVIDENCE_INTENT_INVALID');
  }
  if (status === 'failed' && !failureCode) {
    throw new WalletCanaryEvidenceError('WALLET_CANARY_EVIDENCE_INTENT_INVALID');
  }

  return {
    id: value.id,
    status: status as WalletCanaryEvidenceIntent['status'],
    assetSymbol: assetSymbol as WalletCanaryEvidenceIntent['assetSymbol'],
    amountBaseUnits: value.amount_base_units,
    destinationAddress,
    createdAt: value.created_at,
    authorizedAt: value.authorized_at,
    simulationDigestSha256: simulationDigest,
    txHash,
    submittedAt,
    chainLastCheckedAt,
    chainObservedAt,
    chainConfirmedAt,
    chainBlockNumber,
    chainConfirmations,
    chainReconciliationDigestSha256: reconciliationDigest,
    chainFailureCode: failureCode,
    settledAt,
  };
}

export function normalizeWalletCanaryEvidenceObservation(value: unknown): WalletCanaryEvidenceObservation {
  if (!isRecord(value)) throw new WalletCanaryEvidenceError('WALLET_CANARY_EVIDENCE_OBSERVATION_INVALID');

  const sequence = typeof value.id === 'number' && Number.isSafeInteger(value.id) && value.id > 0
    ? value.id
    : undefined;
  const txHash = typeof value.tx_hash === 'string' ? value.tx_hash.toLowerCase() : '';
  const status = typeof value.observation_status === 'string' ? value.observation_status : '';
  const digest = typeof value.evidence_digest_sha256 === 'string'
    ? value.evidence_digest_sha256.toLowerCase()
    : '';
  const blockNumber = nullablePositiveInteger(value.block_number);
  const confirmations = nullableNonNegativeInteger(value.confirmations);
  const failureCode = typeof value.failure_code === 'string' ? value.failure_code : null;

  if (
    sequence === undefined
    || !TX_HASH_RE.test(txHash)
    || !OBSERVATION_STATUSES.has(status)
    || !SHA256_RE.test(digest)
    || typeof value.chain_observed !== 'boolean'
    || blockNumber === undefined
    || confirmations === undefined
    || (failureCode !== null && !FAILURE_CODE_RE.test(failureCode))
    || !validTimestamp(value.checked_at)
  ) {
    throw new WalletCanaryEvidenceError('WALLET_CANARY_EVIDENCE_OBSERVATION_INVALID');
  }

  if (
    (status === 'confirmed_external' || status === 'reconciled')
    && (!value.chain_observed || blockNumber === null || confirmations === null || confirmations < 1 || failureCode !== null)
  ) {
    throw new WalletCanaryEvidenceError('WALLET_CANARY_EVIDENCE_OBSERVATION_INVALID');
  }
  if (status === 'failed' && !failureCode) {
    throw new WalletCanaryEvidenceError('WALLET_CANARY_EVIDENCE_OBSERVATION_INVALID');
  }
  if (status !== 'failed' && failureCode !== null) {
    throw new WalletCanaryEvidenceError('WALLET_CANARY_EVIDENCE_OBSERVATION_INVALID');
  }

  return {
    sequence,
    txHash,
    status: status as WalletCanaryEvidenceObservation['status'],
    evidenceDigestSha256: digest,
    chainObserved: value.chain_observed,
    blockNumber,
    confirmations,
    failureCode,
    checkedAt: value.checked_at,
  };
}

export function normalizeWalletCanaryEvidenceClientArtifact(value: unknown): WalletCanaryEvidenceClientArtifact {
  if (!isRecord(value)) {
    throw new WalletCanaryEvidenceError('WALLET_CANARY_EVIDENCE_CLIENT_PROVENANCE_INVALID');
  }
  const commit = typeof value.commit === 'string' ? value.commit.toLowerCase() : '';
  const boundAt = typeof value.boundAt === 'string' ? value.boundAt : '';
  if (
    value.repository !== 'VladPhil92/CTG-Wallet'
    || !GIT_COMMIT_RE.test(commit)
    || !validTimestamp(boundAt)
  ) {
    throw new WalletCanaryEvidenceError('WALLET_CANARY_EVIDENCE_CLIENT_PROVENANCE_INVALID');
  }
  return { repository: 'VladPhil92/CTG-Wallet', commit, boundAt };
}

export function buildWalletCanaryEvidenceBundleV1(input: {
  intent: WalletCanaryEvidenceIntent;
  deployment: DeploymentMetadata;
  schema: WalletCanaryEvidenceSchema;
  clientArtifact: WalletCanaryEvidenceClientArtifact;
  observations: WalletCanaryEvidenceObservation[];
}) {
  const clientArtifact = normalizeWalletCanaryEvidenceClientArtifact(input.clientArtifact);
  const observations = [...input.observations].sort((a, b) => a.sequence - b.sequence);

  if (
    observations.some((observation, index) => (
      (index > 0 && observation.sequence <= observations[index - 1].sequence)
      || !input.intent.txHash
      || observation.txHash !== input.intent.txHash
    ))
  ) {
    throw new WalletCanaryEvidenceError('WALLET_CANARY_EVIDENCE_OBSERVATION_INVALID');
  }

  const canonical = {
    version: WALLET_CANARY_EVIDENCE_VERSION,
    deployment: {
      provider: input.deployment.provider,
      commit: input.deployment.commit,
      branch: input.deployment.branch,
      repository: input.deployment.repository,
      expectedDatabaseMigration: input.deployment.expectedDatabaseMigration,
    },
    clientArtifact,
    schema: input.schema,
    intent: {
      id: input.intent.id,
      status: input.intent.status,
      kind: 'crypto_send' as const,
      rail: 'polygon' as const,
      chainId: 137 as const,
      assetSymbol: input.intent.assetSymbol,
      amountBaseUnits: input.intent.amountBaseUnits,
      destinationAddress: input.intent.destinationAddress,
      createdAt: input.intent.createdAt,
      authorizedAt: input.intent.authorizedAt,
      simulationDigestSha256: input.intent.simulationDigestSha256,
    },
    submission: input.intent.txHash && input.intent.submittedAt
      ? {
          txHash: input.intent.txHash,
          submittedAt: input.intent.submittedAt,
        }
      : null,
    reconciliation: {
      lastCheckedAt: input.intent.chainLastCheckedAt,
      observedAt: input.intent.chainObservedAt,
      confirmedAt: input.intent.chainConfirmedAt,
      blockNumber: input.intent.chainBlockNumber,
      confirmations: input.intent.chainConfirmations,
      evidenceDigestSha256: input.intent.chainReconciliationDigestSha256,
      failureCode: input.intent.chainFailureCode,
      settledAt: input.intent.settledAt,
      terminal: input.intent.status === 'reconciled' || input.intent.status === 'failed',
      observations: observations.map((observation) => ({
        sequence: observation.sequence,
        status: observation.status,
        checkedAt: observation.checkedAt,
        chainObserved: observation.chainObserved,
        blockNumber: observation.blockNumber,
        confirmations: observation.confirmations,
        evidenceDigestSha256: observation.evidenceDigestSha256,
        failureCode: observation.failureCode,
      })),
    },
  };

  const bundleDigestSha256 = createHash('sha256')
    .update(JSON.stringify(canonical))
    .digest('hex');

  return {
    ...canonical,
    bundleDigestSha256,
    generatedAt: new Date().toISOString(),
  };
}
