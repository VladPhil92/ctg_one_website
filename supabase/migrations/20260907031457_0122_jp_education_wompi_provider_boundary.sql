-- JP Valderrama Education Wompi Provider Boundary V1
-- Enables signed-provider checkout settlement without trusting browser redirects.

alter table public.education_payment_settlements
  add column if not exists settlement_source text not null default 'manual_operator';

alter table public.education_payment_settlements
  alter column operator_user_id drop not null;

alter table public.education_payment_settlements
  drop constraint if exists education_payment_settlements_source_check;

alter table public.education_payment_settlements
  add constraint education_payment_settlements_source_check
  check (
    (settlement_source = 'manual_operator' and operator_user_id is not null)
    or (settlement_source = 'provider_webhook' and operator_user_id is null)
  );

create table if not exists public.education_payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.education_orders(id) on delete restrict,
  payment_provider text not null,
  provider_transaction_id text not null,
  provider_status text not null,
  event_checksum text not null,
  amount_in_cents bigint not null,
  currency text not null,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint education_payment_provider_events_provider_check
    check (payment_provider = 'wompi'),
  constraint education_payment_provider_events_transaction_check
    check (char_length(btrim(provider_transaction_id)) between 1 and 240),
  constraint education_payment_provider_events_status_check
    check (provider_status in ('PENDING','APPROVED','DECLINED','VOIDED','ERROR')),
  constraint education_payment_provider_events_checksum_check
    check (event_checksum ~ '^[0-9a-f]{64}$'),
  constraint education_payment_provider_events_amount_check
    check (amount_in_cents >= 0),
  constraint education_payment_provider_events_currency_check
    check (currency ~ '^[A-Z]{3}$')
);

create unique index if not exists education_payment_provider_events_checksum_key
  on public.education_payment_provider_events(payment_provider, event_checksum);
create index if not exists education_payment_provider_events_transaction_idx
  on public.education_payment_provider_events(payment_provider, provider_transaction_id, received_at desc);
create index if not exists education_payment_provider_events_order_idx
  on public.education_payment_provider_events(order_id, received_at desc);

alter table public.education_payment_provider_events enable row level security;
revoke all on table public.education_payment_provider_events from public, anon, authenticated;
grant select, insert on table public.education_payment_provider_events to service_role;

