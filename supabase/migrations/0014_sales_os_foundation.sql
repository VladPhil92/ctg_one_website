-- CTG Craft Beer Investment OS — Sales OS foundation
-- Additive migration. The legacy record_bottle_sales() RPC remains available until
-- the Admin OS is explicitly switched after production verification.

create table if not exists public.investment_sales_channels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_]{2,32}$'),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.investment_sales_channels(code, name)
values
  ('PISAO', 'PISÁO Gastrobar'),
  ('DIRECT', 'Venta directa'),
  ('DISTRIBUTOR', 'Distribuidor'),
  ('RESTAURANT_PARTNER', 'Restaurante aliado'),
  ('EVENT', 'Evento'),
  ('RETAIL', 'Retail'),
  ('OTHER', 'Otro')
on conflict (code) do update
set name = excluded.name,
    updated_at = now();

create table if not exists public.investment_sales (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references public.investment_production_lots(id),
  channel_id uuid not null references public.investment_sales_channels(id),
  sale_reference text,
  idempotency_key text not null unique check (length(trim(idempotency_key)) >= 8),
  location text,
  customer_label text,
  status text not null default 'CONFIRMED' check (status in ('CONFIRMED','VOID')),
  gross_revenue_cents bigint not null check (gross_revenue_cents > 0),
  tax_recognized_cents bigint not null default 0 check (tax_recognized_cents >= 0),
  created_by uuid not null references auth.users(id),
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint investment_sales_tax_not_above_gross check (tax_recognized_cents <= gross_revenue_cents)
);

create index if not exists investment_sales_lot_idx on public.investment_sales(lot_id, sold_at desc);
create index if not exists investment_sales_channel_idx on public.investment_sales(channel_id, sold_at desc);

comment on table public.investment_sales is
  'Authoritative commercial sale document. Tax is recorded only when explicitly supplied by the caller/business rule; this migration does not guess whether listed prices are tax-inclusive or tax-exclusive.';

create table if not exists public.investment_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.investment_sales(id) on delete restrict,
  lot_id uuid not null references public.investment_production_lots(id),
  bottle_unit_id uuid not null unique references public.investment_bottle_units(id) on delete restrict,
  serial_code text not null,
  quantity_units int not null default 1 check (quantity_units = 1),
  unit_price_cents bigint not null check (unit_price_cents > 0),
  line_total_cents bigint not null check (line_total_cents > 0),
  created_at timestamptz not null default now()
);

create index if not exists investment_sale_items_sale_idx on public.investment_sale_items(sale_id);
create index if not exists investment_sale_items_lot_idx on public.investment_sale_items(lot_id);

alter table public.investment_sales_channels enable row level security;
alter table public.investment_sales enable row level security;
alter table public.investment_sale_items enable row level security;

drop policy if exists investment_sales_channels_read on public.investment_sales_channels;
create policy investment_sales_channels_read
  on public.investment_sales_channels for select to authenticated
  using (active = true or public.has_investment_permission('sales.manage'));

drop policy if exists investment_sales_read_authorized on public.investment_sales;
create policy investment_sales_read_authorized
  on public.investment_sales for select to authenticated
  using (
    public.has_investment_permission('sales.manage')
    or public.has_investment_permission('finance.read')
    or public.has_investment_permission('audit.read')
  );

drop policy if exists investment_sale_items_read_authorized on public.investment_sale_items;
create policy investment_sale_items_read_authorized
  on public.investment_sale_items for select to authenticated
  using (
    public.has_investment_permission('sales.manage')
    or public.has_investment_permission('finance.read')
    or public.has_investment_permission('audit.read')
  );

revoke insert, update, delete on public.investment_sales_channels from anon, authenticated;
revoke insert, update, delete on public.investment_sales from anon, authenticated;
revoke insert, update, delete on public.investment_sale_items from anon, authenticated;
grant select on public.investment_sales_channels to authenticated;
grant select on public.investment_sales to authenticated;
grant select on public.investment_sale_items to authenticated;

