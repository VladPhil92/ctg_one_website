-- JP Valderrama Education Settlement Operations V1
--
-- Adds an auditable operator settlement record and a service-role-only atomic
-- boundary for manual-assisted education payments. The caller supplies only
-- the order id, an external verification reference and an optional note.
-- Price, currency and entitlement scope remain server/database authoritative.

create table public.education_payment_settlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.education_orders(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  payment_provider text not null,
  provider_reference text not null,
  total_amount integer not null,
  currency text not null,
  operator_user_id uuid not null references public.profiles(id) on delete restrict,
  operator_note text,
  settled_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint education_payment_settlements_provider_check
    check (char_length(btrim(payment_provider)) between 2 and 80),
  constraint education_payment_settlements_reference_check
    check (
      provider_reference = btrim(provider_reference)
      and char_length(provider_reference) between 1 and 240
    ),
  constraint education_payment_settlements_total_check
    check (total_amount >= 0),
  constraint education_payment_settlements_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  constraint education_payment_settlements_note_check
    check (operator_note is null or char_length(btrim(operator_note)) between 1 and 2000)
);

create unique index education_payment_settlements_provider_reference_key
  on public.education_payment_settlements(payment_provider, provider_reference);

create index education_payment_settlements_settled_at_idx
  on public.education_payment_settlements(settled_at desc);

alter table public.education_payment_settlements enable row level security;
revoke all on table public.education_payment_settlements from public, anon, authenticated;
grant select, insert on table public.education_payment_settlements to service_role;

create or replace function public.settle_education_order(
  p_order_id uuid,
  p_operator_user_id uuid,
  p_provider_reference text,
  p_operator_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_status text;
  v_payment_provider text;
  v_total_amount integer;
  v_currency text;
  v_verified_at timestamptz;
  v_reference text := btrim(p_provider_reference);
  v_note text := nullif(btrim(p_operator_note), '');
  v_item_count integer;
  v_item_total bigint;
  v_settlement_id uuid;
  v_existing_reference text;
  v_existing_settlement_id uuid;
  v_is_admin boolean;
begin
  if p_order_id is null then
    raise exception 'EDUCATION_SETTLEMENT_ORDER_REQUIRED';
  end if;

  if p_operator_user_id is null then
    raise exception 'EDUCATION_SETTLEMENT_OPERATOR_REQUIRED';
  end if;

  select exists (
    select 1
    from public.profiles p
    where p.id = p_operator_user_id
      and p.role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'EDUCATION_SETTLEMENT_OPERATOR_FORBIDDEN';
  end if;

  if v_reference is null
     or char_length(v_reference) < 1
     or char_length(v_reference) > 240 then
    raise exception 'EDUCATION_SETTLEMENT_REFERENCE_INVALID';
  end if;

  if v_note is not null and char_length(v_note) > 2000 then
    raise exception 'EDUCATION_SETTLEMENT_NOTE_INVALID';
  end if;

  select
    o.user_id,
    o.status,
    o.payment_provider,
    o.total_amount,
    o.currency,
    o.verified_at
  into
    v_user_id,
    v_status,
    v_payment_provider,
    v_total_amount,
    v_currency,
    v_verified_at
  from public.education_orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'EDUCATION_SETTLEMENT_ORDER_NOT_FOUND';
  end if;

  if v_status = 'paid' then
    select s.id, s.provider_reference
    into v_existing_settlement_id, v_existing_reference
    from public.education_payment_settlements s
    where s.order_id = p_order_id;

    if found and v_existing_reference = v_reference then
      return jsonb_build_object(
        'replayed', true,
        'settlementId', v_existing_settlement_id,
        'orderId', p_order_id,
        'status', 'paid',
        'totalAmount', v_total_amount,
        'currency', v_currency,
        'verifiedAt', v_verified_at
      );
    end if;

    raise exception 'EDUCATION_SETTLEMENT_ALREADY_COMPLETED';
  end if;

  if v_status not in ('initiated', 'pending') then
    raise exception 'EDUCATION_SETTLEMENT_ORDER_NOT_PENDING';
  end if;

  if v_payment_provider is distinct from 'manual_assisted' then
    raise exception 'EDUCATION_SETTLEMENT_PROVIDER_UNSUPPORTED';
  end if;

  select
    count(*)::integer,
    coalesce(sum((i.quantity::bigint) * (i.unit_amount::bigint)), 0)
  into v_item_count, v_item_total
  from public.education_order_items i
  where i.order_id = p_order_id;

  if v_item_count < 1 or v_item_total <> v_total_amount::bigint then
    raise exception 'EDUCATION_SETTLEMENT_ORDER_TOTAL_INVALID';
  end if;

  perform public.complete_education_order(p_order_id, v_reference);

  insert into public.education_payment_settlements (
    order_id,
    user_id,
    payment_provider,
    provider_reference,
    total_amount,
    currency,
    operator_user_id,
    operator_note,
    settled_at
  ) values (
    p_order_id,
    v_user_id,
    v_payment_provider,
    v_reference,
    v_total_amount,
    v_currency,
    p_operator_user_id,
    v_note,
    clock_timestamp()
  )
  returning id, settled_at
  into v_settlement_id, v_verified_at;

  return jsonb_build_object(
    'replayed', false,
    'settlementId', v_settlement_id,
    'orderId', p_order_id,
    'status', 'paid',
    'totalAmount', v_total_amount,
    'currency', v_currency,
    'verifiedAt', v_verified_at
  );
end;
$$;

revoke all on function public.settle_education_order(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.settle_education_order(uuid, uuid, text, text)
  to service_role;

comment on table public.education_payment_settlements is
  'Immutable operational evidence for manually verified JP Valderrama education payments. Browser roles have no direct access.';
comment on function public.settle_education_order(uuid, uuid, text, text) is
  'Service-role-only, admin-attributed settlement boundary. Validates the canonical order total before marking paid and granting entitlements.';