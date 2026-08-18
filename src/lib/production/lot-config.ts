import type { InvestmentBeerStyle } from '@/types/beer-style';

export type LotDraftInputs = {
  cases: number;
  eligibleCases?: number;
  caseSize: number;
  productionCostCop: number;
  labelCostCop: number;
  transportCostCop?: number;
  ownPriceCop: number;
  b2bPriceCop: number;
};

export function centsToCop(value: number | null | undefined): number | null {
  if (value == null) return null;
  return value / 100;
}

export function getStyleDefaults(style: InvestmentBeerStyle | null) {
  return {
    caseSize: style?.units_per_case ?? null,
    productionCostCop: centsToCop(style?.standard_production_cost_unit_cents),
    labelCostCop: centsToCop(style?.standard_label_cost_unit_cents),
    transportCostCop: centsToCop(style?.standard_transport_cost_unit_cents),
    ownPriceCop: centsToCop(style?.standard_own_point_price_unit_cents),
    b2bPriceCop: centsToCop(style?.standard_b2b_price_unit_cents),
    incPercent: style?.standard_inc_rate == null ? null : Number(style.standard_inc_rate) * 100,
    advertisingPercent:
      style?.standard_advertising_rate_on_pre_inc == null
        ? null
        : Number(style.standard_advertising_rate_on_pre_inc) * 100,
  };
}

export function hasCompleteStyleEconomics(style: InvestmentBeerStyle | null): boolean {
  if (!style) return false;
  const defaults = getStyleDefaults(style);
  return defaults.caseSize != null
    && defaults.caseSize > 0
    && defaults.productionCostCop != null
    && defaults.productionCostCop >= 0
    && defaults.labelCostCop != null
    && defaults.labelCostCop >= 0
    && defaults.transportCostCop != null
    && defaults.transportCostCop >= 0
    && defaults.productionCostCop + defaults.labelCostCop + defaults.transportCostCop > 0
    && defaults.ownPriceCop != null
    && defaults.ownPriceCop > 0
    && defaults.b2bPriceCop != null
    && defaults.b2bPriceCop > 0
    && defaults.incPercent != null
    && defaults.incPercent >= 0
    && defaults.incPercent <= 100
    && defaults.advertisingPercent != null
    && defaults.advertisingPercent >= 0
    && defaults.advertisingPercent <= 100;
}

export function deriveLotMetrics(input: LotDraftInputs) {
  const cases = Math.max(0, input.cases || 0);
  const eligibleCases = Math.min(cases, Math.max(0, input.eligibleCases ?? cases));
  const caseSize = Math.max(0, input.caseSize || 0);
  const productionCostCop = Math.max(0, input.productionCostCop || 0);
  const labelCostCop = Math.max(0, input.labelCostCop || 0);
  const transportCostCop = Math.max(0, input.transportCostCop ?? 0);
  const ownPriceCop = Math.max(0, input.ownPriceCop || 0);
  const b2bPriceCop = Math.max(0, input.b2bPriceCop || 0);

  const totalUnits = cases * caseSize;
  const eligibleUnits = eligibleCases * caseSize;
  const baseUnitCost = productionCostCop + labelCostCop + transportCostCop;

  return {
    totalUnits,
    eligibleUnits,
    baseUnitCost,
    baseCaseCost: baseUnitCost * caseSize,
    baseLotCost: baseUnitCost * totalUnits,
    eligibleCapital: baseUnitCost * eligibleUnits,
    ownGross: ownPriceCop * eligibleUnits,
    b2bGross: b2bPriceCop * eligibleUnits,
  };
}

export function lotCodePreview(styleCode: string | null | undefined, year = new Date().getFullYear()) {
  return styleCode ? `CTG-${styleCode}-${year}-###` : `CTG-STYLE-${year}-###`;
}