create or replace function public.record_bottle_sale_document(
  p_lot_id uuid,
  p_serial_codes text[],
  p_unit_price_cents bigint,
  p_channel_code text,
  p_idempotency_key text,
  p_sale_reference text default null,
  p_location text default null,
  p_tax_cents bigint default 0
)
returns table(
  sale_id uuid,
  sold_count int,
  gross_revenue_cents bigint,
  tax_recognized_cents bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channel_id uuid;
  v_existing public.investment_sales;
  v_requested int;
  v_count int;
  v_gross bigint;
  v_sale_id uuid;
begin
  if not public.has_investment_permission('sales.manage') then
    raise exception 'not authorized';
  end if;
  if p_lot_id is null then raise exception 'lot is required'; end if;
  if p_unit_price_cents is null or p_unit_price_cents <= 0 then raise exception 'unit price must be positive'; end if;
  if p_tax_cents is null or p_tax_cents < 0 then raise exception 'tax must be non-negative'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then raise exception 'idempotency key is required'; end if;
  if coalesce(array_length(p_serial_codes,1),0) = 0 then raise exception 'at least one serial is required'; end if;

  select * into v_existing
  from public.investment_sales
  where idempotency_key = trim(p_idempotency_key)
  limit 1;

  if v_existing is not null then
    sale_id := v_existing.id;
    select count(*)::int into sold_count from public.investment_sale_items where sale_id = v_existing.id;
    gross_revenue_cents := v_existing.gross_revenue_cents;
    tax_recognized_cents := v_existing.tax_recognized_cents;
    return next;
    return;
  end if;

  select id into v_channel_id
  from public.investment_sales_channels
  where code = upper(trim(p_channel_code)) and active = true;
  if v_channel_id is null then raise exception 'active sales channel not found: %', p_channel_code; end if;

  select count(distinct upper(trim(serial)))::int
    into v_requested
  from unnest(p_serial_codes) as serial
  where nullif(trim(serial),'') is not null;
  if v_requested <= 0 then raise exception 'at least one valid serial is required'; end if;

  -- Lock candidate physical units before validating and writing the sale document.
  perform 1
  from public.investment_bottle_units
  where lot_id = p_lot_id
    and serial_code = any(
      array(select distinct upper(trim(serial)) from unnest(p_serial_codes) as serial where nullif(trim(serial),'') is not null)
    )
  for update;

  select count(*)::int into v_count
  from public.investment_bottle_units
  where lot_id = p_lot_id
    and serial_code = any(
      array(select distinct upper(trim(serial)) from unnest(p_serial_codes) as serial where nullif(trim(serial),'') is not null)
    )
    and status in ('WAREHOUSE','DISPATCHED','IN_MARKET','RETURNED');

  if v_count <> v_requested then
    raise exception 'one or more requested bottle units are missing, duplicated, or not sellable';
  end if;

  v_gross := v_count::bigint * p_unit_price_cents;
  if p_tax_cents > v_gross then raise exception 'tax cannot exceed gross revenue'; end if;

  insert into public.investment_sales(
    lot_id, channel_id, sale_reference, idempotency_key, location,
    gross_revenue_cents, tax_recognized_cents, created_by
  ) values (
    p_lot_id, v_channel_id, nullif(trim(p_sale_reference),''), trim(p_idempotency_key),
    nullif(trim(p_location),''), v_gross, p_tax_cents, auth.uid()
  ) returning id into v_sale_id;

  insert into public.investment_sale_items(
    sale_id, lot_id, bottle_unit_id, serial_code, unit_price_cents, line_total_cents
  )
  select v_sale_id, p_lot_id, b.id, b.serial_code, p_unit_price_cents, p_unit_price_cents
  from public.investment_bottle_units b
  where b.lot_id = p_lot_id
    and b.serial_code = any(
      array(select distinct upper(trim(serial)) from unnest(p_serial_codes) as serial where nullif(trim(serial),'') is not null)
    );

  update public.investment_bottle_units
  set status = 'SOLD',
      sold_at = now(),
      sale_price_cents = p_unit_price_cents,
      sale_reference = coalesce(nullif(trim(p_sale_reference),''), v_sale_id::text),
      current_location = coalesce(nullif(trim(p_location),''), current_location),
      last_actor_id = auth.uid(),
      updated_at = now()
  where lot_id = p_lot_id
    and serial_code = any(
      array(select distinct upper(trim(serial)) from unnest(p_serial_codes) as serial where nullif(trim(serial),'') is not null)
    );

  insert into public.investment_inventory_movements(lot_id, movement_type, quantity_units, actor_id)
  values (p_lot_id, 'SOLD', v_count, auth.uid());

  insert into public.investment_lot_financial_entries(lot_id, entry_type, amount_cents, description, actor_id)
  values (p_lot_id, 'REVENUE', v_gross, 'Sales OS · sale ' || v_sale_id::text, auth.uid());

  if p_tax_cents > 0 then
    insert into public.investment_lot_financial_entries(lot_id, entry_type, amount_cents, description, actor_id)
    values (p_lot_id, 'TAX', p_tax_cents, 'Sales OS · sale ' || v_sale_id::text, auth.uid());
  end if;

  insert into public.investment_audit_log(actor_id, action, entity, entity_id, new_value)
  values (
    auth.uid(), 'record_bottle_sale_document', 'investment_sales', v_sale_id,
    jsonb_build_object(
      'lot_id', p_lot_id,
      'channel_code', upper(trim(p_channel_code)),
      'sold_count', v_count,
      'unit_price_cents', p_unit_price_cents,
      'gross_revenue_cents', v_gross,
      'tax_recognized_cents', p_tax_cents,
      'sale_reference', p_sale_reference,
      'idempotency_key', trim(p_idempotency_key)
    )
  );

  sale_id := v_sale_id;
  sold_count := v_count;
  gross_revenue_cents := v_gross;
  tax_recognized_cents := p_tax_cents;
  return next;
end;
$$;

revoke all on function public.record_bottle_sale_document(uuid,text[],bigint,text,text,text,text,bigint) from public;
grant execute on function public.record_bottle_sale_document(uuid,text[],bigint,text,text,text,text,bigint) to authenticated;
