-- CTG Rewards Pilot Control Plane v2
--
-- Governance boundary:
-- - stores candidate pilot units and rule drafts for simulation only;
-- - stages are limited to draft, validated and archived;
-- - no active/live state exists in this schema;
-- - no privilege is added to reward_accounts or reward_ledger_entries;
-- - no function in this migration can mutate a Rewards balance or ledger.

create table public.reward_pilot_units (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9_-]{1,47}$'),
  name text not null check (char_length(name) between 2 and 100),
  source_domain text not null unique check (source_domain ~ '^[a-z0-9][a-z0-9_.-]{1,63}$'),
  stage text not null default 'draft' check (stage in ('draft', 'validated', 'archived')),
  notes text check (notes is null or char_length(notes) <= 600),
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.reward_rule_drafts (
  id uuid primary key default gen_random_uuid(),
  pilot_unit_id uuid not null references public.reward_pilot_units(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 120),
  event_code text not null check (event_code ~ '^[a-z0-9][a-z0-9_.-]{1,63}$'),
  calculation_type text not null check (calculation_type in ('fixed_points', 'points_per_cop_block')),
  fixed_points bigint,
  points_per_block bigint,
  cop_block_cents bigint,
  minimum_amount_cents bigint not null default 0 check (minimum_amount_cents >= 0),
  maximum_points_per_event bigint check (maximum_points_per_event is null or maximum_points_per_event > 0),
  stage text not null default 'draft' check (stage in ('draft', 'validated', 'archived')),
  notes text check (notes is null or char_length(notes) <= 600),
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint reward_rule_formula_shape_check check (
    (calculation_type = 'fixed_points'
      and fixed_points is not null and fixed_points > 0
      and points_per_block is null and cop_block_cents is null)
    or
    (calculation_type = 'points_per_cop_block'
      and fixed_points is null
      and points_per_block is not null and points_per_block > 0
      and cop_block_cents is not null and cop_block_cents > 0)
  ),
  constraint reward_rule_drafts_unit_event_name_uidx unique (pilot_unit_id, event_code, name)
);

create table public.reward_rule_simulations (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.reward_rule_drafts(id) on delete restrict,
  input_amount_cents bigint not null check (input_amount_cents >= 0),
  calculated_points bigint not null check (calculated_points >= 0),
  calculation_snapshot jsonb not null check (jsonb_typeof(calculation_snapshot) = 'object'),
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create index reward_rule_drafts_unit_stage_idx
  on public.reward_rule_drafts (pilot_unit_id, stage, created_at desc);
create index reward_rule_simulations_rule_created_idx
  on public.reward_rule_simulations (rule_id, created_at desc);

comment on table public.reward_pilot_units is
  'CTG Rewards pilot control-plane units. Draft/validated metadata only; never activates earning or redemption.';
comment on table public.reward_rule_drafts is
  'Simulation-only CTG Rewards rule drafts. No row in this table authorizes reward ledger writes.';
comment on table public.reward_rule_simulations is
  'Auditable simulation outputs. These rows do not create, reserve, or redeem points.';

create or replace function private.rewards_pilot_touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create trigger reward_pilot_units_touch_updated_at_trg
before update on public.reward_pilot_units
for each row execute function private.rewards_pilot_touch_updated_at();

create trigger reward_rule_drafts_touch_updated_at_trg
before update on public.reward_rule_drafts
for each row execute function private.rewards_pilot_touch_updated_at();

alter table public.reward_pilot_units enable row level security;
alter table public.reward_rule_drafts enable row level security;
alter table public.reward_rule_simulations enable row level security;

revoke all on table public.reward_pilot_units from public, anon, authenticated, service_role;
revoke all on table public.reward_rule_drafts from public, anon, authenticated, service_role;
revoke all on table public.reward_rule_simulations from public, anon, authenticated, service_role;

grant select, insert, update on table public.reward_pilot_units to service_role;
grant select, insert, update on table public.reward_rule_drafts to service_role;
grant select, insert on table public.reward_rule_simulations to service_role;

revoke execute on function private.rewards_pilot_touch_updated_at()
  from public, anon, authenticated, service_role;

-- Pilot Control Plane v2 is intentionally simulation-only.
-- It grants no privileges on reward_accounts or reward_ledger_entries and creates no balance mutation RPC.
