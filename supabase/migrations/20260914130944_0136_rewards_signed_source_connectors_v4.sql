-- CTG Rewards Signed Source Connectors & Reconciliation v4
--
-- Safety boundary:
-- - source systems authenticate with Ed25519 signatures; CTG One stores public keys only;
-- - connector ingestion is disabled by default and remains shadow-only;
-- - nonce reservations, delivery attempts, config events and reconciliation runs are audit evidence;
-- - source connectors never receive browser or Rewards ledger privileges;
-- - no privilege or mutation path is added to reward_accounts or reward_ledger_entries.

create table public.reward_source_connectors (
  id uuid primary key default gen_random_uuid(),
  pilot_unit_id uuid not null unique references public.reward_pilot_units(id) on delete restrict,
  connector_code text not null unique check (connector_code ~ '^[a-z0-9][a-z0-9_-]{1,47}$'),
  name text not null check (char_length(name) between 2 and 100),
  source_domain text not null unique check (source_domain ~ '^[a-z0-9][a-z0-9_.-]{1,63}$'),
  auth_scheme text not null default 'ed25519_v1' check (auth_scheme = 'ed25519_v1'),
  public_key_pem text not null check (char_length(public_key_pem) between 80 and 2000),
  key_fingerprint_sha256 text not null check (key_fingerprint_sha256 ~ '^[0-9a-f]{64}$'),
  stage text not null default 'draft' check (stage in ('draft', 'validated', 'archived')),
  ingestion_enabled boolean not null default false,
  max_clock_skew_seconds integer not null default 300 check (max_clock_skew_seconds between 30 and 900),
  notes text check (notes is null or char_length(notes) <= 600),
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint reward_source_connector_enablement_check check (not ingestion_enabled or stage = 'validated')
);

create table public.reward_source_connector_event_allowlist (
  connector_id uuid not null references public.reward_source_connectors(id) on delete restrict,
  event_code text not null check (event_code ~ '^[a-z0-9][a-z0-9_.-]{1,63}$'),
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (connector_id, event_code)
);

