export const EXPECTED_DATABASE_MIGRATION = '0097' as const;
export const EXPECTED_DATABASE_MIGRATION_NAME = 'jp_education_settlement_operations' as const;
export const EXPECTED_DATABASE_MIGRATION_COUNT = 97 as const;

// Wallet Canary V1 depends on migrations through 0091, but it remains compatible
// with later additive global migrations. These constants express that minimum
// explicitly so wallet-specific contracts do not equate their compatibility
// floor with the repository-wide latest schema version.
export const WALLET_CANARY_MINIMUM_EXPECTED_DATABASE_MIGRATION = '0091' as const;
export const WALLET_CANARY_MINIMUM_EXPECTED_DATABASE_MIGRATION_NAME = 'wallet_canary_execution_guardrails_v1' as const;
export const WALLET_CANARY_MINIMUM_EXPECTED_DATABASE_MIGRATION_COUNT = 91 as const;