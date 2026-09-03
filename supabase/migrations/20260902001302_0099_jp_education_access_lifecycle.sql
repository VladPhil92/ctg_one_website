-- JP Valderrama Education Access Lifecycle V1
--
-- Adds an auditable, server-only lifecycle boundary for cancelling pending
-- education orders and refunding paid orders. Refunds revoke only entitlements
-- that are still sourced from the refunded order, so a later re-grant remains
-- active.

create table if not exists public.education_order_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.education_orders(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in ('cancelled', 'refunded')),
  previous_status text not null check (previous_status in ('initiated', 'pending', 'paid', 'cancelled', 'refunded')),
  new_status text not null check (new_status in ('cancelled', 'refunded')),
  operator_user_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (
    reason = btrim(reason)
    and char_length(reason) between 3 and 2000
  ),
  provider_reference text check (
    provider_reference is null
    or (
      provider_reference = btrim(provider_reference)
      and char_length(provider_reference) between 1 and 240
    )
  ),
  affected_entitlements integer not null default 0 check (affected_entitlements >= 0),
  created_at timestamptz not null default clock_timestamp(),
  unique (order_id, event_type)
);

create index if not exists education_order_lifecycle_events_user_idx
  on public.education_order_lifecycle_events(user_id);
create index if not exists education_order_lifecycle_events_operator_idx
  on public.education_order_lifecycle_events(operator_user_id);
create index if not exists education_order_lifecycle_events_created_idx
  on public.education_order_lifecycle_events(created_at desc);

alter table public.education_order_lifecycle_events enable row level security;
revoke all on table public.education_order_lifecycle_events from public, anon, authenticated;
grant select, insert on table public.education_order_lifecycle_events to service_role;

comment on table public.education_order_lifecycle_events is
  'Server-only audit ledger for education order cancellation and refund operations.';

create or replace function public.transition_education_order_lifecycle(
  p_order_id uuid,
  p_operator_user_id uuid,
  p_action text,
  p_reason text,
  p_provider_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid;
  v_status text;
  v_action text := lower(btrim(p_action));
  v_reason text := btrim(p_reason);
  v_reference text := nullif(btrim(p_provider_reference), '');
  v_is_admin boolean;
  v_event_id uuid;
  v_existing_reference text;
  v_affected integer := 0;
  v_now timestamptz := clock_timestamp();
begin
  if p_order_id is null then
    raise exception 'EDUCATION_LIFECYCLE_ORDER_REQUIRED';
  end if;

  if p_operator_user_id is null then
    raise exception 'EDUCATION_LIFECYCLE_OPERATOR_REQUIRED';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = p_operator_user_id
      and p.role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'EDUCATION_LIFECYCLE_OPERATOR_FORBIDDEN';
  end if;

  if v_action not in ('cancel', 'refund') then
    raise exception 'EDUCATION_LIFECYCLE_ACTION_INVALID';
  end if;

  if v_reason is null
     or char_length(v_reason) < 3
     or char_length(v_reason) > 2000 then
    raise exception 'EDUCATION_LIFECYCLE_REASON_INVALID';
  end if;

  if v_reference is not null and char_length(v_reference) > 240 then
    raise exception 'EDUCATION_LIFECYCLE_REFERENCE_INVALID';
  end if;

  select o.user_id, o.status
  into v_user_id, v_status
  from public.education_orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'EDUCATION_LIFECYCLE_ORDER_NOT_FOUND';
  end if;

  if v_action = 'cancel' then
    if v_reference is not null then
      raise exception 'EDUCATION_LIFECYCLE_CANCEL_REFERENCE_FORBIDDEN';
    end if;

    if v_status = 'cancelled' then
      select e.id
      into v_event_id
      from public.education_order_lifecycle_events e
      where e.order_id = p_order_id
        and e.event_type = 'cancelled';

      return jsonb_build_object(
        'replayed', true,
        'eventId', v_event_id,
        'orderId', p_order_id,
        'status', 'cancelled',
        'affectedEntitlements', 0
      );
    end if;

    if v_status not in ('initiated', 'pending') then
      raise exception 'EDUCATION_LIFECYCLE_ORDER_NOT_CANCELLABLE';
    end if;

    update public.education_orders
    set status = 'cancelled', updated_at = v_now
    where id = p_order_id;

    insert into public.education_order_lifecycle_events (
      order_id,
      user_id,
      event_type,
      previous_status,
      new_status,
      operator_user_id,
      reason,
      provider_reference,
      affected_entitlements,
      created_at
    ) values (
      p_order_id,
      v_user_id,
      'cancelled',
      v_status,
      'cancelled',
      p_operator_user_id,
      v_reason,
      null,
      0,
      v_now
    )
    returning id into v_event_id;

    return jsonb_build_object(
      'replayed', false,
      'eventId', v_event_id,
      'orderId', p_order_id,
      'status', 'cancelled',
      'affectedEntitlements', 0
    );
  end if;

  if v_reference is null then
    raise exception 'EDUCATION_LIFECYCLE_REFERENCE_REQUIRED';
  end if;

  if v_status = 'refunded' then
    select e.id, e.provider_reference
    into v_event_id, v_existing_reference
    from public.education_order_lifecycle_events e
    where e.order_id = p_order_id
      and e.event_type = 'refunded';

    if found and v_existing_reference = v_reference then
      return jsonb_build_object(
        'replayed', true,
        'eventId', v_event_id,
        'orderId', p_order_id,
        'status', 'refunded',
        'affectedEntitlements', 0
      );
    end if;

    raise exception 'EDUCATION_LIFECYCLE_REFUND_CONFLICT';
  end if;

  if v_status <> 'paid' then
    raise exception 'EDUCATION_LIFECYCLE_ORDER_NOT_REFUNDABLE';
  end if;

  update public.education_entitlements
  set
    status = 'revoked',
    revoked_at = v_now,
    updated_at = v_now
  where user_id = v_user_id
    and source_type = 'purchase'
    and source_reference = p_order_id::text
    and status = 'active';

  get diagnostics v_affected = row_count;

  update public.education_orders
  set status = 'refunded', updated_at = v_now
  where id = p_order_id;

  insert into public.education_order_lifecycle_events (
    order_id,
    user_id,
    event_type,
    previous_status,
    new_status,
    operator_user_id,
    reason,
    provider_reference,
    affected_entitlements,
    created_at
  ) values (
    p_order_id,
    v_user_id,
    'refunded',
    v_status,
    'refunded',
    p_operator_user_id,
    v_reason,
    v_reference,
    v_affected,
    v_now
  )
  returning id into v_event_id;

  return jsonb_build_object(
    'replayed', false,
    'eventId', v_event_id,
    'orderId', p_order_id,
    'status', 'refunded',
    'affectedEntitlements', v_affected
  );
end;
$function$;

revoke all on function public.transition_education_order_lifecycle(uuid, uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.transition_education_order_lifecycle(uuid, uuid, text, text, text)
  to service_role;

comment on function public.transition_education_order_lifecycle(uuid, uuid, text, text, text) is
  'Service-role-only lifecycle transition for cancelling pending education orders or refunding paid orders with scoped entitlement revocation.';