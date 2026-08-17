import type { InvestmentBeerStyle } from '@/types/beer-style';

export type LotDraftInputs = {
  cases: number;
  caseSize: number;
  productionCostCop: number;
  labelCostCop: number;
  ownPriceCop: number;
  b2bPriceCop: number;
};

export function centsToCop(value: number | null | undefined): number | null {
  if (value == null) return null;
  return value / 100;
}

export function getStyleDefaults(style: InvestmentBeerStyle | null) {
  return {
    caseSize: style?.units_per_case ?? 24,
    productionCostCop: centsToCop(style?.standard_production_cost_unit_cents),
    labelCostCop: centsToCop(style?.standard_label_cost_unit_cents),
    ownPriceCop: centsToCop(style?.standard_own_point_price_unit_cents),
    b2bPriceCop: centsToCop(style?.standard_b2b_price_unit_cents),
  };
}

export function deriveLotMetrics(input: LotDraftInputs) {
  const cases = Math.max(0, input.cases || 0);
  const caseSize = Math.max(0, input.caseSize || 0);
  const productionCostCop = Math.max(0, input.productionCostCop || 0);
  const labelCostCop = Math.max(0, input.labelCostCop || 0);
  const ownPriceCop = Math.max(0, input.ownPriceCop || 0);
  const b2bPriceCop = Math.max(0, input.b2bPriceCop || 0);

  const totalUnits = cases * caseSize;
  const baseUnitCost = productionCostCop + labelCostCop;

  return {
    totalUnits,
    baseUnitCost,
    baseCaseCost: baseUnitCost * caseSize,
    baseLotCost: baseUnitCost * totalUnits,
    ownGross: ownPriceCop * totalUnits,
    b2bGross: b2bPriceCop * totalUnits,
  };
}

export function lotCodePreview(styleCode: string | null | undefined, year = new Date().getFullYear()) {
  return styleCode ? `CTG-${styleCode}-${year}-###` : `CTG-STYLE-${year}-###`;
}
