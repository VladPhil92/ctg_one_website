-- CTG Craft Beer Investment OS — authoritative lot economics
--
-- Removes implicit financial defaults from lot creation. Beer Style Master Data
-- may provide editable presets, but every created lot stores a complete snapshot.
-- If a value has not been configured or explicitly supplied, lot creation fails
-- closed instead of silently inventing economics.

alter table public.investment_beer_styles
  add column if not exists standard_inc_rate numeric(7,6)
    check (standard_inc_rate is null or standard_inc_rate between 0 and 1),
  add column if not exists standard_advertising_rate_on_pre_inc numeric(7,6)
    check (standard_advertising_rate_on_pre_inc is null or standard_advertising_rate_on_pre_inc between 0 and 1);

comment on column public.investment_beer_styles.standard_inc_rate is
  'Optional current INC preset for new lots. Historical truth is the rate snapshotted on investment_production_lots.';
comment on column public.investment_beer_styles.standard_advertising_rate_on_pre_inc is
  'Optional current advertising preset for new lots. Historical truth is the rate snapshotted on investment_production_lots.';

-- Existing migration-era defaults were useful during bootstrap, but they are
-- dangerous once the platform is operational because an omitted value becomes a
-- financial fact. New rows must now receive every snapshot value explicitly.
alter table public.investment_production_lots
  alter column production_cost_unit_cents drop default,
  alter column label_cost_unit_cents drop default,
  alter column own_point_price_unit_cents drop default,
  alter column b2b_price_unit_cents drop default,
  alter column inc_rate drop default,
  alter column advertising_rate_on_pre_inc drop default;

-- The pre-master-data RPC remains in the schema only for migration/history
-- compatibility. New client execution is prohibited; Production OS must use the
-- style-backed function below.
revoke execute on function public.create_production_lot(text,text,text,int,int,bigint,bigint,bigint,bigint,numeric,numeric)
  from public, anon, authenticated;

