-- CTG One OS — Transactional Domain Event Outbox
--
-- Establishes a shared, database-authoritative integration event boundary.
-- Domain facts and their outbox events commit atomically in PostgreSQL.
-- This migration does NOT send email, WhatsApp, webhooks or broker messages.
-- Delivery is a later server-side concern that consumes the leasing RPCs below.

create table public.system_domain_event_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null
    check (event_type ~ '^[a-z][a-z0-9_.-]{2,127}$'),
  aggregate_type text not null
    check (aggregate_type ~ '^[a-z][a-z0-9_.-]{1,63}$'),
  aggregate_id uuid not null,
  dedupe_key text not null unique
    check (length(trim(dedupe_key)) between 8 and 255),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  published_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  last_error text,
  lease_token uuid,
  lease_expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint system_domain_event_outbox_lease_pair
    check ((lease_token is null) = (lease_expires_at is null))
);

comment on table public.system_domain_event_outbox is
  'Transactional integration-event outbox. Domain identity/payload is immutable; only delivery metadata changes. Not a ledger, audit log or participant-facing timeline.';

create index system_domain_event_outbox_pending_idx
  on public.system_domain_event_outbox(available_at, occurred_at, id)
  where published_at is null;

create index system_domain_event_outbox_aggregate_idx
  on public.system_domain_event_outbox(aggregate_type, aggregate_id, occurred_at, id);

create index system_domain_event_outbox_event_type_idx
  on public.system_domain_event_outbox(event_type, occurred_at, id);

alter table public.system_domain_event_outbox enable row level security;

