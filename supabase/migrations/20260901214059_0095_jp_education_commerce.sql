-- JP Valderrama Education Commerce V1
--
-- Establishes a catalog, server-controlled orders, durable user entitlements
-- and authenticated institutional advisory requests on the canonical CTG One
-- identity (public.profiles.id / auth.uid()).
--
-- Payment attempts never grant access. Only the server-only
-- complete_education_order() boundary can turn a verified paid order into
-- entitlements.

create table public.education_offerings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  offering_type text not null,
  summary text not null,
  status text not null default 'draft',
  price_amount integer,
  currency text not null default 'COP',
  access_path text,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_offerings_slug_check
    check (char_length(slug) between 3 and 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint education_offerings_title_check
    check (char_length(btrim(title)) between 2 and 180),
  constraint education_offerings_type_check
    check (offering_type in ('conference', 'book', 'course', 'class', 'resource')),
  constraint education_offerings_status_check
    check (status in ('draft', 'published', 'archived')),
  constraint education_offerings_price_check
    check (price_amount is null or price_amount >= 0),
  constraint education_offerings_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  constraint education_offerings_access_path_check
    check (access_path is null or (access_path like '/%' and char_length(access_path) <= 240)),
  constraint education_offerings_metadata_check
    check (jsonb_typeof(metadata) = 'object')
);

create index education_offerings_public_catalog_idx
  on public.education_offerings(status, offering_type, published_at desc);

alter table public.education_offerings enable row level security;
revoke all on table public.education_offerings from public, anon, authenticated;
grant select on table public.education_offerings to anon, authenticated;

create policy education_offerings_public_read
  on public.education_offerings
  for select
  to anon, authenticated
  using (status = 'published');

create table public.education_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'initiated',
  currency text not null default 'COP',
  total_amount integer not null,
  payment_provider text,
  provider_reference text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_orders_status_check
    check (status in ('initiated', 'pending', 'paid', 'failed', 'cancelled', 'refunded')),
  constraint education_orders_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  constraint education_orders_total_check
    check (total_amount >= 0),
  constraint education_orders_provider_reference_check
    check (provider_reference is null or char_length(provider_reference) between 1 and 240),
  constraint education_orders_verified_state_check
    check ((status in ('paid', 'refunded') and verified_at is not null) or (status not in ('paid', 'refunded')))
);

create unique index education_orders_provider_reference_key
  on public.education_orders(payment_provider, provider_reference)
  where payment_provider is not null and provider_reference is not null;
create index education_orders_user_created_idx
  on public.education_orders(user_id, created_at desc);

alter table public.education_orders enable row level security;
revoke all on table public.education_orders from public, anon, authenticated;
grant select on table public.education_orders to authenticated;

create policy education_orders_owner_read
  on public.education_orders
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create table public.education_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.education_orders(id) on delete cascade,
  offering_id uuid not null references public.education_offerings(id) on delete restrict,
  quantity integer not null default 1,
  unit_amount integer not null,
  created_at timestamptz not null default now(),
  constraint education_order_items_quantity_check check (quantity between 1 and 100),
  constraint education_order_items_unit_amount_check check (unit_amount >= 0),
  constraint education_order_items_order_offering_key unique (order_id, offering_id)
);

create index education_order_items_order_idx
  on public.education_order_items(order_id);

alter table public.education_order_items enable row level security;
revoke all on table public.education_order_items from public, anon, authenticated;
grant select on table public.education_order_items to authenticated;

create policy education_order_items_owner_read
  on public.education_order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.education_orders o
      where o.id = education_order_items.order_id
        and o.user_id = (select auth.uid())
    )
  );

