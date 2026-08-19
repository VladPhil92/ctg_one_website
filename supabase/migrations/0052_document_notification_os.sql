-- CTG One OS — Document / Notification OS foundation
--
-- Consumes committed domain events into idempotent internal work queues.
-- This migration does NOT send email, WhatsApp, SMS or external webhooks and
-- does NOT generate participant-visible documents. External transports and
-- renderers remain separate service-role workers.

create table public.system_notification_templates (
  template_key text not null,
  version integer not null check (version > 0),
  event_type text not null check (event_type ~ '^[a-z][a-z0-9_.-]{2,127}$'),
  channel text not null check (channel in ('IN_APP','EMAIL','WHATSAPP')),
  subject_template text not null default '',
  body_template text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (template_key, version),
  constraint system_notification_templates_key_format
    check (template_key ~ '^[a-z][a-z0-9_.-]{2,127}$')
);

comment on table public.system_notification_templates is
  'Immutable, versioned notification templates. Initial production materialization uses IN_APP only; external channels require a separate verified transport worker.';

create table public.system_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  domain_event_id uuid not null references public.system_domain_event_outbox(id),
  recipient_user_id uuid not null,
  channel text not null check (channel in ('IN_APP','EMAIL','WHATSAPP')),
  template_key text not null,
  template_version integer not null,
  variables jsonb not null default '{}'::jsonb check (jsonb_typeof(variables) = 'object'),
  status text not null default 'QUEUED' check (status in ('QUEUED','PROCESSING','SENT','FAILED','CANCELLED')),
  available_at timestamptz not null default now(),
  delivered_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  last_error text,
  lease_token uuid,
  lease_expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint system_notification_delivery_template_fk
    foreign key (template_key, template_version)
    references public.system_notification_templates(template_key, version),
  constraint system_notification_delivery_lease_pair
    check ((lease_token is null) = (lease_expires_at is null)),
  constraint system_notification_delivery_once
    unique (domain_event_id, recipient_user_id, channel, template_key, template_version)
);

comment on table public.system_notification_deliveries is
  'Idempotent notification intents derived from domain events. A row is not evidence of external delivery until delivered_at/status=SENT.';

create table public.system_notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.system_notification_deliveries(id),
  attempt_no integer not null check (attempt_no > 0),
  outcome text not null check (outcome in ('SENT','FAILED')),
  provider_code text,
  provider_message_id text,
  error_detail text,
  attempted_at timestamptz not null default now(),
  unique (delivery_id, attempt_no)
);

comment on table public.system_notification_delivery_attempts is
  'Append-only transport attempt ledger for notification delivery. It is not a financial ledger.';

create table public.system_document_jobs (
  id uuid primary key default gen_random_uuid(),
  domain_event_id uuid not null references public.system_domain_event_outbox(id),
  document_type text not null check (document_type ~ '^[a-z][a-z0-9_.-]{2,127}$'),
  owner_type text not null check (owner_type ~ '^[a-z][a-z0-9_.-]{1,63}$'),
  owner_id uuid not null,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'QUEUED' check (status in ('QUEUED','PROCESSING','READY','FAILED','CANCELLED')),
  storage_path text,
  content_sha256 text,
  available_at timestamptz not null default now(),
  completed_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  last_error text,
  lease_token uuid,
  lease_expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint system_document_job_lease_pair
    check ((lease_token is null) = (lease_expires_at is null)),
  constraint system_document_job_once
    unique (domain_event_id, document_type, owner_type, owner_id),
  constraint system_document_ready_fields
    check ((status = 'READY') = (completed_at is not null and storage_path is not null and content_sha256 is not null))
);

comment on table public.system_document_jobs is
  'Idempotent document-generation work queue derived from domain events. READY means a renderer produced a stored artifact with a recorded digest.';

create index system_notification_deliveries_pending_idx
  on public.system_notification_deliveries(available_at, created_at, id)
  where delivered_at is null and status in ('QUEUED','FAILED');

create index system_notification_deliveries_recipient_idx
  on public.system_notification_deliveries(recipient_user_id, created_at desc);

