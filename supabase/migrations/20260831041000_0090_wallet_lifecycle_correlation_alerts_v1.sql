-- 0090_wallet_lifecycle_correlation_alerts_v1
-- Operational observability only. This migration does not mutate balances,
-- journal postings, transaction hashes, wallet addresses or settlement authority.

alter table public.wallet_intents_v2
  add column if not exists operational_correlation_id uuid not null default gen_random_uuid();

create unique index if not exists wallet_intents_v2_operational_correlation_id_unique
  on public.wallet_intents_v2 (operational_correlation_id);

create table if not exists public.wallet_chain_operational_alerts_v1 (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references public.wallet_intents_v2(id) on delete cascade,
  operational_correlation_id uuid not null,
  alert_kind text not null check (alert_kind in ('submission_stuck','reconciliation_stuck','confirmation_stuck')),
  state text not null default 'open' check (state in ('open','resolved')),
  lifecycle_status text not null check (lifecycle_status in ('submitted','pending_external','confirmed_external','reconciled','failed')),
  submitted_age_seconds bigint not null check (submitted_age_seconds >= 0),
  confirmations bigint null check (confirmations is null or confirmations >= 0),
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  resolved_at timestamptz null,
  constraint wallet_chain_operational_alerts_v1_intent_kind_unique unique (intent_id, alert_kind),
  constraint wallet_chain_operational_alerts_v1_correlation_fk
    foreign key (operational_correlation_id)
    references public.wallet_intents_v2(operational_correlation_id)
    on delete cascade,
  constraint wallet_chain_operational_alerts_v1_resolution_check
    check ((state = 'open' and resolved_at is null) or (state = 'resolved' and resolved_at is not null))
);

create index if not exists wallet_chain_operational_alerts_v1_open_idx
  on public.wallet_chain_operational_alerts_v1 (state, last_detected_at)
  where state = 'open';

alter table public.wallet_chain_operational_alerts_v1 enable row level security;

revoke all on table public.wallet_chain_operational_alerts_v1 from public, anon, authenticated;
grant select, insert, update on table public.wallet_chain_operational_alerts_v1 to service_role;

comment on column public.wallet_intents_v2.operational_correlation_id is
  'Opaque operational correlation UUID. Not authentication, idempotency or financial authority.';
comment on table public.wallet_chain_operational_alerts_v1 is
  'Service-only operational alert state. Intentionally excludes user ids, tx hashes, wallet/destination addresses and amounts.';