create table public.reward_source_nonces (
  connector_id uuid not null references public.reward_source_connectors(id) on delete restrict,
  nonce text not null check (nonce ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$'),
  signed_at timestamptz not null,
  payload_digest text not null check (payload_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (connector_id, nonce)
);

create table public.reward_source_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid not null references public.reward_source_connectors(id) on delete restrict,
  request_nonce text not null check (request_nonce ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$'),
  signed_at timestamptz not null,
  payload_digest text not null check (payload_digest ~ '^[0-9a-f]{64}$'),
  signature_digest text not null check (signature_digest ~ '^[0-9a-f]{64}$'),
  key_fingerprint_sha256 text not null check (key_fingerprint_sha256 ~ '^[0-9a-f]{64}$'),
  external_event_id text check (external_event_id is null or external_event_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$'),
  event_code text check (event_code is null or event_code ~ '^[a-z0-9][a-z0-9_.-]{1,63}$'),
  outcome text not null check (outcome in (
    'accepted', 'idempotent_retry', 'invalid_signature', 'stale_timestamp',
    'connector_disabled', 'event_not_allowed', 'invalid_payload',
    'nonce_payload_conflict', 'idempotency_conflict', 'processing_failed'
  )),
  shadow_event_id uuid references public.reward_shadow_events(id) on delete restrict,
  http_status integer not null check (http_status between 200 and 599),
  detail_code text not null check (detail_code ~ '^[A-Z0-9][A-Z0-9_]{1,63}$'),
  created_at timestamptz not null default timezone('utc', now())
);

create table public.reward_source_connector_config_events (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid not null references public.reward_source_connectors(id) on delete restrict,
  event_type text not null check (event_type in (
    'created', 'validated', 'archived', 'enabled', 'disabled', 'key_rotated', 'allowlist_updated'
  )),
  config_snapshot jsonb not null check (jsonb_typeof(config_snapshot) = 'object'),
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.reward_source_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  connector_id uuid not null references public.reward_source_connectors(id) on delete restrict,
  window_start timestamptz not null,
  window_end timestamptz not null,
  export_digest text not null check (export_digest ~ '^[0-9a-f]{64}$'),
  declared_original_count integer not null check (declared_original_count >= 0),
  declared_reversal_count integer not null default 0 check (declared_reversal_count >= 0),
  declared_amount_cents bigint not null check (declared_amount_cents >= 0),
  observed_original_count integer not null check (observed_original_count >= 0),
  observed_reversal_count integer not null check (observed_reversal_count >= 0),
  observed_amount_cents bigint not null check (observed_amount_cents >= 0),
  accepted_delivery_count integer not null check (accepted_delivery_count >= 0),
  rejected_delivery_count integer not null check (rejected_delivery_count >= 0),
  hypothetical_eligible_points bigint not null check (hypothetical_eligible_points >= 0),
  original_count_delta integer not null,
  reversal_count_delta integer not null,
  amount_delta_cents bigint not null,
  status text not null check (status in ('matched', 'mismatch')),
  reconciliation_snapshot jsonb not null check (jsonb_typeof(reconciliation_snapshot) = 'object'),
  created_by uuid,
  created_at timestamptz not null default timezone('utc', now()),
  constraint reward_source_reconciliation_window_check check (window_end > window_start)
);

create index reward_source_delivery_connector_created_idx
  on public.reward_source_delivery_attempts (connector_id, created_at desc);
create index reward_source_delivery_outcome_created_idx
  on public.reward_source_delivery_attempts (outcome, created_at desc);
create index reward_source_config_events_connector_created_idx
  on public.reward_source_connector_config_events (connector_id, created_at desc);
create index reward_source_reconciliation_connector_created_idx
  on public.reward_source_reconciliation_runs (connector_id, created_at desc);

comment on table public.reward_source_connectors is
  'Signed source connector registry for Rewards v4 shadow ingestion. Public keys only; ingestion_enabled never authorizes ledger writes.';
comment on table public.reward_source_nonces is
  'Append-only signed request nonce reservations. Exact-payload retries may reuse a reserved nonce; changed payloads cannot.';
comment on table public.reward_source_delivery_attempts is
  'Append-only signed source delivery evidence. Accepted means accepted into the shadow engine, never credited to a Rewards balance.';
comment on table public.reward_source_reconciliation_runs is
  'Append-only comparison of source-declared aggregates with observed Rewards shadow evidence. No run settles or posts points.';

create or replace function private.rewards_source_connector_touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create trigger reward_source_connectors_touch_updated_at_trg
before update on public.reward_source_connectors
for each row execute function private.rewards_source_connector_touch_updated_at();

alter table public.reward_source_connectors enable row level security;
alter table public.reward_source_connector_event_allowlist enable row level security;
alter table public.reward_source_nonces enable row level security;
alter table public.reward_source_delivery_attempts enable row level security;
alter table public.reward_source_connector_config_events enable row level security;
alter table public.reward_source_reconciliation_runs enable row level security;

revoke all on table public.reward_source_connectors from public, anon, authenticated, service_role;
revoke all on table public.reward_source_connector_event_allowlist from public, anon, authenticated, service_role;
revoke all on table public.reward_source_nonces from public, anon, authenticated, service_role;
revoke all on table public.reward_source_delivery_attempts from public, anon, authenticated, service_role;
revoke all on table public.reward_source_connector_config_events from public, anon, authenticated, service_role;
revoke all on table public.reward_source_reconciliation_runs from public, anon, authenticated, service_role;

grant select, insert, update on table public.reward_source_connectors to service_role;
grant select, insert, delete on table public.reward_source_connector_event_allowlist to service_role;
grant select, insert on table public.reward_source_nonces to service_role;
grant select, insert on table public.reward_source_delivery_attempts to service_role;
grant select, insert on table public.reward_source_connector_config_events to service_role;
grant select, insert on table public.reward_source_reconciliation_runs to service_role;

revoke execute on function private.rewards_source_connector_touch_updated_at()
  from public, anon, authenticated, service_role;

-- Signed Source Connectors & Reconciliation v4 remains shadow-only.
-- No connector, signature, delivery attempt or reconciliation run can mutate reward_accounts or reward_ledger_entries.