create or replace function public.prepare_education_wompi_order(
  p_order_id uuid,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_order record;
  v_item_count integer;
  v_item_total bigint;
  v_replayed boolean := false;
begin
  if p_order_id is null then raise exception 'EDUCATION_WOMPI_ORDER_REQUIRED'; end if;
  if p_user_id is null then raise exception 'EDUCATION_WOMPI_USER_REQUIRED'; end if;

  select o.id,o.user_id,o.status,o.currency,o.total_amount,o.payment_provider
    into v_order
  from public.education_orders o
  where o.id = p_order_id
  for update;

  if not found then raise exception 'EDUCATION_WOMPI_ORDER_NOT_FOUND'; end if;
  if v_order.user_id <> p_user_id then raise exception 'EDUCATION_WOMPI_ORDER_OWNER_MISMATCH'; end if;
  if v_order.status not in ('initiated','pending') then raise exception 'EDUCATION_WOMPI_ORDER_NOT_PENDING'; end if;
  if v_order.currency <> 'COP' then raise exception 'EDUCATION_WOMPI_CURRENCY_UNSUPPORTED'; end if;
  if v_order.payment_provider not in ('manual_assisted','wompi') then raise exception 'EDUCATION_WOMPI_PROVIDER_CONFLICT'; end if;

  select count(*)::integer,
         coalesce(sum((i.quantity::bigint) * (i.unit_amount::bigint)),0)
    into v_item_count,v_item_total
  from public.education_order_items i
  where i.order_id = p_order_id;

  if v_item_count < 1 or v_item_total <> v_order.total_amount::bigint then
    raise exception 'EDUCATION_WOMPI_ORDER_TOTAL_INVALID';
  end if;

  v_replayed := v_order.payment_provider = 'wompi';

  update public.education_orders
  set payment_provider = 'wompi',
      status = 'pending',
      updated_at = clock_timestamp()
  where id = p_order_id;

  return jsonb_build_object(
    'replayed',v_replayed,
    'orderId',p_order_id,
    'reference',p_order_id::text,
    'totalAmount',v_order.total_amount,
    'amountInCents',(v_order.total_amount::bigint * 100),
    'currency',v_order.currency,
    'status','pending'
  );
end;
$function$;

revoke all on function public.prepare_education_wompi_order(uuid,uuid) from public, anon, authenticated;
grant execute on function public.prepare_education_wompi_order(uuid,uuid) to service_role;

create or replace function public.process_education_wompi_transaction_event(
  p_order_id uuid,
  p_transaction_id text,
  p_status text,
  p_amount_in_cents bigint,
  p_currency text,
  p_event_checksum text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_transaction_id text := btrim(p_transaction_id);
  v_provider_status text := upper(btrim(p_status));
  v_currency text := upper(btrim(p_currency));
  v_checksum text := lower(btrim(p_event_checksum));
  v_order record;
  v_item_count integer;
  v_item_total bigint;
  v_existing_event record;
  v_settlement_id uuid;
  v_target_status text;
begin
  if p_order_id is null then raise exception 'EDUCATION_WOMPI_ORDER_REQUIRED'; end if;
  if v_transaction_id is null or char_length(v_transaction_id) < 1 or char_length(v_transaction_id) > 240 then raise exception 'EDUCATION_WOMPI_TRANSACTION_INVALID'; end if;
  if v_provider_status not in ('PENDING','APPROVED','DECLINED','VOIDED','ERROR') then raise exception 'EDUCATION_WOMPI_STATUS_INVALID'; end if;
  if p_amount_in_cents is null or p_amount_in_cents < 0 then raise exception 'EDUCATION_WOMPI_AMOUNT_INVALID'; end if;
  if v_currency is null or v_currency !~ '^[A-Z]{3}$' then raise exception 'EDUCATION_WOMPI_CURRENCY_INVALID'; end if;
  if v_checksum is null or v_checksum !~ '^[0-9a-f]{64}$' then raise exception 'EDUCATION_WOMPI_CHECKSUM_INVALID'; end if;

  select e.id,e.order_id,e.provider_transaction_id,e.provider_status
    into v_existing_event
  from public.education_payment_provider_events e
  where e.payment_provider = 'wompi' and e.event_checksum = v_checksum;

  if found then
    if v_existing_event.order_id <> p_order_id
       or v_existing_event.provider_transaction_id <> v_transaction_id
       or v_existing_event.provider_status <> v_provider_status then
      raise exception 'EDUCATION_WOMPI_EVENT_REPLAY_CONFLICT';
    end if;
    return jsonb_build_object('replayed',true,'orderId',p_order_id,'providerStatus',v_provider_status);
  end if;

  select o.id,o.user_id,o.status,o.currency,o.total_amount,o.payment_provider,o.provider_reference,o.verified_at
    into v_order
  from public.education_orders o
  where o.id = p_order_id
  for update;

  if not found then raise exception 'EDUCATION_WOMPI_ORDER_NOT_FOUND'; end if;
  if v_order.payment_provider is distinct from 'wompi' then raise exception 'EDUCATION_WOMPI_PROVIDER_MISMATCH'; end if;
  if v_currency <> v_order.currency then raise exception 'EDUCATION_WOMPI_CURRENCY_MISMATCH'; end if;
  if p_amount_in_cents <> (v_order.total_amount::bigint * 100) then raise exception 'EDUCATION_WOMPI_AMOUNT_MISMATCH'; end if;

  select count(*)::integer,
         coalesce(sum((i.quantity::bigint) * (i.unit_amount::bigint)),0)
    into v_item_count,v_item_total
  from public.education_order_items i
  where i.order_id = p_order_id;

  if v_item_count < 1 or v_item_total <> v_order.total_amount::bigint then
    raise exception 'EDUCATION_WOMPI_ORDER_TOTAL_INVALID';
  end if;

  if exists (
    select 1 from public.education_payment_provider_events e
    where e.payment_provider = 'wompi'
      and e.provider_transaction_id = v_transaction_id
      and e.order_id <> p_order_id
  ) then
    raise exception 'EDUCATION_WOMPI_TRANSACTION_CONFLICT';
  end if;

  insert into public.education_payment_provider_events (
    order_id,payment_provider,provider_transaction_id,provider_status,event_checksum,amount_in_cents,currency,received_at
  ) values (
    p_order_id,'wompi',v_transaction_id,v_provider_status,v_checksum,p_amount_in_cents,v_currency,clock_timestamp()
  );

  if v_provider_status = 'PENDING' then
    return jsonb_build_object('replayed',false,'orderId',p_order_id,'status',v_order.status,'providerStatus',v_provider_status);
  end if;

  if v_provider_status = 'APPROVED' then
    if v_order.status = 'paid' then
      if v_order.provider_reference = v_transaction_id then
        return jsonb_build_object('replayed',true,'orderId',p_order_id,'status','paid','providerStatus',v_provider_status);
      end if;
      raise exception 'EDUCATION_WOMPI_ORDER_ALREADY_SETTLED';
    end if;

    if v_order.status not in ('initiated','pending') then
      raise exception 'EDUCATION_WOMPI_ORDER_NOT_SETTLEABLE';
    end if;

    perform public.complete_education_order(p_order_id,v_transaction_id);

    insert into public.education_payment_settlements (
      order_id,user_id,payment_provider,provider_reference,total_amount,currency,
      operator_user_id,operator_note,settlement_source,settled_at
    ) values (
      p_order_id,v_order.user_id,'wompi',v_transaction_id,v_order.total_amount,v_order.currency,
      null,null,'provider_webhook',clock_timestamp()
    )
    returning id into v_settlement_id;

    return jsonb_build_object(
      'replayed',false,'orderId',p_order_id,'status','paid',
      'providerStatus',v_provider_status,'settlementId',v_settlement_id
    );
  end if;

  if v_order.status = 'paid' then
    return jsonb_build_object(
      'replayed',false,'ignored',true,'orderId',p_order_id,'status','paid','providerStatus',v_provider_status
    );
  end if;

  v_target_status := case when v_provider_status = 'VOIDED' then 'cancelled' else 'failed' end;

  if v_order.status in ('initiated','pending') then
    update public.education_orders
    set status = v_target_status, updated_at = clock_timestamp()
    where id = p_order_id;
  end if;

  return jsonb_build_object(
    'replayed',false,'orderId',p_order_id,'status',
    case when v_order.status in ('initiated','pending') then v_target_status else v_order.status end,
    'providerStatus',v_provider_status
  );
end;
$function$;

revoke all on function public.process_education_wompi_transaction_event(uuid,text,text,bigint,text,text)
  from public, anon, authenticated;
grant execute on function public.process_education_wompi_transaction_event(uuid,text,text,bigint,text,text)
  to service_role;

comment on table public.education_payment_provider_events is
  'Signed payment-provider event evidence. Browser roles have no access; current provider boundary is Wompi.';
comment on function public.prepare_education_wompi_order(uuid,uuid) is
  'Service-role-only transition from canonical education order to Wompi checkout. Revalidates ownership, currency and order totals.';
comment on function public.process_education_wompi_transaction_event(uuid,text,text,bigint,text,text) is
  'Service-role-only Wompi event settlement boundary. Caller must validate Wompi event checksum before invoking; APPROVED events atomically grant entitlements.';
