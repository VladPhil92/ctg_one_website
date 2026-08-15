-- CTG Craft Beer Inversión — per-lot unit economics
-- Stores commercial assumptions as a lot snapshot so historical lots remain reproducible.

alter table public.investment_production_lots
  add column if not exists production_cost_unit_cents bigint not null default 600000 check (production_cost_unit_cents >= 0),
  add column if not exists label_cost_unit_cents bigint not null default 90000 check (label_cost_unit_cents >= 0),
  add column if not exists own_point_price_unit_cents bigint not null default 1800000 check (own_point_price_unit_cents >= 0),
  add column if not exists b2b_price_unit_cents bigint not null default 800000 check (b2b_price_unit_cents >= 0),
  add column if not exists inc_rate numeric(7,6) not null default 0.08 check (inc_rate between 0 and 1),
  add column if not exists advertising_rate_on_pre_inc numeric(7,6) not null default 0.035 check (advertising_rate_on_pre_inc between 0 and 1);

comment on column public.investment_production_lots.production_cost_unit_cents is 'Base production cost per bottle, snapshotted at lot creation.';
comment on column public.investment_production_lots.label_cost_unit_cents is 'Label/packaging label cost per bottle, snapshotted at lot creation.';
comment on column public.investment_production_lots.own_point_price_unit_cents is 'Gross consumer price per bottle at CTG-owned points, including INC where applicable.';
comment on column public.investment_production_lots.b2b_price_unit_cents is 'Commercial B2B sale price per bottle under the lot assumptions.';
comment on column public.investment_production_lots.inc_rate is 'INC rate used by the lot economic model; 0.08 = 8%.';
comment on column public.investment_production_lots.advertising_rate_on_pre_inc is 'Advertising allocation applied to own-point pre-INC price; 0.035 = 3.5%.';

-- Replace the lot-creation RPC with a version that records the economic snapshot.
drop function if exists public.create_production_lot(text, text, text, int, int);

create function public.create_production_lot(
  p_code text,
  p_beer_style text,
  p_destination text,
  p_total_cases int,
  p_case_size_units int default 24,
  p_production_cost_unit_cents bigint default 600000,
  p_label_cost_unit_cents bigint default 90000,
  p_own_point_price_unit_cents bigint default 1800000,
  p_b2b_price_unit_cents bigint default 800000,
  p_inc_rate numeric default 0.08,
  p_advertising_rate_on_pre_inc numeric default 0.035
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_lot_id uuid;
begin
  if not public.is_investment_operator() then
    raise exception 'not authorized';
  end if;

  insert into public.investment_production_lots (
    code, beer_style, destination, total_cases, case_size_units, total_eligible_units, created_by,
    production_cost_unit_cents, label_cost_unit_cents, own_point_price_unit_cents,
    b2b_price_unit_cents, inc_rate, advertising_rate_on_pre_inc
  ) values (
    p_code, p_beer_style, p_destination, p_total_cases, p_case_size_units, p_total_cases, auth.uid(),
    p_production_cost_unit_cents, p_label_cost_unit_cents, p_own_point_price_unit_cents,
    p_b2b_price_unit_cents, p_inc_rate, p_advertising_rate_on_pre_inc
  ) returning id into v_lot_id;

  return v_lot_id;
end;
$$;

revoke all on function public.create_production_lot(text, text, text, int, int, bigint, bigint, bigint, bigint, numeric, numeric) from public;
grant execute on function public.create_production_lot(text, text, text, int, int, bigint, bigint, bigint, bigint, numeric, numeric) to authenticated;
