-- CTG Craft Beer Investment OS — Beer Style Master Data + authoritative lot codes
-- Additive migration. Existing production lots and the legacy create_production_lot RPC remain valid.
-- New lots should use create_production_lot_from_style(), which generates the display code
-- transactionally inside PostgreSQL instead of trusting a frontend-computed sequence.

create table if not exists public.investment_beer_styles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9]{2,12}$'),
  slug text not null unique check (slug = lower(slug)),
  name text not null unique,
  description text,
  abv_target numeric(5,2) check (abv_target is null or (abv_target >= 0 and abv_target <= 30)),
  units_per_case int not null default 24 check (units_per_case > 0),
  standard_production_cost_unit_cents bigint check (standard_production_cost_unit_cents is null or standard_production_cost_unit_cents >= 0),
  standard_label_cost_unit_cents bigint check (standard_label_cost_unit_cents is null or standard_label_cost_unit_cents >= 0),
  standard_own_point_price_unit_cents bigint check (standard_own_point_price_unit_cents is null or standard_own_point_price_unit_cents >= 0),
  standard_b2b_price_unit_cents bigint check (standard_b2b_price_unit_cents is null or standard_b2b_price_unit_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.investment_beer_styles is
  'Authoritative CTG Craft Beer style catalog. Commercial/cost presets are nullable until formally approved; lot rows continue to snapshot their own economics.';

insert into public.investment_beer_styles (code, slug, name, units_per_case)
values
  ('GOLD', 'golden-pale-ale', 'Golden Pale Ale', 24),
  ('IRA', 'irish-red-ale', 'Irish Red Ale', 24),
  ('POR', 'porter', 'Porter', 24),
  ('HEF', 'oktoberfest-hefeweizen', 'Oktoberfest Hefeweizen', 24)
on conflict (code) do update
set slug = excluded.slug,
    name = excluded.name,
    updated_at = now();

-- Keep the historical text snapshot while adding a relational link for new/read-model use.
alter table public.investment_production_lots
  add column if not exists beer_style_id uuid references public.investment_beer_styles(id);

create index if not exists investment_production_lots_beer_style_id_idx
  on public.investment_production_lots(beer_style_id);

-- Best-effort backfill for the four canonical styles. Legacy/custom rows remain valid with NULL beer_style_id.
update public.investment_production_lots l
set beer_style_id = s.id
from public.investment_beer_styles s
where l.beer_style_id is null
  and lower(trim(l.beer_style)) = lower(trim(s.name));

alter table public.investment_beer_styles enable row level security;

drop policy if exists investment_beer_styles_public_read on public.investment_beer_styles;
create policy investment_beer_styles_public_read
  on public.investment_beer_styles
  for select
  to anon, authenticated
  using (active = true or public.has_investment_permission('production.manage'));

revoke insert, update, delete on public.investment_beer_styles from anon, authenticated;
grant select on public.investment_beer_styles to anon, authenticated;

-- Creates a lot and allocates the code under a per-style/per-year advisory transaction lock.
-- The UNIQUE constraint already present on investment_production_lots.code remains the final invariant.
create or replace function public.create_production_lot_from_style(
  p_style_code text,
  p_destination text,
  p_total_cases int,
  p_case_size_units int default null,
  p_production_cost_unit_cents bigint default 600000,
  p_label_cost_unit_cents bigint default 90000,
  p_own_point_price_unit_cents bigint default 1800000,
  p_b2b_price_unit_cents bigint default 800000,
  p_inc_rate numeric default 0.08,
  p_advertising_rate_on_pre_inc numeric default 0.035
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
  if p_inc_rate is null or p_inc_rate < 0 or p_inc_rate > 1 then
    raise exception 'INC rate must be between 0 and 1';
  end if;
  if p_advertising_rate_on_pre_inc is null or p_advertising_rate_on_pre_inc < 0 or p_advertising_rate_on_pre_inc > 1 then
    raise exception 'advertising rate must be between 0 and 1';
  end if;

  select * into v_style
  from public.investment_beer_styles
  where code = upper(trim(p_style_code)) and active = true;

  if v_style is null then
    raise exception 'active beer style not found: %', p_style_code;
  end if;

  v_case_size := coalesce(p_case_size_units, v_style.units_per_case);
  if v_case_size <= 0 then
    raise exception 'case size must be positive';
  end if;

  -- Serialize allocation of the next human-readable code for this style/year.
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
    code,
    beer_style,
    beer_style_id,
    destination,
    total_cases,
    case_size_units,
    total_eligible_units,
    created_by,
    production_cost_unit_cents,
    label_cost_unit_cents,
    own_point_price_unit_cents,
    b2b_price_unit_cents,
    inc_rate,
    advertising_rate_on_pre_inc
  ) values (
    v_code,
    v_style.name,
    v_style.id,
    trim(p_destination),
    p_total_cases,
    v_case_size,
    p_total_cases,
    auth.uid(),
    p_production_cost_unit_cents,
    p_label_cost_unit_cents,
    p_own_point_price_unit_cents,
    p_b2b_price_unit_cents,
    p_inc_rate,
    p_advertising_rate_on_pre_inc
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
      'destination', trim(p_destination)
    )
  );

  return v_lot_id;
end;
$$;

revoke all on function public.create_production_lot_from_style(text,text,int,int,bigint,bigint,bigint,bigint,numeric,numeric) from public;
grant execute on function public.create_production_lot_from_style(text,text,int,int,bigint,bigint,bigint,bigint,numeric,numeric) to authenticated;