create or replace function public.update_investment_beer_style_economics(
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
  v_style public.investment_beer_styles;
begin
  if not public.has_investment_permission('production.manage') then
    raise exception 'not authorized';
  end if;

  if p_production_cost_unit_cents is null or p_production_cost_unit_cents < 0 then
    raise exception 'production cost must be configured and non-negative';
  end if;
  if p_label_cost_unit_cents is null or p_label_cost_unit_cents < 0 then
    raise exception 'label cost must be configured and non-negative';
  end if;
  if p_own_point_price_unit_cents is null or p_own_point_price_unit_cents <= 0 then
    raise exception 'own-point price must be configured and positive';
  end if;
  if p_b2b_price_unit_cents is null or p_b2b_price_unit_cents <= 0 then
    raise exception 'B2B price must be configured and positive';
  end if;
  if p_inc_rate is null or p_inc_rate < 0 or p_inc_rate > 1 then
    raise exception 'INC rate must be configured between 0 and 1';
  end if;
  if p_advertising_rate_on_pre_inc is null or p_advertising_rate_on_pre_inc < 0 or p_advertising_rate_on_pre_inc > 1 then
    raise exception 'advertising rate must be configured between 0 and 1';
  end if;

  update public.investment_beer_styles
  set standard_production_cost_unit_cents = p_production_cost_unit_cents,
      standard_label_cost_unit_cents = p_label_cost_unit_cents,
      standard_own_point_price_unit_cents = p_own_point_price_unit_cents,
      standard_b2b_price_unit_cents = p_b2b_price_unit_cents,
      standard_inc_rate = p_inc_rate,
      standard_advertising_rate_on_pre_inc = p_advertising_rate_on_pre_inc,
      updated_at = now()
  where code = upper(trim(p_style_code)) and active = true
  returning * into v_style;

  if v_style is null then
    raise exception 'active beer style not found: %', p_style_code;
  end if;

  insert into public.investment_audit_log(actor_id, action, entity, entity_id, new_value)
  values (
    auth.uid(),
    'update_investment_beer_style_economics',
    'investment_beer_styles',
    v_style.id,
    jsonb_build_object(
      'style_code', v_style.code,
      'standard_production_cost_unit_cents', v_style.standard_production_cost_unit_cents,
      'standard_label_cost_unit_cents', v_style.standard_label_cost_unit_cents,
      'standard_own_point_price_unit_cents', v_style.standard_own_point_price_unit_cents,
      'standard_b2b_price_unit_cents', v_style.standard_b2b_price_unit_cents,
      'standard_inc_rate', v_style.standard_inc_rate,
      'standard_advertising_rate_on_pre_inc', v_style.standard_advertising_rate_on_pre_inc
    )
  );

  return v_style;
end;
$$;

revoke all on function public.update_investment_beer_style_economics(text,bigint,bigint,bigint,bigint,numeric,numeric) from public;
grant execute on function public.update_investment_beer_style_economics(text,bigint,bigint,bigint,bigint,numeric,numeric) to authenticated;

create or replace function public.create_production_lot_from_style(
  p_style_code text,
  p_destination text,
  p_total_cases int,
  p_case_size_units int default null,
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
  v_style public.investment_beer_styles;
  v_year int := extract(year from current_date)::int;
  v_sequence int;
  v_code text;
  v_case_size int;
  v_production_cost_unit_cents bigint;
  v_label_cost_unit_cents bigint;
  v_own_point_price_unit_cents bigint;
  v_b2b_price_unit_cents bigint;
  v_inc_rate numeric;
  v_advertising_rate_on_pre_inc numeric;
  v_lot_id uuid;
begin
  if not public.has_investment_permission('production.manage') then
    raise exception 'not authorized';
  end if;

  if p_destination is null or trim(p_destination) = '' then
    raise exception 'destination is required';
  end if;
  if p_total_cases is null or p_total_cases <= 0 then
    raise exception 'total cases must be positive';
  end if;

  select * into v_style
  from public.investment_beer_styles
  where code = upper(trim(p_style_code)) and active = true;

  if v_style is null then
    raise exception 'active beer style not found: %', p_style_code;
  end if;

  v_case_size := coalesce(p_case_size_units, v_style.units_per_case);
  v_production_cost_unit_cents := coalesce(p_production_cost_unit_cents, v_style.standard_production_cost_unit_cents);
  v_label_cost_unit_cents := coalesce(p_label_cost_unit_cents, v_style.standard_label_cost_unit_cents);
  v_own_point_price_unit_cents := coalesce(p_own_point_price_unit_cents, v_style.standard_own_point_price_unit_cents);
  v_b2b_price_unit_cents := coalesce(p_b2b_price_unit_cents, v_style.standard_b2b_price_unit_cents);
  v_inc_rate := coalesce(p_inc_rate, v_style.standard_inc_rate);
  v_advertising_rate_on_pre_inc := coalesce(p_advertising_rate_on_pre_inc, v_style.standard_advertising_rate_on_pre_inc);

  if v_case_size is null or v_case_size <= 0 then
    raise exception 'case size must be configured and positive';
  end if;
  if v_production_cost_unit_cents is null or v_production_cost_unit_cents < 0 then
    raise exception 'production cost must be configured before lot creation';
  end if;
  if v_label_cost_unit_cents is null or v_label_cost_unit_cents < 0 then
    raise exception 'label cost must be configured before lot creation';
  end if;
  if v_own_point_price_unit_cents is null or v_own_point_price_unit_cents <= 0 then
    raise exception 'own-point price must be configured before lot creation';
  end if;
  if v_b2b_price_unit_cents is null or v_b2b_price_unit_cents <= 0 then
    raise exception 'B2B price must be configured before lot creation';
  end if;
  if v_inc_rate is null or v_inc_rate < 0 or v_inc_rate > 1 then
    raise exception 'INC rate must be configured between 0 and 1';
  end if;
  if v_advertising_rate_on_pre_inc is null or v_advertising_rate_on_pre_inc < 0 or v_advertising_rate_on_pre_inc > 1 then
    raise exception 'advertising rate must be configured between 0 and 1';
  end if;
  if v_production_cost_unit_cents + v_label_cost_unit_cents <= 0 then
    raise exception 'total unit capital cost must be positive';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('ctg-production-lot:' || v_style.code || ':' || v_year::text, 0)
  );

  select coalesce(max(substring(code from '([0-9]{3})$')::int), 0) + 1
  into v_sequence
  from public.investment_production_lots
  where code like ('CTG-' || v_style.code || '-' || v_year::text || '-%')
    and code ~ ('^CTG-' || v_style.code || '-' || v_year::text || '-[0-9]{3}$');

  if v_sequence > 999 then
    raise exception 'annual lot sequence exhausted for style % in %', v_style.code, v_year;
  end if;

  v_code := 'CTG-' || v_style.code || '-' || v_year::text || '-' || lpad(v_sequence::text, 3, '0');

  insert into public.investment_production_lots (
    code, beer_style, beer_style_id, destination, total_cases, case_size_units,
    total_eligible_units, created_by, production_cost_unit_cents,
    label_cost_unit_cents, own_point_price_unit_cents, b2b_price_unit_cents,
    inc_rate, advertising_rate_on_pre_inc
  ) values (
    v_code, v_style.name, v_style.id, trim(p_destination), p_total_cases,
    v_case_size, p_total_cases, auth.uid(), v_production_cost_unit_cents,
    v_label_cost_unit_cents, v_own_point_price_unit_cents,
    v_b2b_price_unit_cents, v_inc_rate, v_advertising_rate_on_pre_inc
  ) returning id into v_lot_id;

  insert into public.investment_audit_log(actor_id, action, entity, entity_id, new_value)
  values (
    auth.uid(),
    'create_production_lot_from_style',
    'investment_production_lots',
    v_lot_id,
    jsonb_build_object(
      'code', v_code,
      'style_code', v_style.code,
      'beer_style', v_style.name,
      'total_cases', p_total_cases,
      'case_size_units', v_case_size,
      'destination', trim(p_destination),
      'production_cost_unit_cents', v_production_cost_unit_cents,
      'label_cost_unit_cents', v_label_cost_unit_cents,
      'own_point_price_unit_cents', v_own_point_price_unit_cents,
      'b2b_price_unit_cents', v_b2b_price_unit_cents,
      'inc_rate', v_inc_rate,
      'advertising_rate_on_pre_inc', v_advertising_rate_on_pre_inc
    )
  );

  return v_lot_id;
end;
$$;

revoke all on function public.create_production_lot_from_style(text,text,int,int,bigint,bigint,bigint,bigint,numeric,numeric) from public;
grant execute on function public.create_production_lot_from_style(text,text,int,int,bigint,bigint,bigint,bigint,numeric,numeric) to authenticated;
