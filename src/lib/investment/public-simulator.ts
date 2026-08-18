import { DEFAULT_SIMULATOR_MAX_CASES, MIN_INVESTMENT_CASES } from './commercial-rules';

export type PublicInvestmentSimulatorProfile = {
  id: string;
  label: string;
  caseSizeUnits: number;
  capitalPerCaseCents: number;
  projectedNdlpRatio: number;
  participantProfitShare: number;
  minCases: number;
  maxCases: number;
};

/**
 * Public illustrative profile only.
 *
 * These values reproduce the simulator assumptions that were already published
 * before lot-snapshot economics became authoritative. They are intentionally
 * isolated from order creation, allocation, settlement and every transactional
 * money path. Real investments continue to derive capital from the selected
 * production-lot snapshot in PostgreSQL.
 */
export const PUBLIC_INVESTMENT_SIMULATOR_PROFILE: PublicInvestmentSimulatorProfile = {
  id: 'reference-v1',
  label: 'Escenario ilustrativo de referencia',
  caseSizeUnits: 24,
  capitalPerCaseCents: 33_600_000,
  projectedNdlpRatio: 0.357,
  participantProfitShare: 0.5,
  minCases: MIN_INVESTMENT_CASES,
  maxCases: DEFAULT_SIMULATOR_MAX_CASES,
};