-- No browser role receives table access. Delivery happens only through the
-- service-role RPC contract below. No RLS policy is intentionally defined:
-- authenticated/anon are deny-all even if a future grant is accidentally added.
revoke all on table public.system_domain_event_outbox from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Internal append helper. Trigger-owned only; service_role cannot forge domain
-- events by calling this helper directly.
-- ---------------------------------------------------------------------------
create function public._append_domain_event(
  p_event_type text,
  p_aggregate_type text,
  p_aggregate_id uuid,
  p_dedupe_key text,
  p_payload jsonb,
  p_occurred_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_aggregate_id is null then raise exception 'aggregate id is required'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'domain event payload must be a JSON object';
  end if;

  insert into public.system_domain_event_outbox(
    event_type,
    aggregate_type,
    aggregate_id,
    dedupe_key,
    payload,
    occurred_at
  ) values (
    lower(trim(p_event_type)),
    lower(trim(p_aggregate_type)),
    p_aggregate_id,
    trim(p_dedupe_key),
    p_payload,
    coalesce(p_occurred_at, now())
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public._append_domain_event(text,text,uuid,text,jsonb,timestamptz)
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Immutable event identity/payload. Delivery bookkeeping is mutable only via
-- the service RPCs further below.
-- ---------------------------------------------------------------------------
create function public._guard_domain_event_outbox_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'domain event outbox rows are append-only and cannot be deleted';
  end if;

  if new.id is distinct from old.id
     or new.event_type is distinct from old.event_type
     or new.aggregate_type is distinct from old.aggregate_type
     or new.aggregate_id is distinct from old.aggregate_id
     or new.dedupe_key is distinct from old.dedupe_key
     or new.payload is distinct from old.payload
     or new.occurred_at is distinct from old.occurred_at
     or new.created_at is distinct from old.created_at then
    raise exception 'domain event identity and payload are immutable';
  end if;

  if new.attempt_count < old.attempt_count then
    raise exception 'domain event attempt_count cannot decrease';
  end if;

  if old.published_at is not null and new.published_at is distinct from old.published_at then
    raise exception 'published domain event cannot be unpublished or republished';
  end if;

  return new;
end;
$$;

revoke all on function public._guard_domain_event_outbox_mutation()
  from public, anon, authenticated, service_role;

create trigger system_domain_event_outbox_immutable_guard
before update or delete on public.system_domain_event_outbox
for each row execute function public._guard_domain_event_outbox_mutation();

-- ---------------------------------------------------------------------------
-- Leasing delivery contract. Multiple future workers can claim safely using
-- FOR UPDATE SKIP LOCKED. A stale worker cannot complete/fail a lease after a
-- newer worker has reclaimed the event because the lease token must match.
-- ---------------------------------------------------------------------------
create function public.claim_domain_events(
  p_limit integer default 25,
  p_lease_seconds integer default 120
)
returns table(
  id uuid,
  event_type text,
  aggregate_type text,
  aggregate_id uuid,
  dedupe_key text,
  payload jsonb,
  occurred_at timestamptz,
  attempt_count integer,
  lease_token uuid,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception 'p_limit must be between 1 and 100';
  end if;
  if p_lease_seconds is null or p_lease_seconds < 30 or p_lease_seconds > 900 then
    raise exception 'p_lease_seconds must be between 30 and 900';
  end if;

  return query
  with candidates as (
    select o.id
    from public.system_domain_event_outbox o
    where o.published_at is null
      and o.available_at <= now()
      and (o.lease_expires_at is null or o.lease_expires_at <= now())
    order by o.available_at, o.occurred_at, o.id
    for update skip locked
    limit p_limit
  )
  update public.system_domain_event_outbox o
  set lease_token = gen_random_uuid(),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      attempt_count = o.attempt_count + 1,
      last_attempt_at = now(),
      last_error = null
  from candidates c
  where o.id = c.id
  returning
    o.id,
    o.event_type,
    o.aggregate_type,
    o.aggregate_id,
    o.dedupe_key,
    o.payload,
    o.occurred_at,
    o.attempt_count,
    o.lease_token,
    o.lease_expires_at;
end;
$$;

create function public.complete_domain_event_delivery(
  p_event_id uuid,
  p_lease_token uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.system_domain_event_outbox
  set published_at = now(),
      lease_token = null,
      lease_expires_at = null,
      last_error = null
  where id = p_event_id
    and published_at is null
    and lease_token = p_lease_token;

  if not found then
    raise exception 'domain event lease is stale, missing or already completed';
  end if;
end;
$$;

create function public.fail_domain_event_delivery(
  p_event_id uuid,
  p_lease_token uuid,
  p_error text,
  p_retry_after_seconds integer default 60
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_retry_after_seconds is null or p_retry_after_seconds < 5 or p_retry_after_seconds > 86400 then
    raise exception 'p_retry_after_seconds must be between 5 and 86400';
  end if;

  update public.system_domain_event_outbox
  set available_at = now() + make_interval(secs => p_retry_after_seconds),
      lease_token = null,
      lease_expires_at = null,
      last_error = left(coalesce(nullif(trim(p_error),''),'delivery failed'), 2000)
  where id = p_event_id
    and published_at is null
    and lease_token = p_lease_token;

  if not found then
    raise exception 'domain event lease is stale, missing or already completed';
  end if;
end;
$$;

revoke all on function public.claim_domain_events(integer,integer) from public, anon, authenticated;
revoke all on function public.complete_domain_event_delivery(uuid,uuid) from public, anon, authenticated;
revoke all on function public.fail_domain_event_delivery(uuid,uuid,text,integer) from public, anon, authenticated;
grant execute on function public.claim_domain_events(integer,integer) to service_role;
grant execute on function public.complete_domain_event_delivery(uuid,uuid) to service_role;
grant execute on function public.fail_domain_event_delivery(uuid,uuid,text,integer) to service_role;

-- ---------------------------------------------------------------------------
-- Domain adapters. These triggers emit only facts that are already authoritative
-- and unambiguous. They do not change the source-of-truth tables.
-- ---------------------------------------------------------------------------
create function public._outbox_payment_receipt_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._append_domain_event(
    'investment.payment.reconciled',
    'investment_order',
    new.order_id,
    'payment-receipt:' || new.id::text,
    jsonb_build_object(
      'receipt_id', new.id,
      'order_id', new.order_id,
      'participant_user_id', new.participant_user_id,
      'amount_cents', new.amount_cents,
      'currency', new.currency,
      'payment_rail', new.payment_rail,
      'provider_code', new.provider_code,
      'settled_at', new.settled_at
    ),
    new.reconciled_at
  );
  return new;
end;
$$;

create function public._outbox_settlement_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._append_domain_event(
    'investment.settlement.completed',
    'investment_lot',
    new.lot_id,
    'settlement:' || new.id::text,
    jsonb_build_object(
      'settlement_id', new.id,
      'lot_id', new.lot_id,
      'formula_version_id', new.formula_version_id,
      'net_distributable_profit_cents', new.net_distributable_profit_cents,
      'total_eligible_units', new.total_eligible_units,
      'finalized_at', new.finalized_at
    ),
    new.finalized_at
  );
  return new;
end;
$$;

create function public._outbox_payout_confirmation_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payout public.investment_payouts;
begin
  select * into v_payout
  from public.investment_payouts
  where id = new.payout_id;

  if v_payout is null then
    raise exception 'payout not found for confirmed payout event';
  end if;

  perform public._append_domain_event(
    'investment.payout.confirmed',
    'investment_withdrawal',
    v_payout.withdrawal_request_id,
    'payout-confirmed:' || new.id::text,
    jsonb_build_object(
      'payout_event_id', new.id,
      'payout_id', v_payout.id,
      'withdrawal_request_id', v_payout.withdrawal_request_id,
      'participant_user_id', v_payout.participant_user_id,
      'amount_cents', v_payout.amount_cents,
      'currency', v_payout.currency,
      'payout_rail', v_payout.payout_rail,
      'provider_code', v_payout.provider_code,
      'occurred_at', new.occurred_at
    ),
    new.occurred_at
  );
  return new;
end;
$$;

revoke all on function public._outbox_payment_receipt_insert() from public, anon, authenticated, service_role;
revoke all on function public._outbox_settlement_insert() from public, anon, authenticated, service_role;
revoke all on function public._outbox_payout_confirmation_insert() from public, anon, authenticated, service_role;

create trigger investment_payment_receipts_domain_event
  after insert on public.investment_payment_receipts
  for each row execute function public._outbox_payment_receipt_insert();

create trigger investment_settlements_domain_event
  after insert on public.investment_settlements
  for each row execute function public._outbox_settlement_insert();

create trigger investment_payout_confirmation_domain_event
  after insert on public.investment_payout_events
  for each row
  when (new.event_type = 'CONFIRMED')
  execute function public._outbox_payout_confirmation_insert();
