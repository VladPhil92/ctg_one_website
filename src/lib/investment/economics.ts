import type { InvestmentProductionLot } from '@/types/investment';
import type {
  InvestmentFormulaVersion,
  LotEconomicsSnapshot,
  LotScenarioResult,
  UnitEconomicsResult,
} from '@/types/investment-economics';

function finiteNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function normalizedRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function hasCompleteLotEconomics(lot: LotEconomicsSnapshot): boolean {
  return [
    lot.production_cost_unit_cents,
    lot.label_cost_unit_cents,
    lot.own_point_price_unit_cents,
    lot.b2b_price_unit_cents,
    lot.inc_rate,
    lot.advertising_rate_on_pre_inc,
    lot.case_size_units,
  ].every((value) => value != null && Number.isFinite(Number(value)))
    && lot.production_cost_unit_cents >= 0
    && lot.label_cost_unit_cents >= 0
    && lot.own_point_price_unit_cents > 0
    && lot.b2b_price_unit_cents > 0
    && lot.case_size_units > 0
    && lot.inc_rate >= 0
    && lot.inc_rate <= 1
    && lot.advertising_rate_on_pre_inc >= 0
    && lot.advertising_rate_on_pre_inc <= 1
    && lot.production_cost_unit_cents + lot.label_cost_unit_cents > 0;
}

export function deriveUnitEconomics(lot: LotEconomicsSnapshot): UnitEconomicsResult {
  const productionCost = finiteNonNegative(lot.production_cost_unit_cents);
  const labelCost = finiteNonNegative(lot.label_cost_unit_cents);
  const ownPointGross = finiteNonNegative(lot.own_point_price_unit_cents);
  const b2bGross = finiteNonNegative(lot.b2b_price_unit_cents);
  const incRate = normalizedRate(lot.inc_rate);
  const advertisingRate = normalizedRate(lot.advertising_rate_on_pre_inc);

  const totalUnitCostCents = productionCost + labelCost;
  const ownPointPreIncCents = Math.round(ownPointGross / (1 + incRate));
  const ownPointIncCents = ownPointGross - ownPointPreIncCents;
  const ownPointAdvertisingCents = Math.round(ownPointPreIncCents * advertisingRate);
  const ownPointContributionCents = ownPointGross
    - ownPointIncCents
    - ownPointAdvertisingCents
    - totalUnitCostCents;
  const b2bContributionCents = b2bGross - totalUnitCostCents;

  return {
    totalUnitCostCents,
    ownPointPreIncCents,
    ownPointIncCents,
    ownPointAdvertisingCents,
    ownPointContributionCents,
    b2bContributionCents,
    ownPointMargin: ownPointGross > 0 ? ownPointContributionCents / ownPointGross : null,
    b2bMargin: b2bGross > 0 ? b2bContributionCents / b2bGross : null,
  };
}

export function deriveLotScenario(
  lot: InvestmentProductionLot,
  requestedCases: number,
  formula: InvestmentFormulaVersion | null,
): LotScenarioResult {
  const cases = Math.max(1, Math.min(lot.total_cases, Math.trunc(requestedCases || 1)));
  const units = cases * lot.case_size_units;
  const unit = deriveUnitEconomics(lot);
  const capitalRequiredCents = unit.totalUnitCostCents * units;
  const ownPointContributionCents = unit.ownPointContributionCents * units;
  const b2bContributionCents = unit.b2bContributionCents * units;
  const participantShare = formula ? normalizedRate(Number(formula.participant_profit_share)) : null;

  const ownPointParticipantProfitCents = participantShare == null
    ? null
    : Math.round(ownPointContributionCents * participantShare);
  const b2bParticipantProfitCents = participantShare == null
    ? null
    : Math.round(b2bContributionCents * participantShare);

  return {
    cases,
    units,
    capitalRequiredCents,
    ownPointGrossRevenueCents: lot.own_point_price_unit_cents * units,
    b2bGrossRevenueCents: lot.b2b_price_unit_cents * units,
    ownPointContributionCents,
    b2bContributionCents,
    ownPointParticipantProfitCents,
    b2bParticipantProfitCents,
    ownPointParticipantRoi:
      ownPointParticipantProfitCents != null && capitalRequiredCents > 0
        ? ownPointParticipantProfitCents / capitalRequiredCents
        : null,
    b2bParticipantRoi:
      b2bParticipantProfitCents != null && capitalRequiredCents > 0
        ? b2bParticipantProfitCents / capitalRequiredCents
        : null,
  };
}