create index system_document_jobs_pending_idx
  on public.system_document_jobs(available_at, created_at, id)
  where status in ('QUEUED','FAILED');

alter table public.system_notification_templates enable row level security;
alter table public.system_notification_deliveries enable row level security;
alter table public.system_notification_delivery_attempts enable row level security;
alter table public.system_document_jobs enable row level security;

revoke all on table public.system_notification_templates from public, anon, authenticated, service_role;
revoke all on table public.system_notification_deliveries from public, anon, authenticated, service_role;
revoke all on table public.system_notification_delivery_attempts from public, anon, authenticated, service_role;
revoke all on table public.system_document_jobs from public, anon, authenticated, service_role;

-- Initial templates are deliberately IN_APP only. No external transport is
-- asserted or activated by this migration.
insert into public.system_notification_templates(
  template_key, version, event_type, channel, subject_template, body_template
) values
  (
    'investment.payment.reconciled', 1, 'investment.payment.reconciled', 'IN_APP',
    'Pago conciliado',
    'Tu pago de inversión fue conciliado y quedó registrado en el sistema.'
  ),
  (
    'investment.payout.confirmed', 1, 'investment.payout.confirmed', 'IN_APP',
    'Retiro confirmado',
    'El pago de tu retiro fue confirmado por el sistema financiero.'
  );

-- Template versions are immutable. A correction is a new version, never an
-- UPDATE of historical content.
create function public._guard_notification_template_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'notification template versions are immutable; create a new version';
end;
$$;

revoke all on function public._guard_notification_template_mutation()
  from public, anon, authenticated, service_role;

create trigger system_notification_templates_immutable_guard
before update or delete on public.system_notification_templates
for each row execute function public._guard_notification_template_mutation();

