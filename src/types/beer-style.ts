export type InvestmentBeerStyle = {
  id: string;
  code: string;
  slug: string;
  name: string;
  description: string | null;
  abv_target: number | null;
  units_per_case: number;
  standard_production_cost_unit_cents: number | null;
  standard_label_cost_unit_cents: number | null;
  standard_own_point_price_unit_cents: number | null;
  standard_b2b_price_unit_cents: number | null;
  standard_inc_rate: number | null;
  standard_advertising_rate_on_pre_inc: number | null;
  active: boolean;
};
