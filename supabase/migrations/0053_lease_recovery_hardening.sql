-- CTG One OS — Notification / Document lease recovery hardening
--
-- A worker may crash after claiming work and before completing/failing it.
-- In that case status remains PROCESSING until the lease expires. This
-- migration makes those expired PROCESSING rows reclaimable without manual
-- intervention, preserving stale-worker protection through a fresh lease token.

-- Pending indexes must include abandoned PROCESSING rows so recovery remains
-- efficient as the queues grow.
drop index if exists public.system_notification_deliveries_pending_idx;
create index system_notification_deliveries_pending_idx
  on public.system_notification_deliveries(available_at, lease_expires_at, created_at, id)
  where delivered_at is null and status in ('QUEUED','FAILED','PROCESSING');

drop index if exists public.system_document_jobs_pending_idx;
create index system_document_jobs_pending_idx
  on public.system_document_jobs(available_at, lease_expires_at, created_at, id)
  where status in ('QUEUED','FAILED','PROCESSING');

create or replace function public.claim_notification_deliveries(
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
      and (
        (
          d.status in ('QUEUED','FAILED')
          and d.available_at <= now()
          and (d.lease_expires_at is null or d.lease_expires_at <= now())
        )
        or
        (
          d.status = 'PROCESSING'
          and d.lease_expires_at is not null
          and d.lease_expires_at <= now()
        )
      )
    order by
      case when d.status = 'PROCESSING' then d.lease_expires_at else d.available_at end,
      d.created_at,
      d.id
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

revoke all on function public.claim_notification_deliveries(integer,integer)
  from public, anon, authenticated;
grant execute on function public.claim_notification_deliveries(integer,integer)
  to service_role;

create or replace function public.claim_document_jobs(
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
    where (
      (
        j.status in ('QUEUED','FAILED')
        and j.available_at <= now()
        and (j.lease_expires_at is null or j.lease_expires_at <= now())
      )
      or
      (
        j.status = 'PROCESSING'
        and j.lease_expires_at is not null
        and j.lease_expires_at <= now()
      )
    )
    order by
      case when j.status = 'PROCESSING' then j.lease_expires_at else j.available_at end,
      j.created_at,
      j.id
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

revoke all on function public.claim_document_jobs(integer,integer)
  from public, anon, authenticated;
grant execute on function public.claim_document_jobs(integer,integer)
  to service_role;