-- ---------------------------------------------------------------------------
-- Outbox -> downstream work materializer.
-- The outbox event is marked published only after the idempotent downstream
-- intent/job is durably inserted in the same transaction.
-- ---------------------------------------------------------------------------
create function public.materialize_domain_event_work(
  p_event_id uuid,
  p_lease_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.system_domain_event_outbox%rowtype;
  v_recipient uuid;
  v_notification_count integer := 0;
  v_document_count integer := 0;
begin
  select * into v_event
  from public.system_domain_event_outbox
  where id = p_event_id
    and published_at is null
    and lease_token = p_lease_token
    and lease_expires_at > now()
  for update;

  if v_event.id is null then
    raise exception 'domain event lease is stale, missing or already completed';
  end if;

  case v_event.event_type
    when 'investment.payment.reconciled' then
      v_recipient := nullif(v_event.payload ->> 'participant_user_id','')::uuid;
      if v_recipient is null then
        raise exception 'payment reconciled event is missing participant_user_id';
      end if;

      insert into public.system_notification_deliveries(
        domain_event_id,
        recipient_user_id,
        channel,
        template_key,
        template_version,
        variables
      ) values (
        v_event.id,
        v_recipient,
        'IN_APP',
        'investment.payment.reconciled',
        1,
        v_event.payload
      )
      on conflict (domain_event_id, recipient_user_id, channel, template_key, template_version)
      do nothing;
      get diagnostics v_notification_count = row_count;

    when 'investment.payout.confirmed' then
      v_recipient := nullif(v_event.payload ->> 'participant_user_id','')::uuid;
      if v_recipient is null then
        raise exception 'payout confirmed event is missing participant_user_id';
      end if;

      insert into public.system_notification_deliveries(
        domain_event_id,
        recipient_user_id,
        channel,
        template_key,
        template_version,
        variables
      ) values (
        v_event.id,
        v_recipient,
        'IN_APP',
        'investment.payout.confirmed',
        1,
        v_event.payload
      )
      on conflict (domain_event_id, recipient_user_id, channel, template_key, template_version)
      do nothing;
      get diagnostics v_notification_count = row_count;

    when 'investment.settlement.completed' then
      insert into public.system_document_jobs(
        domain_event_id,
        document_type,
        owner_type,
        owner_id,
        payload
      ) values (
        v_event.id,
        'investment.settlement_summary',
        'investment_lot',
        v_event.aggregate_id,
        v_event.payload
      )
      on conflict (domain_event_id, document_type, owner_type, owner_id)
      do nothing;
      get diagnostics v_document_count = row_count;

    else
      raise exception 'unsupported domain event type for materialization: %', v_event.event_type;
  end case;

  perform public.complete_domain_event_delivery(v_event.id, p_lease_token);

  return jsonb_build_object(
    'event_id', v_event.id,
    'event_type', v_event.event_type,
    'notification_intents_created', v_notification_count,
    'document_jobs_created', v_document_count
  );
end;
$$;

revoke all on function public.materialize_domain_event_work(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.materialize_domain_event_work(uuid,uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Notification transport lease contract. No provider implementation is
-- included; this contract lets a future server worker send exactly once per
-- delivery intent while preserving attempt history.
-- ---------------------------------------------------------------------------
create function public.claim_notification_deliveries(
  p_limit integer default 25,
  p_lease_seconds integer default 120
)
returns table(
  id uuid,
  recipient_user_id uuid,
  channel text,
  template_key text,
  template_version integer,
  variables jsonb,
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
    select d.id
    from public.system_notification_deliveries d
    where d.delivered_at is null
      and d.status in ('QUEUED','FAILED')
      and d.available_at <= now()
      and (d.lease_expires_at is null or d.lease_expires_at <= now())
    order by d.available_at, d.created_at, d.id
    for update skip locked
    limit p_limit
  )
  update public.system_notification_deliveries d
  set status = 'PROCESSING',
      lease_token = gen_random_uuid(),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      attempt_count = d.attempt_count + 1,
      last_attempt_at = now(),
      last_error = null
  from candidates c
  where d.id = c.id
  returning
    d.id,
    d.recipient_user_id,
    d.channel,
    d.template_key,
    d.template_version,
    d.variables,
    d.attempt_count,
    d.lease_token,
    d.lease_expires_at;
end;
$$;

create function public.complete_notification_delivery(
  p_delivery_id uuid,
  p_lease_token uuid,
  p_provider_code text default 'internal',
  p_provider_message_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt integer;
begin
  update public.system_notification_deliveries
  set status = 'SENT',
      delivered_at = now(),
      lease_token = null,
      lease_expires_at = null,
      last_error = null
  where id = p_delivery_id
    and status = 'PROCESSING'
    and delivered_at is null
    and lease_token = p_lease_token
  returning attempt_count into v_attempt;

  if not found then
    raise exception 'notification delivery lease is stale, missing or already completed';
  end if;

  insert into public.system_notification_delivery_attempts(
    delivery_id, attempt_no, outcome, provider_code, provider_message_id
  ) values (
    p_delivery_id,
    v_attempt,
    'SENT',
    nullif(left(trim(coalesce(p_provider_code,'')), 64),''),
    nullif(left(trim(coalesce(p_provider_message_id,'')), 255),'')
  );
end;
$$;

create function public.fail_notification_delivery(
  p_delivery_id uuid,
  p_lease_token uuid,
  p_error text,
  p_retry_after_seconds integer default 60,
  p_provider_code text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt integer;
  v_error text := left(coalesce(nullif(trim(p_error),''),'delivery failed'), 2000);
begin
  if p_retry_after_seconds is null or p_retry_after_seconds < 5 or p_retry_after_seconds > 86400 then
    raise exception 'p_retry_after_seconds must be between 5 and 86400';
  end if;

  update public.system_notification_deliveries
  set status = 'FAILED',
      available_at = now() + make_interval(secs => p_retry_after_seconds),
      lease_token = null,
      lease_expires_at = null,
      last_error = v_error
  where id = p_delivery_id
    and status = 'PROCESSING'
    and delivered_at is null
    and lease_token = p_lease_token
  returning attempt_count into v_attempt;

  if not found then
    raise exception 'notification delivery lease is stale, missing or already completed';
  end if;

  insert into public.system_notification_delivery_attempts(
    delivery_id, attempt_no, outcome, provider_code, error_detail
  ) values (
    p_delivery_id,
    v_attempt,
    'FAILED',
    nullif(left(trim(coalesce(p_provider_code,'')), 64),''),
    v_error
  );
end;
$$;

revoke all on function public.claim_notification_deliveries(integer,integer) from public, anon, authenticated;
revoke all on function public.complete_notification_delivery(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.fail_notification_delivery(uuid,uuid,text,integer,text) from public, anon, authenticated;
grant execute on function public.claim_notification_deliveries(integer,integer) to service_role;
grant execute on function public.complete_notification_delivery(uuid,uuid,text,text) to service_role;
grant execute on function public.fail_notification_delivery(uuid,uuid,text,integer,text) to service_role;

-- ---------------------------------------------------------------------------
-- Document renderer lease contract. The renderer is intentionally absent.
-- ---------------------------------------------------------------------------
create function public.claim_document_jobs(
  p_limit integer default 10,
  p_lease_seconds integer default 300
)
returns table(
  id uuid,
  document_type text,
  owner_type text,
  owner_id uuid,
  payload jsonb,
  attempt_count integer,
  lease_token uuid,
  lease_expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 50 then
    raise exception 'p_limit must be between 1 and 50';
  end if;
  if p_lease_seconds is null or p_lease_seconds < 30 or p_lease_seconds > 1800 then
    raise exception 'p_lease_seconds must be between 30 and 1800';
  end if;

  return query
  with candidates as (
    select j.id
    from public.system_document_jobs j
    where j.status in ('QUEUED','FAILED')
      and j.available_at <= now()
      and (j.lease_expires_at is null or j.lease_expires_at <= now())
    order by j.available_at, j.created_at, j.id
    for update skip locked
    limit p_limit
  )
  update public.system_document_jobs j
  set status = 'PROCESSING',
      lease_token = gen_random_uuid(),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      attempt_count = j.attempt_count + 1,
      last_attempt_at = now(),
      last_error = null
  from candidates c
  where j.id = c.id
  returning
    j.id,
    j.document_type,
    j.owner_type,
    j.owner_id,
    j.payload,
    j.attempt_count,
    j.lease_token,
    j.lease_expires_at;
end;
$$;

create function public.complete_document_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_storage_path text,
  p_content_sha256 text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(p_storage_path),'') is null then
    raise exception 'storage path is required';
  end if;
  if p_content_sha256 !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'content sha256 must be 64 hexadecimal characters';
  end if;

  update public.system_document_jobs
  set status = 'READY',
      storage_path = trim(p_storage_path),
      content_sha256 = lower(p_content_sha256),
      completed_at = now(),
      lease_token = null,
      lease_expires_at = null,
      last_error = null
  where id = p_job_id
    and status = 'PROCESSING'
    and lease_token = p_lease_token;

  if not found then
    raise exception 'document job lease is stale, missing or already completed';
  end if;
end;
$$;

create function public.fail_document_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_error text,
  p_retry_after_seconds integer default 300
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

  update public.system_document_jobs
  set status = 'FAILED',
      available_at = now() + make_interval(secs => p_retry_after_seconds),
      lease_token = null,
      lease_expires_at = null,
      last_error = left(coalesce(nullif(trim(p_error),''),'document generation failed'), 2000)
  where id = p_job_id
    and status = 'PROCESSING'
    and lease_token = p_lease_token;

  if not found then
    raise exception 'document job lease is stale, missing or already completed';
  end if;
end;
$$;

revoke all on function public.claim_document_jobs(integer,integer) from public, anon, authenticated;
revoke all on function public.complete_document_job(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.fail_document_job(uuid,uuid,text,integer) from public, anon, authenticated;
grant execute on function public.claim_document_jobs(integer,integer) to service_role;
grant execute on function public.complete_document_job(uuid,uuid,text,text) to service_role;
grant execute on function public.fail_document_job(uuid,uuid,text,integer) to service_role;
