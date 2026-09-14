-- CTG Rewards Shadow Earning Engine v3
--
-- Safety boundary:
-- - evaluates source events in shadow mode only;
-- - kill switch defaults CLOSED;
-- - source events and evaluations are append-only;
-- - idempotency is enforced per source_domain + external_event_id;
-- - reversals are modeled explicitly and uniquely;
-- - no privilege or mutation path is added to reward_accounts or reward_ledger_entries.

create unique index reward_rule_drafts_validated_event_uidx
  on public.reward_rule_drafts (pilot_unit_id, event_code)
  where stage = 'validated';

create table public.reward_shadow_runtime_config (
  id smallint primary key default 1 check (id = 1),
  processing_enabled boolean not null default false,
  max_amount_cents bigint not null default 100000000 check (max_amount_cents between 1 and 1000000000000),
  max_points_per_event bigint not null default 10000 check (max_points_per_event between 1 and 1000000000000),
  max_events_per_subject_per_day integer not null default 20 check (max_events_per_subject_per_day between 1 and 1000),
  updated_reason text not null default 'v3_default_kill_switch_closed' check (char_length(updated_reason) between 4 and 300),
  updated_by uuid,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.reward_shadow_runtime_config (
  id, processing_enabled, max_amount_cents, max_points_per_event, max_events_per_subject_per_day, updated_reason
) values (
  1, false, 100000000, 10000, 20, 'v3_default_kill_switch_closed'
);

create table public.reward_shadow_events (
  id uuid primary key default gen_random_uuid(),
  source_domain text not null check (source_domain ~ '^[a-z0-9][a-z0-9_.-]{1,63}$'),
  external_event_id text not null check (external_event_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$'),
  event_code text not null check (event_code ~ '^[a-z0-9][a-z0-9_.-]{1,63}$'),
  subject_user_id uuid not null,
  amount_cents bigint not null check (amount_cents between 0 and 1000000000000),
  event_kind text not null default 'original' check (event_kind in ('original', 'reversal')),
  reversal_of_event_id uuid references public.reward_shadow_events(id) on delete restrict,
  payload_digest text not null check (payload_digest ~ '^[0-9a-fA-F]{64}$'),
  occurred_at timestamptz not null,
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  constraint reward_shadow_event_reversal_shape_check check (
    (event_kind = 'original' and reversal_of_event_id is null)
    or (event_kind = 'reversal' and reversal_of_event_id is not null)
  ),
  constraint reward_shadow_events_source_external_uidx unique (source_domain, external_event_id)
);

create unique index reward_shadow_events_single_reversal_uidx
  on public.reward_shadow_events (reversal_of_event_id)
  where event_kind = 'reversal';

create index reward_shadow_events_subject_occurred_idx
  on public.reward_shadow_events (subject_user_id, occurred_at desc);
create index reward_shadow_events_source_event_idx
  on public.reward_shadow_events (source_domain, event_code, occurred_at desc);

create table public.reward_shadow_evaluations (
  id uuid primary key default gen_random_uuid(),
  source_event_id uuid not null unique references public.reward_shadow_events(id) on delete restrict,
  pilot_unit_id uuid references public.reward_pilot_units(id) on delete restrict,
  rule_id uuid references public.reward_rule_drafts(id) on delete restrict,
  decision text not null check (decision in ('eligible', 'ineligible', 'blocked', 'no_unit', 'no_rule', 'reversal')),
  direction text not null check (direction in ('credit', 'debit', 'none')),
  calculated_points bigint not null default 0 check (calculated_points between 0 and 1000000000000),
  reason_code text not null check (reason_code ~ '^[a-z0-9][a-z0-9_.-]{1,63}$'),
  rule_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(rule_snapshot) = 'object'),
  runtime_snapshot jsonb not null check (jsonb_typeof(runtime_snapshot) = 'object'),
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  constraint reward_shadow_evaluation_direction_check check (
    (decision = 'eligible' and direction = 'credit' and calculated_points > 0)
    or (decision = 'reversal' and direction = 'debit')
    or (decision in ('ineligible', 'blocked', 'no_unit', 'no_rule') and direction = 'none' and calculated_points = 0)
  )
);

create index reward_shadow_evaluations_decision_created_idx
  on public.reward_shadow_evaluations (decision, created_at desc);
create index reward_shadow_evaluations_rule_created_idx
  on public.reward_shadow_evaluations (rule_id, created_at desc)
  where rule_id is not null;

comment on table public.reward_shadow_runtime_config is
  'Singleton safety controls for CTG Rewards shadow evaluation. processing_enabled never authorizes ledger writes.';
comment on table public.reward_shadow_events is
  'Append-only source event envelopes for Rewards shadow evaluation. No row creates points.';
comment on table public.reward_shadow_evaluations is
  'Append-only hypothetical earning/reversal decisions. Calculated points are non-binding and never touch reward balances.';

alter table public.reward_shadow_runtime_config enable row level security;
alter table public.reward_shadow_events enable row level security;
alter table public.reward_shadow_evaluations enable row level security;

revoke all on table public.reward_shadow_runtime_config from public, anon, authenticated, service_role;
revoke all on table public.reward_shadow_events from public, anon, authenticated, service_role;
revoke all on table public.reward_shadow_evaluations from public, anon, authenticated, service_role;

grant select, update on table public.reward_shadow_runtime_config to service_role;
grant select, insert on table public.reward_shadow_events to service_role;
grant select, insert on table public.reward_shadow_evaluations to service_role;

-- Shadow Earning Engine v3 intentionally has zero Rewards ledger authority.
-- Reversals are shadow evidence only; they do not debit reward_accounts or reward_ledger_entries.
