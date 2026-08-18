-- CTG Craft Beer Inversión — compatibility wrappers after transport became
-- a first-class economics field. These wrappers do not invent transport:
-- they require an already persisted Beer Style Master Data value.

create function public.update_investment_beer_style_economics(
  p_style_code text,
  p_production_cost_unit_cents bigint,
  p_label_cost_unit_cents bigint,
  p_own_point_price_unit_cents bigint,
  p_b2b_price_unit_cents bigint,
  p_inc_rate numeric,
  p_advertising_rate_on_pre_inc numeric
)
returns public.investment_beer_styles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transport bigint;
  v_style public.investment_beer_styles;
begin
  select standard_transport_cost_unit_cents into v_transport
  from public.investment_beer_styles
  where code = upper(trim(p_style_code)) and active = true;

  if v_transport is null then
    raise exception 'transport cost must be configured before using the compatibility economics RPC';
  end if;

  select public.update_investment_beer_style_economics(
    p_style_code,
    p_production_cost_unit_cents,
    p_label_cost_unit_cents,
    v_transport,
    p_own_point_price_unit_cents,
    p_b2b_price_unit_cents,
    p_inc_rate,
    p_advertising_rate_on_pre_inc
  ) into v_style;

  return v_style;
end;
$$;

revoke all on function public.update_investment_beer_style_economics(
  text,bigint,bigint,bigint,bigint,numeric,numeric
) from public;
revoke execute on function public.update_investment_beer_style_economics(
  text,bigint,bigint,bigint,bigint,numeric,numeric
) from anon;
grant execute on function public.update_investment_beer_style_economics(
  text,bigint,bigint,bigint,bigint,numeric,numeric
) to authenticated;

create function public.create_production_lot_from_style(
  p_style_code text,
  p_destination text,
  p_total_cases integer,
  p_case_size_units integer default null,
  p_production_cost_unit_cents bigint default null,
  p_label_cost_unit_cents bigint default null,
  p_own_point_price_unit_cents bigint default null,
  p_b2b_price_unit_cents bigint default null,
  p_inc_rate numeric default null,
  p_advertising_rate_on_pre_inc numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transport bigint;
  v_lot_id uuid;
begin
  select standard_transport_cost_unit_cents into v_transport
  from public.investment_beer_styles
  where code = upper(trim(p_style_code)) and active = true;

  if v_transport is null then
    raise exception 'transport cost must be configured before lot creation';
  end if;

  select public.create_production_lot_from_style(
    p_style_code,
    p_destination,
    p_total_cases,
    p_case_size_units,
    p_production_cost_unit_cents,
    p_label_cost_unit_cents,
    v_transport,
    p_own_point_price_unit_cents,
    p_b2b_price_unit_cents,
    p_inc_rate,
    p_advertising_rate_on_pre_inc,
    p_total_cases
  ) into v_lot_id;

  return v_lot_id;
end;
$$;

revoke all on function public.create_production_lot_from_style(
  text,text,integer,integer,bigint,bigint,bigint,bigint,numeric,numeric
) from public;
revoke execute on function public.create_production_lot_from_style(
  text,text,integer,integer,bigint,bigint,bigint,bigint,numeric,numeric
) from anon;
grant execute on function public.create_production_lot_from_style(
  text,text,integer,integer,bigint,bigint,bigint,bigint,numeric,numeric
) to authenticated;
