import type { InvestmentProductionLot } from './investment';

export type InvestmentFormulaVersion = {
  id: string;
  version: string;
  effective_from: string;
  effective_to: string | null;
  participant_profit_share: number;
  ctg_profit_share: number;
  status: 'DRAFT' | 'ACTIVE' | 'RETIRED';
  created_at: string;
  approved_at: string | null;
};

export type LotEconomicsSnapshot = Pick<
  InvestmentProductionLot,
  | 'production_cost_unit_cents'
  | 'label_cost_unit_cents'
  | 'own_point_price_unit_cents'
  | 'b2b_price_unit_cents'
  | 'inc_rate'
  | 'advertising_rate_on_pre_inc'
  | 'case_size_units'
>;

export type UnitEconomicsResult = {
  totalUnitCostCents: number;
  ownPointPreIncCents: number;
  ownPointIncCents: number;
  ownPointAdvertisingCents: number;
  ownPointContributionCents: number;
  b2bContributionCents: number;
  ownPointMargin: number | null;
  b2bMargin: number | null;
};

export type LotScenarioResult = {
  cases: number;
  units: number;
  capitalRequiredCents: number;
  ownPointGrossRevenueCents: number;
  b2bGrossRevenueCents: number;
  ownPointContributionCents: number;
  b2bContributionCents: number;
  ownPointParticipantProfitCents: number | null;
  b2bParticipantProfitCents: number | null;
  ownPointParticipantRoi: number | null;
  b2bParticipantRoi: number | null;
};
