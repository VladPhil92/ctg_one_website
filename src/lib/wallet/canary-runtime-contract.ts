import 'server-only';

import {
  WALLET_CANARY_DEFAULT_MIN_CONFIRMATIONS,
  WALLET_CANARY_POLYGON_CHAIN_ID,
  WALLET_CANARY_PREFLIGHT_VERSION,
} from '@/lib/wallet/canary-preflight';
import { WALLET_CANARY_EVIDENCE_VERSION } from '@/lib/wallet/canary-evidence';
import {
  WALLET_CHAIN_RECONCILIATION_VERSION,
  WALLET_CHAIN_SUBMISSION_VERSION,
} from '@/lib/wallet/chain-reconciliation';
import {
  WALLET_CANARY_MINIMUM_EXPECTED_DATABASE_MIGRATION,
  WALLET_CANARY_MINIMUM_EXPECTED_DATABASE_MIGRATION_COUNT,
  WALLET_CANARY_MINIMUM_EXPECTED_DATABASE_MIGRATION_NAME,
} from '@/lib/observability/schema-version';

/**
 * Public, non-sensitive protocol attestation for the CTG Wallet Polygon canary.
 *
 * This object intentionally contains only immutable contract/version metadata.
 * It MUST NOT expose canary users, destination allowlists, amount limits,
 * provider credentials, balances, RPC endpoints or kill-switch state.
 */
export const WALLET_CANARY_RUNTIME_CONTRACT_VERSION = 'ctg-wallet-canary-runtime-v1' as const;
export const WALLET_CANARY_AUTHORIZATION_VERSION = 'ctg-wallet-authorization-v1' as const;

export function getWalletCanaryRuntimeContract() {
  return {
    version: WALLET_CANARY_RUNTIME_CONTRACT_VERSION,
    rail: 'polygon' as const,
    chainId: WALLET_CANARY_POLYGON_CHAIN_ID,
    defaultMinConfirmations: WALLET_CANARY_DEFAULT_MIN_CONFIRMATIONS,
    protocols: {
      preflight: WALLET_CANARY_PREFLIGHT_VERSION,
      authorization: WALLET_CANARY_AUTHORIZATION_VERSION,
      submission: WALLET_CHAIN_SUBMISSION_VERSION,
      reconciliation: WALLET_CHAIN_RECONCILIATION_VERSION,
      evidence: WALLET_CANARY_EVIDENCE_VERSION,
    },
    minimumSchema: {
      migration: WALLET_CANARY_MINIMUM_EXPECTED_DATABASE_MIGRATION,
      migrationName: WALLET_CANARY_MINIMUM_EXPECTED_DATABASE_MIGRATION_NAME,
      migrationCount: WALLET_CANARY_MINIMUM_EXPECTED_DATABASE_MIGRATION_COUNT,
    },
  } as const;
}

export type WalletCanaryRuntimeContract = ReturnType<typeof getWalletCanaryRuntimeContract>;
