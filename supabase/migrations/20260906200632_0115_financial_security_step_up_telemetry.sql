-- Fase 5B — Durable Financial Security Journal
--
-- Append-only, server-only security journal for privileged financial-control
-- requests. No bank references, transaction hashes, payout destinations, notes,
-- tokens, OTPs, emails, or raw request bodies are accepted by this contract.

create table if not exists public.financial_security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'FINANCIAL_STEP_UP_REQUIRED',
    'FINANCIAL_AUTHORIZATION_UNAVAILABLE',
    'FINANCIAL_AUTHORIZATION_DENIED',
    'FINANCIAL_OPERATION_REJECTED',
    'FINANCIAL_OPERATION_SUCCEEDED'
  )),
  severity text not null check (severity in ('INFO', 'WARN', 'HIGH')),
  actor_user_id uuid references auth.users(id) on delete set null,
  operation text not null check (operation in (
    'withdrawal.approve',
    'withdrawal.reject',
    'role.set',
    'funding.verifyBankTransfer',
    'funding.verifyCryptoTransfer',
    'payout.initiate',
    'payout.confirm',
    'payout.fail'
  )),
  outcome text not null check (outcome in ('BLOCKED', 'ERROR', 'REJECTED', 'SUCCEEDED')),
  reason_code text check (reason_code is null or reason_code ~ '^[A-Z0-9_.-]{1,64}$'),
  transport text not null check (transport in ('bearer', 'cookie')),
  actor_auth_age_seconds integer check (actor_auth_age_seconds is null or actor_auth_age_seconds >= 0),
  correlation_id uuid not null,
  request_path text not null default '/api/investment/admin/financial-control'
    check (request_path = '/api/investment/admin/financial-control'),
  occurred_at timestamptz not null default now()
);

create index if not exists financial_security_events_occurred_at_idx
  on public.financial_security_events (occurred_at desc);
create index if not exists financial_security_events_actor_occurred_at_idx
  on public.financial_security_events (actor_user_id, occurred_at desc);
create index if not exists financial_security_events_operation_occurred_at_idx
  on public.financial_security_events (operation, occurred_at desc);
create index if not exists financial_security_events_correlation_idx
  on public.financial_security_events (correlation_id);

alter table public.financial_security_events enable row level security;
revoke all on table public.financial_security_events from public, anon, authenticated, service_role;

create or replace function public._prevent_financial_security_event_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'FINANCIAL_SECURITY_EVENT_IMMUTABLE';
end;
$$;

revoke all on function public._prevent_financial_security_event_mutation()
from public, anon, authenticated, service_role;

drop trigger if exists financial_security_events_immutable
  on public.financial_security_events;
create trigger financial_security_events_immutable
before update or delete on public.financial_security_events
for each row execute function public._prevent_financial_security_event_mutation();

create or replace function public.record_financial_security_event_server(
  p_actor_user_id uuid,
  p_event_type text,
  p_operation text,
  p_reason_code text,
  p_transport text,
  p_actor_auth_age_seconds integer,
  p_correlation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_severity text;
  v_outcome text;
begin
  if p_actor_user_id is null then
    raise exception 'FINANCIAL_SECURITY_ACTOR_REQUIRED';
  end if;
  if p_correlation_id is null then
    raise exception 'FINANCIAL_SECURITY_CORRELATION_REQUIRED';
  end if;
  if p_transport not in ('bearer', 'cookie') then
    raise exception 'FINANCIAL_SECURITY_TRANSPORT_INVALID';
  end if;
  if p_actor_auth_age_seconds is not null and p_actor_auth_age_seconds < 0 then
    raise exception 'FINANCIAL_SECURITY_AUTH_AGE_INVALID';
  end if;
  if p_reason_code is not null and p_reason_code !~ '^[A-Z0-9_.-]{1,64}$' then
    raise exception 'FINANCIAL_SECURITY_REASON_CODE_INVALID';
  end if;

  case p_event_type
    when 'FINANCIAL_STEP_UP_REQUIRED' then
      v_severity := 'WARN';
      v_outcome := 'BLOCKED';
    when 'FINANCIAL_AUTHORIZATION_UNAVAILABLE' then
      v_severity := 'HIGH';
      v_outcome := 'ERROR';
    when 'FINANCIAL_AUTHORIZATION_DENIED' then
      v_severity := 'HIGH';
      v_outcome := 'BLOCKED';
    when 'FINANCIAL_OPERATION_REJECTED' then
      v_severity := 'WARN';
      v_outcome := 'REJECTED';
    when 'FINANCIAL_OPERATION_SUCCEEDED' then
      v_severity := 'INFO';
      v_outcome := 'SUCCEEDED';
    else
      raise exception 'FINANCIAL_SECURITY_EVENT_TYPE_INVALID';
  end case;

  if p_operation not in (
    'withdrawal.approve',
    'withdrawal.reject',
    'role.set',
    'funding.verifyBankTransfer',
    'funding.verifyCryptoTransfer',
    'payout.initiate',
    'payout.confirm',
    'payout.fail'
  ) then
    raise exception 'FINANCIAL_SECURITY_OPERATION_INVALID';
  end if;

  insert into public.financial_security_events (
    event_type,
    severity,
    actor_user_id,
    operation,
    outcome,
    reason_code,
    transport,
    actor_auth_age_seconds,
    correlation_id
  ) values (
    p_event_type,
    v_severity,
    p_actor_user_id,
    p_operation,
    v_outcome,
    p_reason_code,
    p_transport,
    p_actor_auth_age_seconds,
    p_correlation_id
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.record_financial_security_event_server(
  uuid, text, text, text, text, integer, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.record_financial_security_event_server(
  uuid, text, text, text, text, integer, uuid
) to service_role;

comment on table public.financial_security_events is
  'Append-only server-only security telemetry for privileged Finance OS controls. Sensitive financial payload values are intentionally excluded.';
comment on function public.record_financial_security_event_server(uuid, text, text, text, text, integer, uuid) is
  'Server-only structured security event recorder. Accepts only categorical metadata; never raw financial request data.';

do $$
declare
  v_rpc oid := to_regprocedure('public.record_financial_security_event_server(uuid,text,text,text,text,integer,uuid)');
begin
  if v_rpc is null then
    raise exception '0115 security telemetry RPC missing';
  end if;
  if has_function_privilege('public', v_rpc, 'EXECUTE')
     or has_function_privilege('anon', v_rpc, 'EXECUTE')
     or has_function_privilege('authenticated', v_rpc, 'EXECUTE') then
    raise exception '0115 security telemetry RPC exposed to client roles';
  end if;
  if not has_function_privilege('service_role', v_rpc, 'EXECUTE') then
    raise exception '0115 security telemetry RPC unavailable to service_role';
  end if;
  if has_table_privilege('anon', 'public.financial_security_events', 'SELECT')
     or has_table_privilege('authenticated', 'public.financial_security_events', 'SELECT')
     or has_table_privilege('service_role', 'public.financial_security_events', 'SELECT') then
    raise exception '0115 security event journal readable through PostgREST roles';
  end if;
  if not exists (
    select 1 from pg_class
    where oid = 'public.financial_security_events'::regclass
      and relrowsecurity
  ) then
    raise exception '0115 security event journal must have RLS enabled';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.financial_security_events'::regclass
      and tgname = 'financial_security_events_immutable'
      and not tgisinternal
  ) then
    raise exception '0115 security event journal immutability trigger missing';
  end if;
end $$;
