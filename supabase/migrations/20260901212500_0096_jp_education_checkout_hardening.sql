-- JP Valderrama Education Checkout Hardening V1
--
-- Adds an authenticated, idempotent order-creation boundary for paid education
-- offerings, preserves durable access to archived purchases, and makes renewal
-- semantics explicit. Payment verification remains server-controlled.

alter table public.education_orders
  add column request_key text;

update public.education_orders
set request_key = 'legacy-' || id::text
where request_key is null;

alter table public.education_orders
  alter column request_key set not null;

alter table public.education_orders
  add constraint education_orders_request_key_check
  check (
    request_key = btrim(request_key)
    and char_length(request_key) between 16 and 128
  );

create unique index education_orders_user_request_key_key
  on public.education_orders(user_id, request_key);

-- Published offerings remain public through the 0095 policy. Authenticated
-- owners additionally retain read access to an offering after it is archived,
-- provided their entitlement is currently effective.
create policy education_offerings_entitled_read
  on public.education_offerings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.education_entitlements e
      where e.offering_id = education_offerings.id
        and e.user_id = (select auth.uid())
        and e.status = 'active'
        and e.starts_at <= now()
        and (e.ends_at is null or e.ends_at > now())
    )
  );

-- Trusted server boundary for starting a paid checkout. The browser never
-- inserts orders directly; it submits a slug plus an idempotency key to a
-- server route that authenticates the canonical CTG One user and invokes this
-- function with the service role.
create or replace function public.create_education_order(
  p_user_id uuid,
  p_offering_slug text,
  p_request_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_slug text := lower(btrim(p_offering_slug));
  v_request_key text := btrim(p_request_key);
  v_order_id uuid;
  v_order_status text;
  v_total_amount integer;
  v_currency text;
  v_existing_slug text;
  v_existing_title text;
  v_offering_id uuid;
  v_title text;
  v_price_amount integer;
begin
  if p_user_id is null then
    raise exception 'EDUCATION_USER_REQUIRED';
  end if;

  if v_slug is null
     or char_length(v_slug) < 3
     or char_length(v_slug) > 100
     or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'EDUCATION_OFFERING_SLUG_INVALID';
  end if;

  if v_request_key is null
     or char_length(v_request_key) < 16
     or char_length(v_request_key) > 128 then
    raise exception 'EDUCATION_REQUEST_KEY_INVALID';
  end if;

  -- Replays return the original order. Reusing one request key for another
  -- product is an explicit conflict rather than silently changing the cart.
  select
    o.id,
    o.status,
    o.total_amount,
    o.currency,
    off.slug,
    off.title
  into
    v_order_id,
    v_order_status,
    v_total_amount,
    v_currency,
    v_existing_slug,
    v_existing_title
  from public.education_orders o
  join public.education_order_items i on i.order_id = o.id
  join public.education_offerings off on off.id = i.offering_id
  where o.user_id = p_user_id
    and o.request_key = v_request_key
  order by i.created_at asc
  limit 1;

  if found then
    if v_existing_slug <> v_slug then
      raise exception 'EDUCATION_CHECKOUT_IDEMPOTENCY_CONFLICT';
    end if;

    return jsonb_build_object(
      'replayed', true,
      'order', jsonb_build_object(
        'id', v_order_id,
        'status', v_order_status,
        'totalAmount', v_total_amount,
        'currency', v_currency,
        'offeringSlug', v_existing_slug,
        'offeringTitle', v_existing_title
      )
    );
  end if;

  select id, title, price_amount, currency
  into v_offering_id, v_title, v_price_amount, v_currency
  from public.education_offerings
  where slug = v_slug
    and status = 'published'
  for share;

  if not found then
    raise exception 'EDUCATION_OFFERING_UNAVAILABLE';
  end if;

  if v_price_amount is null then
    raise exception 'EDUCATION_PRICE_UNAVAILABLE';
  end if;

  if v_price_amount <= 0 then
    raise exception 'EDUCATION_CHECKOUT_NOT_REQUIRED';
  end if;

  if exists (
    select 1
    from public.education_entitlements e
    where e.user_id = p_user_id
      and e.offering_id = v_offering_id
      and e.status = 'active'
      and e.starts_at <= now()
      and (e.ends_at is null or e.ends_at > now())
  ) then
    raise exception 'EDUCATION_ALREADY_ENTITLED';
  end if;

  insert into public.education_orders (
    user_id,
    status,
    currency,
    total_amount,
    payment_provider,
    request_key
  ) values (
    p_user_id,
    'pending',
    v_currency,
    v_price_amount,
    'manual_assisted',
    v_request_key
  )
  on conflict (user_id, request_key) do nothing
  returning id, status, total_amount, currency
  into v_order_id, v_order_status, v_total_amount, v_currency;

  if v_order_id is null then
    select
      o.id,
      o.status,
      o.total_amount,
      o.currency,
      off.slug,
      off.title
    into
      v_order_id,
      v_order_status,
      v_total_amount,
      v_currency,
      v_existing_slug,
      v_existing_title
    from public.education_orders o
    join public.education_order_items i on i.order_id = o.id
    join public.education_offerings off on off.id = i.offering_id
    where o.user_id = p_user_id
      and o.request_key = v_request_key
    order by i.created_at asc
    limit 1;

    if not found or v_existing_slug <> v_slug then
      raise exception 'EDUCATION_CHECKOUT_IDEMPOTENCY_CONFLICT';
    end if;

    return jsonb_build_object(
      'replayed', true,
      'order', jsonb_build_object(
        'id', v_order_id,
        'status', v_order_status,
        'totalAmount', v_total_amount,
        'currency', v_currency,
        'offeringSlug', v_existing_slug,
        'offeringTitle', v_existing_title
      )
    );
  end if;

  insert into public.education_order_items (
    order_id,
    offering_id,
    quantity,
    unit_amount
  ) values (
    v_order_id,
    v_offering_id,
    1,
    v_price_amount
  );

  return jsonb_build_object(
    'replayed', false,
    'order', jsonb_build_object(
      'id', v_order_id,
      'status', v_order_status,
      'totalAmount', v_total_amount,
      'currency', v_currency,
      'offeringSlug', v_slug,
      'offeringTitle', v_title
    )
  );
end;
$$;

revoke all on function public.create_education_order(uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_education_order(uuid, text, text) to service_role;

-- A renewed purchase starts a fresh durable access window. 0095 preserved the
-- previous ends_at value on conflict, which could leave a newly paid purchase
-- apparently active but already expired.
create or replace function public.complete_education_order(
  p_order_id uuid,
  p_provider_reference text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid;
  v_now timestamptz := clock_timestamp();
begin
  if p_order_id is null then
    raise exception 'order id is required';
  end if;

  if p_provider_reference is null
     or char_length(btrim(p_provider_reference)) < 1
     or char_length(btrim(p_provider_reference)) > 240 then
    raise exception 'provider reference is required';
  end if;

  select user_id
  into v_user_id
  from public.education_orders
  where id = p_order_id
    and status in ('initiated', 'pending')
  for update;

  if not found then
    raise exception 'education order is not completable';
  end if;

  update public.education_orders
  set
    status = 'paid',
    provider_reference = btrim(p_provider_reference),
    verified_at = v_now,
    updated_at = v_now
  where id = p_order_id;

  insert into public.education_entitlements (
    user_id,
    offering_id,
    source_type,
    source_reference,
    status,
    starts_at,
    ends_at,
    granted_at,
    revoked_at,
    updated_at
  )
  select
    v_user_id,
    i.offering_id,
    'purchase',
    p_order_id::text,
    'active',
    v_now,
    null,
    v_now,
    null,
    v_now
  from public.education_order_items i
  where i.order_id = p_order_id
  on conflict (user_id, offering_id) do update
  set
    source_type = 'purchase',
    source_reference = excluded.source_reference,
    status = 'active',
    starts_at = excluded.starts_at,
    ends_at = null,
    granted_at = excluded.granted_at,
    revoked_at = null,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.complete_education_order(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_education_order(uuid, text) to service_role;

comment on function public.create_education_order(uuid, text, text) is
  'Service-role-only authenticated education checkout creation. Prices are read from the canonical published catalog and browser-supplied amounts are never trusted.';
comment on function public.complete_education_order(uuid, text) is
  'Server-only verified settlement boundary. Renewed purchases reset stale expiry state before granting durable access.';