create table public.education_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  offering_id uuid not null references public.education_offerings(id) on delete cascade,
  source_type text not null,
  source_reference text,
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_entitlements_source_check
    check (source_type in ('purchase', 'complimentary', 'scholarship', 'bundle', 'admin')),
  constraint education_entitlements_status_check
    check (status in ('active', 'revoked', 'expired')),
  constraint education_entitlements_source_reference_check
    check (source_reference is null or char_length(source_reference) between 1 and 240),
  constraint education_entitlements_window_check
    check (ends_at is null or ends_at > starts_at),
  constraint education_entitlements_revoke_check
    check ((status = 'revoked' and revoked_at is not null) or status <> 'revoked'),
  constraint education_entitlements_user_offering_key unique (user_id, offering_id)
);

create index education_entitlements_user_status_idx
  on public.education_entitlements(user_id, status, granted_at desc);

alter table public.education_entitlements enable row level security;
revoke all on table public.education_entitlements from public, anon, authenticated;
grant select on table public.education_entitlements to authenticated;

create policy education_entitlements_owner_read
  on public.education_entitlements
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create table public.education_advisory_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  institution_name text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  service_area text not null,
  message text not null,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_advisory_institution_check
    check (char_length(btrim(institution_name)) between 2 and 180),
  constraint education_advisory_contact_name_check
    check (char_length(btrim(contact_name)) between 2 and 120),
  constraint education_advisory_contact_email_check
    check (
      contact_email = lower(btrim(contact_email))
      and char_length(contact_email) between 3 and 254
      and position('@' in contact_email) > 1
    ),
  constraint education_advisory_contact_phone_check
    check (contact_phone is null or char_length(btrim(contact_phone)) between 7 and 32),
  constraint education_advisory_service_area_check
    check (char_length(btrim(service_area)) between 2 and 120),
  constraint education_advisory_message_check
    check (char_length(btrim(message)) between 20 and 4000),
  constraint education_advisory_status_check
    check (status in ('submitted', 'qualified', 'proposal', 'scheduled', 'won', 'lost', 'closed'))
);

create index education_advisory_requests_user_created_idx
  on public.education_advisory_requests(user_id, created_at desc);

alter table public.education_advisory_requests enable row level security;
revoke all on table public.education_advisory_requests from public, anon, authenticated;
grant select, insert on table public.education_advisory_requests to authenticated;

create policy education_advisory_owner_read
  on public.education_advisory_requests
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy education_advisory_owner_insert
  on public.education_advisory_requests
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- Trusted-server payment completion boundary. A browser cannot execute this
-- function. The caller must verify the payment provider event before invoking
-- it; this routine then atomically marks the order paid and grants access.
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
    starts_at = least(public.education_entitlements.starts_at, excluded.starts_at),
    granted_at = excluded.granted_at,
    revoked_at = null,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.complete_education_order(uuid, text) from public, anon, authenticated;
grant execute on function public.complete_education_order(uuid, text) to service_role;

insert into public.education_offerings (
  slug,
  title,
  offering_type,
  summary,
  status,
  price_amount,
  currency,
  access_path,
  metadata,
  published_at
) values (
  'filosofia-o-dinero',
  '¿Filosofía o Dinero? — El arte de comer papel',
  'conference',
  'Conferencia de Valderrama Talks sobre formación humanística, trabajo, valor económico y las expectativas sociales alrededor de estudiar filosofía.',
  'published',
  10000,
  'COP',
  '/jpvalderrama/talks',
  '{"event_slug":"filosofia-o-dinero"}'::jsonb,
  now()
)
on conflict (slug) do nothing;

comment on table public.education_offerings is
  'Published JP Valderrama educational products and services. Browser roles can only read published rows.';
comment on table public.education_orders is
  'Server-created education checkout records. Users can read their own orders but cannot create or mark them paid directly.';
comment on table public.education_entitlements is
  'Canonical CTG One access rights for JP Valderrama educational offerings, keyed by auth.uid()/profiles.id.';
comment on table public.education_advisory_requests is
  'Authenticated school and institution advisory requests. Users may create and read their own requests; workflow status is server-managed.';
comment on function public.complete_education_order(uuid, text) is
  'Server-only atomic settlement boundary. Call only after external payment verification; paid orders grant durable user entitlements.';
