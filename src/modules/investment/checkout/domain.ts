import { MIN_INVESTMENT_CASES } from '@/lib/investment/constants';
import type { InvestmentProductionLot, LotFundingSummary } from '@/types/investment';

export function getCapitalPerCase(lot: InvestmentProductionLot): number {
  const unitCost = (lot.production_cost_unit_cents ?? 0)
    + (lot.label_cost_unit_cents ?? 0)
    + (lot.transport_cost_unit_cents ?? 0);
  return unitCost * lot.case_size_units;
}

export function clampInvestmentCases(next: number, funding: LotFundingSummary): number {
  if (funding.availableCasesEquivalent < MIN_INVESTMENT_CASES) {
    return funding.availableCasesEquivalent;
  }
  const normalized = Number.isFinite(next) && next > 0 ? next : MIN_INVESTMENT_CASES;
  return Math.max(MIN_INVESTMENT_CASES, Math.min(funding.availableCasesEquivalent, normalized));
}

export function getProjectedLotCapacityPercent(cases: number, funding: LotFundingSummary): number {
  if (funding.totalCases <= 0) return 0;
  return Math.min(100, Math.round(((funding.allocatedCases + cases) / funding.totalCases) * 100));
}
