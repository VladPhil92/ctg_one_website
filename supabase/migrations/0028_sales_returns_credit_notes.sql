-- CTG Craft Beer Investment OS — Sales Returns & Credit Notes
--
-- Introduces immutable commercial return documents, exact bottle genealogy,
-- deterministic tax credit allocation, customer-custody inventory semantics and
-- settlement reconciliation for revenue/tax reversals.

-- ---------------------------------------------------------------------------
-- Safe custody cutover
-- ---------------------------------------------------------------------------
-- Before this migration SOLD units were projected at the sale source location.
-- Moving future SOLD units to CUSTOMER_POSSESSION changes physical semantics, so
-- environments with existing sale history require an explicit audited backfill.
do $$
declare
  v_sales bigint;
  v_sale_items bigint;
begin
  select count(*) into v_sales from public.investment_sales;
  select count(*) into v_sale_items from public.investment_sale_items;

  if v_sales > 0 or v_sale_items > 0 then
    raise exception
      'sales returns cutover requires an explicit customer-custody backfill before migration (sales=%, sale_items=%)',
      v_sales, v_sale_items;
  end if;
end;
$$;

insert into public.investment_inventory_locations(code,name,location_type,is_system)
values ('CUSTOMER_POSSESSION','Cliente final · fuera de inventario vendible','CUSTOMER',true)
on conflict (code) do update
set name = excluded.name,
    location_type = excluded.location_type,
    is_system = true,
    active = true,
    updated_at = now();

-- ---------------------------------------------------------------------------
-- Immutable credit-note documents
-- ---------------------------------------------------------------------------

create table public.investment_sales_credit_notes (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.investment_sales(id) on delete restrict,
  lot_id uuid not null references public.investment_production_lots(id) on delete restrict,
  credit_reference text,
  idempotency_key text not null unique check (length(trim(idempotency_key)) >= 8),
  return_location_id uuid not null references public.investment_inventory_locations(id) on delete restrict,
  reason_code text not null check (reason_code in (
    'CUSTOMER_RETURN','QUALITY_ISSUE','DAMAGED_PRODUCT','WRONG_PRODUCT','OTHER'
  )),
  notes text,
  gross_credit_cents bigint not null check (gross_credit_cents > 0),
  tax_credit_cents bigint not null default 0 check (tax_credit_cents >= 0),
  created_by uuid not null references auth.users(id),
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint investment_sales_credit_notes_tax_not_above_gross
    check (tax_credit_cents <= gross_credit_cents)
);

create index investment_sales_credit_notes_sale_idx
  on public.investment_sales_credit_notes(sale_id, confirmed_at desc);
create index investment_sales_credit_notes_lot_idx
  on public.investment_sales_credit_notes(lot_id, confirmed_at desc);
create index investment_sales_credit_notes_return_location_idx
  on public.investment_sales_credit_notes(return_location_id, confirmed_at desc);
create index investment_sales_credit_notes_created_by_idx
  on public.investment_sales_credit_notes(created_by);

create table public.investment_sales_credit_note_items (
  id uuid primary key default gen_random_uuid(),
  credit_note_id uuid not null references public.investment_sales_credit_notes(id) on delete restrict,
  sale_item_id uuid not null unique references public.investment_sale_items(id) on delete restrict,
  lot_id uuid not null references public.investment_production_lots(id) on delete restrict,
  bottle_unit_id uuid not null unique references public.investment_bottle_units(id) on delete restrict,
  serial_code text not null,
  gross_credit_cents bigint not null check (gross_credit_cents > 0),
  tax_credit_cents bigint not null default 0 check (tax_credit_cents >= 0),
  created_at timestamptz not null default now(),
  constraint investment_sales_credit_note_items_tax_not_above_gross
    check (tax_credit_cents <= gross_credit_cents)
);

create index investment_sales_credit_note_items_note_idx
  on public.investment_sales_credit_note_items(credit_note_id);
create index investment_sales_credit_note_items_lot_idx
  on public.investment_sales_credit_note_items(lot_id);

alter table public.investment_sales_credit_notes enable row level security;
alter table public.investment_sales_credit_note_items enable row level security;

create policy investment_sales_credit_notes_read_authorized
  on public.investment_sales_credit_notes for select to authenticated
  using (
    public.has_investment_permission('sales.manage')
    or public.has_investment_permission('finance.read')
    or public.has_investment_permission('audit.read')
  );

create policy investment_sales_credit_note_items_read_authorized
  on public.investment_sales_credit_note_items for select to authenticated
  using (
    public.has_investment_permission('sales.manage')
    or public.has_investment_permission('finance.read')
    or public.has_investment_permission('audit.read')
  );

revoke all on public.investment_sales_credit_notes from anon;
revoke all on public.investment_sales_credit_note_items from anon;
revoke insert,update,delete,truncate,references,trigger
  on public.investment_sales_credit_notes from authenticated;
revoke insert,update,delete,truncate,references,trigger
  on public.investment_sales_credit_note_items from authenticated;
grant select on public.investment_sales_credit_notes to authenticated;
grant select on public.investment_sales_credit_note_items to authenticated;

create or replace function public._reject_sales_return_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'sales return / credit-note history is append-only';
end;
$$;

revoke all on function public._reject_sales_return_history_mutation()
  from public,anon,authenticated;

create trigger investment_sales_credit_notes_immutable
before update or delete on public.investment_sales_credit_notes
for each row execute function public._reject_sales_return_history_mutation();

create trigger investment_sales_credit_note_items_immutable
before update or delete on public.investment_sales_credit_note_items
for each row execute function public._reject_sales_return_history_mutation();

-- Deterministically allocate sale-level recognized tax to unit sale items. This
-- conserves every cent when all items are credited and makes partial returns
-- reproducible without operator-entered tax guesses.
create or replace function public._sale_item_tax_share(p_sale_item_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  with target as (
    select sale_id from public.investment_sale_items where id = p_sale_item_id
  ), ranked as (
    select
      si.id,
      s.tax_recognized_cents,
      count(*) over ()::bigint as item_count,
      row_number() over (order by si.serial_code,si.id)::bigint as rn
    from public.investment_sale_items si
    join public.investment_sales s on s.id = si.sale_id
    where si.sale_id = (select sale_id from target)
  )
  select
    (tax_recognized_cents / item_count)
    + case when rn <= (tax_recognized_cents % item_count) then 1 else 0 end
  from ranked
  where id = p_sale_item_id
$$;

revoke all on function public._sale_item_tax_share(uuid)
  from public,anon,authenticated;

create or replace function public.guard_sales_credit_note()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_lot uuid;
  v_sale_status text;
  v_location_type text;
  v_location_active boolean;
begin
  if not public.has_investment_permission('sales.manage') then
    raise exception 'sales.manage required';
  end if;

  select lot_id,status into v_sale_lot,v_sale_status
  from public.investment_sales
  where id = new.sale_id;

  if v_sale_lot is null then raise exception 'sale not found'; end if;
  if v_sale_status <> 'CONFIRMED' then raise exception 'only confirmed sales can be credited'; end if;
  if new.lot_id <> v_sale_lot then raise exception 'credit note lot does not match sale lot'; end if;

  select location_type,active into v_location_type,v_location_active
  from public.investment_inventory_locations
  where id = new.return_location_id;

  if v_location_type is null or not v_location_active then
    raise exception 'return location is missing or inactive';
  end if;
  if v_location_type not in ('WAREHOUSE','SALES_POINT','PARTNER','QUARANTINE','OTHER') then
    raise exception 'return location type % is not permitted',v_location_type;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_sales_credit_note()
  from public,anon,authenticated;

create trigger investment_sales_credit_note_guard
before insert on public.investment_sales_credit_notes
for each row execute function public.guard_sales_credit_note();

create or replace function public.guard_sales_credit_note_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note_sale uuid;
  v_note_lot uuid;
  v_item_sale uuid;
  v_item_lot uuid;
  v_item_bottle uuid;
  v_item_serial text;
  v_item_gross bigint;
  v_expected_tax bigint;
begin
  select sale_id,lot_id into v_note_sale,v_note_lot
  from public.investment_sales_credit_notes
  where id = new.credit_note_id;

  select sale_id,lot_id,bottle_unit_id,serial_code,line_total_cents
    into v_item_sale,v_item_lot,v_item_bottle,v_item_serial,v_item_gross
  from public.investment_sale_items
  where id = new.sale_item_id;

  if v_note_sale is null or v_item_sale is null then
    raise exception 'credit note or sale item not found';
  end if;
  if v_note_sale <> v_item_sale
     or new.lot_id <> v_note_lot
     or new.lot_id <> v_item_lot
     or new.bottle_unit_id <> v_item_bottle
     or new.serial_code <> v_item_serial then
    raise exception 'credit-note item genealogy mismatch';
  end if;
  if new.gross_credit_cents <> v_item_gross then
    raise exception 'physical return must credit the full original sale-item gross';
  end if;

  v_expected_tax := public._sale_item_tax_share(new.sale_item_id);
  if new.tax_credit_cents <> v_expected_tax then
    raise exception 'credit-note item tax does not match deterministic sale tax allocation';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_sales_credit_note_item()
  from public,anon,authenticated;

create trigger investment_sales_credit_note_item_guard
before insert on public.investment_sales_credit_note_items
for each row execute function public.guard_sales_credit_note_item();

create or replace function public._assert_sales_credit_note_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gross bigint;
  v_tax bigint;
begin
  select coalesce(sum(gross_credit_cents),0),coalesce(sum(tax_credit_cents),0)
    into v_gross,v_tax
  from public.investment_sales_credit_note_items
  where credit_note_id = new.id;

  if v_gross <> new.gross_credit_cents or v_tax <> new.tax_credit_cents then
    raise exception 'credit-note aggregate/item mismatch: note %, gross %/% tax %/%',
      new.id,new.gross_credit_cents,v_gross,new.tax_credit_cents,v_tax;
  end if;

  return null;
end;
$$;

revoke all on function public._assert_sales_credit_note_totals()
  from public,anon,authenticated;

create constraint trigger investment_sales_credit_note_totals_guard
after insert on public.investment_sales_credit_notes
deferrable initially deferred
for each row execute function public._assert_sales_credit_note_totals();

-- ---------------------------------------------------------------------------
-- Inventory genealogy for commercial returns
-- ---------------------------------------------------------------------------

alter table public.investment_inventory_movements
  add column source_credit_note_id uuid
    references public.investment_sales_credit_notes(id) on delete restrict;

create index investment_inventory_movements_source_credit_note_idx
  on public.investment_inventory_movements(source_credit_note_id)
  where source_credit_note_id is not null;

alter table public.investment_inventory_movements
  drop constraint if exists investment_inventory_movements_movement_type_check;
alter table public.investment_inventory_movements
  add constraint investment_inventory_movements_movement_type_check
  check (movement_type in (
    'PRODUCED','PACKAGED','QC_APPROVED','WAREHOUSE_RECEIPT','RESERVED','UNRESERVED',
    'DISPATCHED','RECEIVED_AT_DESTINATION','SOLD','RETURNED','SALE_RETURNED',
    'DAMAGED','EXPIRED','LOST','RECALLED','ADJUSTMENT_IN','ADJUSTMENT_OUT'
  ));

create or replace function public.guard_investment_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  if new.movement_type in ('PRODUCED','PACKAGED','QC_APPROVED') then
    if not public.has_investment_permission('production.manage') then
      raise exception 'production.manage required';
    end if;
  elsif new.movement_type in ('SOLD','SALE_RETURNED') then
    if not public.has_investment_permission('sales.manage') then
      raise exception 'sales.manage required';
    end if;
  elsif new.movement_type in ('RECEIVED_AT_DESTINATION','RETURNED') then
    if not (
      public.has_investment_permission('inventory.manage')
      or public.has_investment_permission('sales.manage')
    ) then
      raise exception 'inventory.manage or sales.manage required';
    end if;
  elsif not public.has_investment_permission('inventory.manage') then
    raise exception 'inventory.manage required';
  end if;

  if new.to_location_id is null then
    raise exception 'canonical destination location is required';
  end if;
  if new.movement_type not in ('PRODUCED','PACKAGED') and new.from_location_id is null then
    raise exception 'canonical origin location is required';
  end if;

  if new.movement_type = 'SOLD' then
    if new.source_sale_id is null then
      raise exception 'SOLD movement requires an authoritative Sales OS document';
    end if;
    if new.source_credit_note_id is not null then
      raise exception 'SOLD movement cannot reference a credit note';
    end if;
  elsif new.source_sale_id is not null then
    raise exception 'only SOLD movement may reference a sale document';
  end if;

  if new.movement_type = 'SALE_RETURNED' then
    if new.source_credit_note_id is null then
      raise exception 'SALE_RETURNED movement requires an authoritative credit note';
    end if;
  elsif new.source_credit_note_id is not null then
    raise exception 'only SALE_RETURNED movement may reference a credit note';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_investment_inventory_movement()
  from public,anon,authenticated;

create or replace function public.guard_inventory_sale_genealogy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source_sale_id is not null and not exists (
    select 1 from public.investment_sales s
    where s.id = new.source_sale_id
      and s.lot_id = new.lot_id
      and s.status = 'CONFIRMED'
  ) then
    raise exception 'inventory movement source sale must be a confirmed sale from the same lot';
  end if;

  if new.source_credit_note_id is not null and not exists (
    select 1 from public.investment_sales_credit_notes cn
    where cn.id = new.source_credit_note_id
      and cn.lot_id = new.lot_id
  ) then
    raise exception 'inventory movement source credit note must belong to the same lot';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_inventory_sale_genealogy()
  from public,anon,authenticated;

create or replace function public._write_unit_inventory_movement_with_credit(
  p_lot_id uuid,
  p_movement_type text,
  p_from_location_id uuid,
  p_to_location_id uuid,
  p_bottle_ids uuid[],
  p_source_sale_id uuid,
  p_source_credit_note_id uuid,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_count integer;
  v_matching integer;
  v_movement_id uuid;
begin
  select array_agg(distinct u.id order by u.id)
    into v_ids
  from unnest(p_bottle_ids) as u(id)
  where u.id is not null;

  v_count := coalesce(cardinality(v_ids),0);
  if v_count <= 0 then raise exception 'movement requires bottle units'; end if;

  select count(*)::integer into v_matching
  from public.investment_bottle_units b
  where b.lot_id = p_lot_id and b.id = any(v_ids);
  if v_matching <> v_count then
    raise exception 'one or more movement bottle units do not belong to the lot';
  end if;

  insert into public.investment_inventory_movements(
    lot_id,movement_type,quantity_units,actor_id,
    from_location_id,to_location_id,source_sale_id,source_credit_note_id,notes
  ) values (
    p_lot_id,p_movement_type,v_count,auth.uid(),
    p_from_location_id,p_to_location_id,p_source_sale_id,p_source_credit_note_id,
    nullif(trim(p_notes),'')
  ) returning id into v_movement_id;

  insert into public.investment_inventory_movement_units(
    movement_id,bottle_unit_id,lot_id
  )
  select v_movement_id,u.id,p_lot_id
  from unnest(v_ids) as u(id);

  return v_movement_id;
end;
$$;

revoke all on function public._write_unit_inventory_movement_with_credit(uuid,text,uuid,uuid,uuid[],uuid,uuid,text)
  from public,anon,authenticated;

create or replace function public._write_unit_inventory_movement(
  p_lot_id uuid,
  p_movement_type text,
  p_from_location_id uuid,
  p_to_location_id uuid,
  p_bottle_ids uuid[],
  p_source_sale_id uuid default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public._write_unit_inventory_movement_with_credit(
    p_lot_id,p_movement_type,p_from_location_id,p_to_location_id,p_bottle_ids,
    p_source_sale_id,null,p_notes
  );
end;
$$;

revoke all on function public._write_unit_inventory_movement(uuid,text,uuid,uuid,uuid[],uuid,text)
  from public,anon,authenticated;

-- ---------------------------------------------------------------------------
-- Financial reversal genealogy
-- ---------------------------------------------------------------------------

alter table public.investment_lot_financial_entries
  add column source_credit_note_id uuid
    references public.investment_sales_credit_notes(id) on delete restrict;

alter table public.investment_lot_financial_entries
  drop constraint if exists investment_lot_financial_entries_entry_type_check;
alter table public.investment_lot_financial_entries
  add constraint investment_lot_financial_entries_entry_type_check
  check (entry_type in (
    'REVENUE','TAX','REVENUE_REVERSAL','TAX_REVERSAL',
    'PRODUCTION_COST','COMMERCIAL_COST','ADJUSTMENT'
  ));

create unique index investment_lot_financial_entries_credit_type_unique
  on public.investment_lot_financial_entries(source_credit_note_id,entry_type)
  where source_credit_note_id is not null
    and entry_type in ('REVENUE_REVERSAL','TAX_REVERSAL');

create or replace function public.guard_investment_financial_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.entry_type in ('REVENUE','TAX') then
    if new.source_credit_note_id is not null then
      raise exception 'sale revenue/tax cannot reference a credit note';
    end if;
    if new.source_sale_id is not null then
      if not exists (
        select 1 from public.investment_sales s
        where s.id = new.source_sale_id and s.lot_id = new.lot_id and s.status = 'CONFIRMED'
      ) then
        raise exception 'financial sale source must be a confirmed sale from the same lot';
      end if;
      if not (
        public.has_investment_permission('sales.manage')
        or public.has_investment_permission('finance.manage')
      ) then
        raise exception 'sales.manage or finance.manage required for sales-backed revenue/tax';
      end if;
    elsif not public.has_investment_permission('finance.manage') then
      raise exception 'finance.manage required for unbacked revenue/tax';
    end if;
  elsif new.entry_type in ('REVENUE_REVERSAL','TAX_REVERSAL') then
    if new.source_sale_id is not null or new.source_credit_note_id is null then
      raise exception 'reversal entries require a credit note and cannot reference a sale directly';
    end if;
    if not exists (
      select 1 from public.investment_sales_credit_notes cn
      where cn.id = new.source_credit_note_id and cn.lot_id = new.lot_id
    ) then
      raise exception 'financial credit-note source must belong to the same lot';
    end if;
    if not (
      public.has_investment_permission('sales.manage')
      or public.has_investment_permission('finance.manage')
    ) then
      raise exception 'sales.manage or finance.manage required for credit-note reversals';
    end if;
  else
    if new.source_sale_id is not null or new.source_credit_note_id is not null then
      raise exception 'cost/adjustment entries cannot reference sale or credit-note documents';
    end if;
    if not public.has_investment_permission('finance.manage') then
      raise exception 'finance.manage required for financial entries';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_investment_financial_entry()
  from public,anon,authenticated;

-- ---------------------------------------------------------------------------
-- Sales OS: source location -> customer custody
-- ---------------------------------------------------------------------------

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
  sold_count integer,
  gross_revenue_cents bigint,
  tax_recognized_cents bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channel_id uuid;
  v_channel_active boolean;
  v_existing public.investment_sales;
  v_existing_serials text[];
  v_serials text[];
  v_requested integer;
  v_count integer;
  v_gross bigint;
  v_sale_id uuid;
  v_existing_item_prices_match boolean;
  v_requested_location_id uuid;
  v_source_location_id uuid;
  v_location_count integer;
  v_source_location_name text;
  v_customer_location_id uuid;
  v_customer_location_name text;
  v_bottle_ids uuid[];
begin
  if not public.has_investment_permission('sales.manage') then
    raise exception 'not authorized';
  end if;
  if p_lot_id is null then raise exception 'lot is required'; end if;
  if p_unit_price_cents is null or p_unit_price_cents <= 0 then
    raise exception 'unit price must be positive';
  end if;
  if p_tax_cents is null or p_tax_cents < 0 then raise exception 'tax must be non-negative'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'idempotency key is required';
  end if;

  select array_agg(distinct upper(trim(serial)) order by upper(trim(serial)))
    into v_serials
  from unnest(p_serial_codes) as serial
  where nullif(trim(serial),'') is not null;
  v_requested := coalesce(cardinality(v_serials),0);
  if v_requested <= 0 then raise exception 'at least one valid serial is required'; end if;

  v_gross := v_requested::bigint * p_unit_price_cents;
  if p_tax_cents > v_gross then raise exception 'tax cannot exceed gross revenue'; end if;

  select id,active into v_channel_id,v_channel_active
  from public.investment_sales_channels
  where code = upper(trim(p_channel_code));
  if v_channel_id is null then raise exception 'sales channel not found: %',p_channel_code; end if;

  if nullif(trim(p_location),'') is not null then
    v_requested_location_id := public._resolve_inventory_location(
      p_location,array['WAREHOUSE','TRANSIT','SALES_POINT','PARTNER','OTHER']::text[],true
    );
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('ctg-sale-idempotency:' || trim(p_idempotency_key),0)
  );

  select * into v_existing
  from public.investment_sales
  where idempotency_key = trim(p_idempotency_key)
  limit 1;

  if found then
    select array_agg(serial_code order by serial_code),
           bool_and(unit_price_cents = p_unit_price_cents)
      into v_existing_serials,v_existing_item_prices_match
    from public.investment_sale_items
    where sale_id = v_existing.id;

    if v_requested_location_id is null then
      v_requested_location_id := v_existing.location_id;
    end if;

    if v_existing.lot_id <> p_lot_id
       or v_existing.channel_id <> v_channel_id
       or v_existing.gross_revenue_cents <> v_gross
       or v_existing.tax_recognized_cents <> p_tax_cents
       or coalesce(v_existing.sale_reference,'') <> coalesce(nullif(trim(p_sale_reference),''),'')
       or v_existing.location_id is distinct from v_requested_location_id
       or v_existing_serials is distinct from v_serials
       or coalesce(v_existing_item_prices_match,false) is not true then
      raise exception 'idempotency key already used with a different sale payload';
    end if;

    sale_id := v_existing.id;
    sold_count := cardinality(v_existing_serials);
    gross_revenue_cents := v_existing.gross_revenue_cents;
    tax_recognized_cents := v_existing.tax_recognized_cents;
    return next;
    return;
  end if;

  if not v_channel_active then raise exception 'sales channel is inactive: %',p_channel_code; end if;

  perform 1
  from public.investment_bottle_units
  where lot_id = p_lot_id and serial_code = any(v_serials)
  for update;

  select count(*)::integer,
         count(distinct b.current_location_id)::integer,
         min(b.current_location_id::text)::uuid,
         array_agg(b.id order by b.id)
    into v_count,v_location_count,v_source_location_id,v_bottle_ids
  from public.investment_bottle_units b
  where b.lot_id = p_lot_id
    and b.serial_code = any(v_serials)
    and b.status in ('WAREHOUSE','DISPATCHED','IN_MARKET')
    and not exists (
      select 1 from public.investment_sale_items si where si.bottle_unit_id = b.id
    );

  if v_count <> v_requested then
    raise exception 'one or more requested bottle units are missing, not sellable, or were previously sold';
  end if;
  if exists (
    select 1 from public.investment_bottle_units
    where lot_id = p_lot_id and serial_code = any(v_serials)
      and current_location_id is null
  ) then
    raise exception 'sale contains bottle units without canonical inventory location';
  end if;
  if v_location_count <> 1 then
    raise exception 'a sale document cannot span multiple physical inventory locations';
  end if;
  if v_requested_location_id is not null and v_requested_location_id <> v_source_location_id then
    raise exception 'sale location does not match the physical location of the bottle units';
  end if;

  v_source_location_id := coalesce(v_requested_location_id,v_source_location_id);
  select name into v_source_location_name
  from public.investment_inventory_locations where id = v_source_location_id;

  v_customer_location_id := public._resolve_inventory_location(
    'CUSTOMER_POSSESSION',array['CUSTOMER']::text[],true
  );
  select name into v_customer_location_name
  from public.investment_inventory_locations where id = v_customer_location_id;

  insert into public.investment_sales(
    lot_id,channel_id,sale_reference,idempotency_key,location,location_id,
    gross_revenue_cents,tax_recognized_cents,created_by
  ) values (
    p_lot_id,v_channel_id,nullif(trim(p_sale_reference),''),trim(p_idempotency_key),
    v_source_location_name,v_source_location_id,v_gross,p_tax_cents,auth.uid()
  ) returning id into v_sale_id;

  insert into public.investment_sale_items(
    sale_id,lot_id,bottle_unit_id,serial_code,unit_price_cents,line_total_cents
  )
  select v_sale_id,p_lot_id,b.id,b.serial_code,p_unit_price_cents,p_unit_price_cents
  from public.investment_bottle_units b
  where b.lot_id = p_lot_id and b.id = any(v_bottle_ids);

  perform public._write_unit_inventory_movement(
    p_lot_id,'SOLD',v_source_location_id,v_customer_location_id,
    v_bottle_ids,v_sale_id,'Sales OS · sale ' || v_sale_id::text
  );

  update public.investment_bottle_units
  set status = 'SOLD',
      sold_at = now(),
      sale_price_cents = p_unit_price_cents,
      sale_reference = coalesce(nullif(trim(p_sale_reference),''),v_sale_id::text),
      current_location_id = v_customer_location_id,
      current_location = v_customer_location_name,
      last_actor_id = auth.uid(),
      updated_at = now()
  where lot_id = p_lot_id and id = any(v_bottle_ids);

  insert into public.investment_lot_financial_entries(
    lot_id,entry_type,amount_cents,description,actor_id,source_sale_id
  ) values (
    p_lot_id,'REVENUE',v_gross,'Sales OS · sale ' || v_sale_id::text,
    auth.uid(),v_sale_id
  );

  if p_tax_cents > 0 then
    insert into public.investment_lot_financial_entries(
      lot_id,entry_type,amount_cents,description,actor_id,source_sale_id
    ) values (
      p_lot_id,'TAX',p_tax_cents,'Sales OS · sale ' || v_sale_id::text,
      auth.uid(),v_sale_id
    );
  end if;

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values (
    auth.uid(),'record_bottle_sale_document','investment_sales',v_sale_id,
    jsonb_build_object(
      'lot_id',p_lot_id,'channel_code',upper(trim(p_channel_code)),
      'sold_count',v_count,'unit_price_cents',p_unit_price_cents,
      'gross_revenue_cents',v_gross,'tax_recognized_cents',p_tax_cents,
      'sale_reference',p_sale_reference,'idempotency_key',trim(p_idempotency_key),
      'source_location_id',v_source_location_id,'source_location',v_source_location_name,
      'customer_location_id',v_customer_location_id
    )
  );

  sale_id := v_sale_id;
  sold_count := v_count;
  gross_revenue_cents := v_gross;
  tax_recognized_cents := p_tax_cents;
  return next;
end;
$$;

revoke all on function public.record_bottle_sale_document(uuid,text[],bigint,text,text,text,text,bigint)
  from public,anon;
grant execute on function public.record_bottle_sale_document(uuid,text[],bigint,text,text,text,text,bigint)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Authoritative customer return + credit-note transaction
-- ---------------------------------------------------------------------------

create or replace function public.record_sale_return_credit_note(
  p_sale_id uuid,
  p_serial_codes text[],
  p_return_location text,
  p_reason_code text,
  p_idempotency_key text,
  p_credit_reference text default null,
  p_notes text default null
)
returns table(
  credit_note_id uuid,
  returned_count integer,
  gross_credit_cents bigint,
  tax_credit_cents bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.investment_sales;
  v_existing public.investment_sales_credit_notes;
  v_existing_serials text[];
  v_serials text[];
  v_requested integer;
  v_found integer;
  v_return_location_id uuid;
  v_return_location_name text;
  v_customer_location_id uuid;
  v_bottle_ids uuid[];
  v_gross bigint;
  v_tax bigint;
  v_credit_note_id uuid;
  v_reason text;
begin
  if not public.has_investment_permission('sales.manage') then
    raise exception 'sales.manage required';
  end if;
  if p_sale_id is null then raise exception 'sale is required'; end if;
  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'idempotency key is required';
  end if;

  v_reason := upper(trim(p_reason_code));
  if v_reason not in ('CUSTOMER_RETURN','QUALITY_ISSUE','DAMAGED_PRODUCT','WRONG_PRODUCT','OTHER') then
    raise exception 'invalid return reason';
  end if;

  select array_agg(distinct upper(trim(serial)) order by upper(trim(serial)))
    into v_serials
  from unnest(p_serial_codes) as serial
  where nullif(trim(serial),'') is not null;
  v_requested := coalesce(cardinality(v_serials),0);
  if v_requested <= 0 then raise exception 'at least one serial is required'; end if;

  v_return_location_id := public._resolve_inventory_location(
    p_return_location,array['WAREHOUSE','SALES_POINT','PARTNER','QUARANTINE','OTHER']::text[],true
  );
  if v_return_location_id is null then raise exception 'registered return location is required'; end if;
  select name into v_return_location_name
  from public.investment_inventory_locations where id = v_return_location_id;

  perform pg_advisory_xact_lock(
    hashtextextended('ctg-credit-note-idempotency:' || trim(p_idempotency_key),0)
  );

  select * into v_existing
  from public.investment_sales_credit_notes
  where idempotency_key = trim(p_idempotency_key)
  limit 1;

  if found then
    select array_agg(serial_code order by serial_code)
      into v_existing_serials
    from public.investment_sales_credit_note_items
    where credit_note_id = v_existing.id;

    if v_existing.sale_id <> p_sale_id
       or v_existing.return_location_id <> v_return_location_id
       or v_existing.reason_code <> v_reason
       or coalesce(v_existing.credit_reference,'') <> coalesce(nullif(trim(p_credit_reference),''),'')
       or coalesce(v_existing.notes,'') <> coalesce(nullif(trim(p_notes),''),'')
       or v_existing_serials is distinct from v_serials then
      raise exception 'idempotency key already used with a different credit-note payload';
    end if;

    credit_note_id := v_existing.id;
    returned_count := cardinality(v_existing_serials);
    gross_credit_cents := v_existing.gross_credit_cents;
    tax_credit_cents := v_existing.tax_credit_cents;
    return next;
    return;
  end if;

  select * into v_sale
  from public.investment_sales
  where id = p_sale_id
  for update;
  if v_sale.id is null then raise exception 'sale not found'; end if;
  if v_sale.status <> 'CONFIRMED' then raise exception 'only confirmed sales can be returned'; end if;

  perform pg_advisory_xact_lock(
    hashtextextended('ctg-sale-return:' || p_sale_id::text,0)
  );

  perform 1
  from public.investment_bottle_units b
  where b.id in (
    select si.bottle_unit_id
    from public.investment_sale_items si
    where si.sale_id = p_sale_id and si.serial_code = any(v_serials)
  )
  for update;

  select count(*)::integer,array_agg(si.bottle_unit_id order by si.bottle_unit_id)
    into v_found,v_bottle_ids
  from public.investment_sale_items si
  join public.investment_bottle_units b on b.id = si.bottle_unit_id
  where si.sale_id = p_sale_id
    and si.serial_code = any(v_serials)
    and b.status = 'SOLD';

  if v_found <> v_requested then
    raise exception 'one or more serials are not SOLD units from the selected sale';
  end if;

  if exists (
    select 1
    from public.investment_sale_items si
    join public.investment_sales_credit_note_items cni on cni.sale_item_id = si.id
    where si.sale_id = p_sale_id and si.serial_code = any(v_serials)
  ) then
    raise exception 'one or more sale items were already credited';
  end if;

  v_customer_location_id := public._resolve_inventory_location(
    'CUSTOMER_POSSESSION',array['CUSTOMER']::text[],true
  );
  if exists (
    select 1 from public.investment_bottle_units b
    where b.id = any(v_bottle_ids)
      and b.current_location_id is distinct from v_customer_location_id
  ) then
    raise exception 'one or more SOLD units are not in canonical customer custody';
  end if;

  with ranked as (
    select
      si.id,
      si.serial_code,
      si.line_total_cents,
      s.tax_recognized_cents,
      count(*) over ()::bigint as item_count,
      row_number() over (order by si.serial_code,si.id)::bigint as rn
    from public.investment_sale_items si
    join public.investment_sales s on s.id = si.sale_id
    where si.sale_id = p_sale_id
  ), selected as (
    select *,
      (tax_recognized_cents / item_count)
      + case when rn <= (tax_recognized_cents % item_count) then 1 else 0 end as item_tax
    from ranked
    where serial_code = any(v_serials)
  )
  select coalesce(sum(line_total_cents),0),coalesce(sum(item_tax),0)
    into v_gross,v_tax
  from selected;

  if v_gross <= 0 then raise exception 'credit amount must be positive'; end if;

  insert into public.investment_sales_credit_notes(
    sale_id,lot_id,credit_reference,idempotency_key,return_location_id,
    reason_code,notes,gross_credit_cents,tax_credit_cents,created_by
  ) values (
    p_sale_id,v_sale.lot_id,nullif(trim(p_credit_reference),''),trim(p_idempotency_key),
    v_return_location_id,v_reason,nullif(trim(p_notes),''),v_gross,v_tax,auth.uid()
  ) returning id into v_credit_note_id;

  with ranked as (
    select
      si.id as sale_item_id,
      si.lot_id,
      si.bottle_unit_id,
      si.serial_code,
      si.line_total_cents,
      s.tax_recognized_cents,
      count(*) over ()::bigint as item_count,
      row_number() over (order by si.serial_code,si.id)::bigint as rn
    from public.investment_sale_items si
    join public.investment_sales s on s.id = si.sale_id
    where si.sale_id = p_sale_id
  )
  insert into public.investment_sales_credit_note_items(
    credit_note_id,sale_item_id,lot_id,bottle_unit_id,serial_code,
    gross_credit_cents,tax_credit_cents
  )
  select
    v_credit_note_id,sale_item_id,lot_id,bottle_unit_id,serial_code,line_total_cents,
    (tax_recognized_cents / item_count)
      + case when rn <= (tax_recognized_cents % item_count) then 1 else 0 end
  from ranked
  where serial_code = any(v_serials);

  perform public._write_unit_inventory_movement_with_credit(
    v_sale.lot_id,'SALE_RETURNED',v_customer_location_id,v_return_location_id,
    v_bottle_ids,null,v_credit_note_id,
    'Sales return · credit note ' || v_credit_note_id::text
  );

  update public.investment_bottle_units
  set status = 'RETURNED',
      current_location_id = v_return_location_id,
      current_location = v_return_location_name,
      last_actor_id = auth.uid(),
      updated_at = now()
  where id = any(v_bottle_ids);

  insert into public.investment_lot_financial_entries(
    lot_id,entry_type,amount_cents,description,actor_id,source_credit_note_id
  ) values (
    v_sale.lot_id,'REVENUE_REVERSAL',v_gross,
    'Sales Return · credit note ' || v_credit_note_id::text,
    auth.uid(),v_credit_note_id
  );

  if v_tax > 0 then
    insert into public.investment_lot_financial_entries(
      lot_id,entry_type,amount_cents,description,actor_id,source_credit_note_id
    ) values (
      v_sale.lot_id,'TAX_REVERSAL',v_tax,
      'Sales Return · credit note ' || v_credit_note_id::text,
      auth.uid(),v_credit_note_id
    );
  end if;

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values (
    auth.uid(),'record_sale_return_credit_note','investment_sales_credit_notes',v_credit_note_id,
    jsonb_build_object(
      'sale_id',p_sale_id,'lot_id',v_sale.lot_id,'returned_count',v_requested,
      'gross_credit_cents',v_gross,'tax_credit_cents',v_tax,
      'return_location_id',v_return_location_id,'reason_code',v_reason,
      'credit_reference',p_credit_reference,'idempotency_key',trim(p_idempotency_key)
    )
  );

  credit_note_id := v_credit_note_id;
  returned_count := v_requested;
  gross_credit_cents := v_gross;
  tax_credit_cents := v_tax;
  return next;
end;
$$;

revoke all on function public.record_sale_return_credit_note(uuid,text[],text,text,text,text,text)
  from public,anon;
grant execute on function public.record_sale_return_credit_note(uuid,text[],text,text,text,text,text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Inventory read models: returned/previously-sold units are never sellable
-- ---------------------------------------------------------------------------

create or replace function public.get_inventory_location_stock(p_lot_id uuid default null)
returns table(
  location_id uuid,
  location_code text,
  location_name text,
  location_type text,
  lot_id uuid,
  lot_code text,
  bottle_status text,
  inventory_class text,
  quantity_units bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_investment_permission('ops.read') then
    raise exception 'ops.read required';
  end if;

  return query
  select
    loc.id,
    coalesce(loc.code,'UNMAPPED'),
    coalesce(loc.name,'Ubicación no mapeada'),
    coalesce(loc.location_type,'OTHER'),
    b.lot_id,
    lot.code,
    b.status,
    case
      when b.status = 'SOLD' then 'SOLD'
      when exists (
        select 1 from public.investment_sale_items si where si.bottle_unit_id = b.id
      ) then 'NON_SELLABLE'
      when b.status in ('WAREHOUSE','DISPATCHED','IN_MARKET') then 'SELLABLE'
      when b.status in ('PACKAGED','QC_APPROVED') then 'WORK_IN_PROCESS'
      else 'NON_SELLABLE'
    end,
    count(*)::bigint
  from public.investment_bottle_units b
  join public.investment_production_lots lot on lot.id = b.lot_id
  left join public.investment_inventory_locations loc on loc.id = b.current_location_id
  where p_lot_id is null or b.lot_id = p_lot_id
  group by loc.id,loc.code,loc.name,loc.location_type,b.id,b.lot_id,lot.code,b.status
  order by lot.code,coalesce(loc.code,'UNMAPPED'),b.status;
end;
$$;

revoke all on function public.get_inventory_location_stock(uuid) from public,anon;
grant execute on function public.get_inventory_location_stock(uuid) to authenticated;

create or replace function public.get_inventory_reconciliation(p_lot_id uuid default null)
returns table(
  lot_id uuid,
  lot_code text,
  serialized_units bigint,
  movement_events bigint,
  movement_quantity_mismatches bigint,
  bottles_without_history bigint,
  canonical_location_gaps bigint,
  location_mismatches bigint,
  status_mismatches bigint,
  sale_link_mismatches bigint,
  is_reconciled boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_investment_permission('ops.read') then
    raise exception 'ops.read required';
  end if;

  return query
  with ranked_events as (
    select
      mu.bottle_unit_id,m.lot_id,m.movement_type,m.to_location_id,
      m.source_sale_id,m.source_credit_note_id,
      row_number() over (
        partition by mu.bottle_unit_id order by m.sequence_no desc
      ) as rn
    from public.investment_inventory_movement_units mu
    join public.investment_inventory_movements m on m.id = mu.movement_id
  ), last_events as (
    select bottle_unit_id,lot_id,movement_type,to_location_id,source_sale_id,source_credit_note_id
    from ranked_events where rn = 1
  ), credit_return_events as (
    select distinct mu.bottle_unit_id,m.source_credit_note_id
    from public.investment_inventory_movement_units mu
    join public.investment_inventory_movements m on m.id = mu.movement_id
    where m.movement_type = 'SALE_RETURNED' and m.source_credit_note_id is not null
  ), bottle_eval as (
    select
      b.lot_id,
      count(*)::bigint as serialized_units,
      count(*) filter (where le.bottle_unit_id is null)::bigint as bottles_without_history,
      count(*) filter (
        where b.current_location_id is null
           or (le.bottle_unit_id is not null and le.to_location_id is null)
      )::bigint as canonical_location_gaps,
      count(*) filter (
        where le.bottle_unit_id is not null
          and b.current_location_id is distinct from le.to_location_id
      )::bigint as location_mismatches,
      count(*) filter (
        where le.bottle_unit_id is not null
          and b.status is distinct from case le.movement_type
            when 'PACKAGED' then 'PACKAGED'
            when 'QC_APPROVED' then 'QC_APPROVED'
            when 'WAREHOUSE_RECEIPT' then 'WAREHOUSE'
            when 'DISPATCHED' then 'DISPATCHED'
            when 'RECEIVED_AT_DESTINATION' then 'IN_MARKET'
            when 'RETURNED' then 'RETURNED'
            when 'SALE_RETURNED' then 'RETURNED'
            when 'DAMAGED' then 'DAMAGED'
            when 'LOST' then 'LOST'
            when 'EXPIRED' then 'EXPIRED'
            when 'RECALLED' then 'RECALLED'
            when 'SOLD' then 'SOLD'
            else b.status
          end
      )::bigint as status_mismatches,
      count(*) filter (
        where (
          b.status = 'SOLD'
          and (
            si.sale_id is null
            or cni.id is not null
            or le.source_sale_id is distinct from si.sale_id
          )
        ) or (
          b.status <> 'SOLD'
          and si.sale_id is not null
          and (
            cni.id is null
            or cre.source_credit_note_id is distinct from cni.credit_note_id
          )
        )
      )::bigint as sale_link_mismatches
    from public.investment_bottle_units b
    left join last_events le on le.bottle_unit_id = b.id
    left join public.investment_sale_items si on si.bottle_unit_id = b.id
    left join public.investment_sales_credit_note_items cni on cni.sale_item_id = si.id
    left join credit_return_events cre
      on cre.bottle_unit_id = b.id and cre.source_credit_note_id = cni.credit_note_id
    group by b.lot_id
  ), movement_eval as (
    select
      m.lot_id,
      count(*)::bigint as movement_events,
      count(*) filter (
        where m.quantity_units <> coalesce(mu.linked_units,0)
      )::bigint as movement_quantity_mismatches
    from public.investment_inventory_movements m
    left join (
      select movement_id,count(*)::integer as linked_units
      from public.investment_inventory_movement_units
      group by movement_id
    ) mu on mu.movement_id = m.id
    group by m.lot_id
  )
  select
    l.id,l.code,
    coalesce(be.serialized_units,0),coalesce(me.movement_events,0),
    coalesce(me.movement_quantity_mismatches,0),
    coalesce(be.bottles_without_history,0),coalesce(be.canonical_location_gaps,0),
    coalesce(be.location_mismatches,0),coalesce(be.status_mismatches,0),
    coalesce(be.sale_link_mismatches,0),
    (
      coalesce(me.movement_quantity_mismatches,0) = 0
      and coalesce(be.bottles_without_history,0) = 0
      and coalesce(be.canonical_location_gaps,0) = 0
      and coalesce(be.location_mismatches,0) = 0
      and coalesce(be.status_mismatches,0) = 0
      and coalesce(be.sale_link_mismatches,0) = 0
    )
  from public.investment_production_lots l
  left join bottle_eval be on be.lot_id = l.id
  left join movement_eval me on me.lot_id = l.id
  where p_lot_id is null or l.id = p_lot_id
  order by l.created_at desc;
end;
$$;

revoke all on function public.get_inventory_reconciliation(uuid) from public,anon;
grant execute on function public.get_inventory_reconciliation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Commercial return reconciliation read model
-- ---------------------------------------------------------------------------

create or replace function public.get_sales_return_reconciliation(p_sale_id uuid default null)
returns table(
  sale_id uuid,
  lot_id uuid,
  sale_reference text,
  sold_units bigint,
  returned_units bigint,
  credit_note_count bigint,
  gross_revenue_cents bigint,
  gross_credit_cents bigint,
  net_revenue_cents bigint,
  tax_recognized_cents bigint,
  tax_credit_cents bigint,
  net_tax_cents bigint,
  physical_return_mismatches bigint,
  financial_reversal_mismatches bigint,
  return_state text,
  is_reconciled boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (
    public.has_investment_permission('sales.manage')
    or public.has_investment_permission('finance.read')
    or public.has_investment_permission('audit.read')
  ) then
    raise exception 'sales/finance/audit read permission required';
  end if;

  return query
  with item_counts as (
    select sale_id,count(*)::bigint sold_units
    from public.investment_sale_items group by sale_id
  ), credit_agg as (
    select
      cn.sale_id,
      count(distinct cn.id)::bigint credit_note_count,
      count(cni.id)::bigint returned_units,
      coalesce(sum(cni.gross_credit_cents),0)::bigint gross_credit_cents,
      coalesce(sum(cni.tax_credit_cents),0)::bigint tax_credit_cents,
      count(*) filter (
        where not exists (
          select 1
          from public.investment_inventory_movements m
          join public.investment_inventory_movement_units mu on mu.movement_id = m.id
          where m.movement_type = 'SALE_RETURNED'
            and m.source_credit_note_id = cn.id
            and mu.bottle_unit_id = cni.bottle_unit_id
        )
      )::bigint as physical_return_mismatches
    from public.investment_sales_credit_notes cn
    join public.investment_sales_credit_note_items cni on cni.credit_note_id = cn.id
    group by cn.sale_id
  ), financial_agg as (
    select
      cn.sale_id,
      coalesce(sum(fe.amount_cents) filter (where fe.entry_type='REVENUE_REVERSAL'),0)::bigint as revenue_reversal,
      coalesce(sum(fe.amount_cents) filter (where fe.entry_type='TAX_REVERSAL'),0)::bigint as tax_reversal
    from public.investment_sales_credit_notes cn
    left join public.investment_lot_financial_entries fe on fe.source_credit_note_id = cn.id
    group by cn.sale_id
  )
  select
    s.id,s.lot_id,s.sale_reference,
    coalesce(ic.sold_units,0),coalesce(ca.returned_units,0),coalesce(ca.credit_note_count,0),
    s.gross_revenue_cents,coalesce(ca.gross_credit_cents,0),
    s.gross_revenue_cents - coalesce(ca.gross_credit_cents,0),
    s.tax_recognized_cents,coalesce(ca.tax_credit_cents,0),
    s.tax_recognized_cents - coalesce(ca.tax_credit_cents,0),
    coalesce(ca.physical_return_mismatches,0),
    case when
      coalesce(fa.revenue_reversal,0) <> coalesce(ca.gross_credit_cents,0)
      or coalesce(fa.tax_reversal,0) <> coalesce(ca.tax_credit_cents,0)
    then 1 else 0 end::bigint,
    case
      when coalesce(ca.returned_units,0) = 0 then 'NONE'
      when coalesce(ca.returned_units,0) = coalesce(ic.sold_units,0) then 'FULL'
      else 'PARTIAL'
    end,
    (
      coalesce(ca.physical_return_mismatches,0) = 0
      and coalesce(fa.revenue_reversal,0) = coalesce(ca.gross_credit_cents,0)
      and coalesce(fa.tax_reversal,0) = coalesce(ca.tax_credit_cents,0)
    )
  from public.investment_sales s
  left join item_counts ic on ic.sale_id = s.id
  left join credit_agg ca on ca.sale_id = s.id
  left join financial_agg fa on fa.sale_id = s.id
  where s.status = 'CONFIRMED' and (p_sale_id is null or s.id = p_sale_id)
  order by s.sold_at desc;
end;
$$;

revoke all on function public.get_sales_return_reconciliation(uuid) from public,anon;
grant execute on function public.get_sales_return_reconciliation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Settlement: gross sale facts minus immutable credit-note reversals
-- ---------------------------------------------------------------------------

create or replace function public.finalize_settlement(p_lot_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot public.investment_production_lots;
  v_ndlp bigint;
  v_settlement_id uuid;
  v_snapshot jsonb;
  v_allocated integer;
  v_formula_count integer;
  v_formula_version_id uuid;
  v_sales_gross bigint;
  v_sales_tax bigint;
  v_credit_gross bigint;
  v_credit_tax bigint;
  v_financial_revenue bigint;
  v_financial_tax bigint;
  v_financial_revenue_reversal bigint;
  v_financial_tax_reversal bigint;
begin
  if not public.is_investment_admin() then raise exception 'not authorized'; end if;

  select * into v_lot
  from public.investment_production_lots
  where id = p_lot_id
  for update;

  if v_lot is null then raise exception 'lot not found'; end if;
  if v_lot.status <> 'SETTLEMENT_PENDING' then
    raise exception 'lot is not in SETTLEMENT_PENDING (status: %)',v_lot.status;
  end if;
  if exists (select 1 from public.investment_settlements where lot_id = p_lot_id) then
    raise exception 'lot already settled';
  end if;

  select coalesce(sum(case_equivalent_units),0)::integer,
         count(distinct formula_version_id)::integer,
         min(formula_version_id::text)::uuid
    into v_allocated,v_formula_count,v_formula_version_id
  from public.investment_funding_allocations
  where lot_id = p_lot_id;

  if v_allocated <> v_lot.total_eligible_units then
    raise exception 'settlement allocation coverage mismatch: % allocated vs % eligible',
      v_allocated,v_lot.total_eligible_units;
  end if;
  if v_formula_count <> 1 or v_formula_version_id is null then
    raise exception 'settlement requires exactly one formula version across the lot';
  end if;

  if exists (
    select 1 from public.investment_lot_financial_entries
    where lot_id = p_lot_id
      and (
        (entry_type in ('REVENUE','TAX') and source_sale_id is null)
        or (entry_type in ('REVENUE_REVERSAL','TAX_REVERSAL') and source_credit_note_id is null)
      )
  ) then
    raise exception 'settlement contains unbacked sale or credit-note financial entries';
  end if;

  select coalesce(sum(gross_revenue_cents),0),coalesce(sum(tax_recognized_cents),0)
    into v_sales_gross,v_sales_tax
  from public.investment_sales
  where lot_id = p_lot_id and status = 'CONFIRMED';

  select coalesce(sum(gross_credit_cents),0),coalesce(sum(tax_credit_cents),0)
    into v_credit_gross,v_credit_tax
  from public.investment_sales_credit_notes
  where lot_id = p_lot_id;

  select
    coalesce(sum(amount_cents) filter (where entry_type='REVENUE'),0),
    coalesce(sum(amount_cents) filter (where entry_type='TAX'),0),
    coalesce(sum(amount_cents) filter (where entry_type='REVENUE_REVERSAL'),0),
    coalesce(sum(amount_cents) filter (where entry_type='TAX_REVERSAL'),0)
    into v_financial_revenue,v_financial_tax,
         v_financial_revenue_reversal,v_financial_tax_reversal
  from public.investment_lot_financial_entries
  where lot_id = p_lot_id;

  if v_sales_gross <> v_financial_revenue then
    raise exception 'sales/finance revenue mismatch: % sales vs % financial',
      v_sales_gross,v_financial_revenue;
  end if;
  if v_sales_tax <> v_financial_tax then
    raise exception 'sales/finance tax mismatch: % sales vs % financial',
      v_sales_tax,v_financial_tax;
  end if;
  if v_credit_gross <> v_financial_revenue_reversal then
    raise exception 'credit-note/finance revenue reversal mismatch: % credit vs % financial',
      v_credit_gross,v_financial_revenue_reversal;
  end if;
  if v_credit_tax <> v_financial_tax_reversal then
    raise exception 'credit-note/finance tax reversal mismatch: % credit vs % financial',
      v_credit_tax,v_financial_tax_reversal;
  end if;
  if v_credit_gross > v_sales_gross or v_credit_tax > v_sales_tax then
    raise exception 'credit notes cannot exceed confirmed sale totals';
  end if;

  select
    coalesce(sum(amount_cents) filter (where entry_type='REVENUE'),0)
    - coalesce(sum(amount_cents) filter (where entry_type='REVENUE_REVERSAL'),0)
    - coalesce(sum(amount_cents) filter (where entry_type='TAX'),0)
    + coalesce(sum(amount_cents) filter (where entry_type='TAX_REVERSAL'),0)
    - coalesce(sum(amount_cents) filter (where entry_type='PRODUCTION_COST'),0)
    - coalesce(sum(amount_cents) filter (where entry_type='COMMERCIAL_COST'),0)
    - coalesce(sum(amount_cents) filter (where entry_type='ADJUSTMENT'),0)
    into v_ndlp
  from public.investment_lot_financial_entries
  where lot_id = p_lot_id;

  with exact as (
    select
      fa.id as allocation_id,fa.participant_user_id,fa.is_ctg_internal,
      fa.case_equivalent_units,fa.capital_committed_cents,fa.formula_version_id,
      fv.participant_profit_share,
      (v_ndlp::numeric * fa.case_equivalent_units::numeric / v_lot.total_eligible_units::numeric) as exact_ndlp
    from public.investment_funding_allocations fa
    join public.investment_formula_versions fv on fv.id = fa.formula_version_id
    where fa.lot_id = p_lot_id
  ), base as (
    select *,floor(exact_ndlp)::bigint as attributable_ndlp_floor,
      exact_ndlp - floor(exact_ndlp) as fractional_remainder
    from exact
  ), remainder_total as (
    select (v_ndlp - coalesce(sum(attributable_ndlp_floor),0))::integer as cents_to_distribute
    from base
  ), ranked as (
    select base.*,
      row_number() over (order by fractional_remainder desc,allocation_id asc) as rnk
    from base
  ), distributed as (
    select ranked.*,
      attributable_ndlp_floor
        + case when rnk <= (select cents_to_distribute from remainder_total) then 1 else 0 end
        as attributable_ndlp_cents
    from ranked
  ), final as (
    select *,
      round(attributable_ndlp_cents * participant_profit_share)::bigint as participant_profit_cents,
      attributable_ndlp_cents - round(attributable_ndlp_cents * participant_profit_share)::bigint as ctg_profit_cents
    from distributed
  )
  select jsonb_agg(
    jsonb_build_object(
      'allocation_id',allocation_id,'participant_user_id',participant_user_id,
      'is_ctg_internal',is_ctg_internal,'case_equivalent_units',case_equivalent_units,
      'capital_committed_cents',capital_committed_cents,'formula_version_id',formula_version_id,
      'attributable_ndlp_cents',attributable_ndlp_cents,
      'participant_profit_cents',participant_profit_cents,'ctg_profit_cents',ctg_profit_cents,
      'capital_recovery_cents',capital_committed_cents,
      'settlement_amount_cents',capital_committed_cents + participant_profit_cents
    ) order by allocation_id
  ) into v_snapshot
  from final;

  if v_snapshot is null then raise exception 'settlement has no allocations'; end if;

  insert into public.investment_settlements(
    lot_id,formula_version_id,net_distributable_profit_cents,
    total_eligible_units,snapshot,finalized_by
  ) values (
    p_lot_id,v_formula_version_id,v_ndlp,
    v_lot.total_eligible_units,v_snapshot,auth.uid()
  ) returning id into v_settlement_id;

  insert into public.investment_ledger_entries(
    participant_user_id,lot_id,allocation_id,entry_type,
    amount_cents,reference,metadata,actor_id
  )
  select
    (elem ->> 'participant_user_id')::uuid,p_lot_id,
    (elem ->> 'allocation_id')::uuid,'SETTLEMENT_CREDIT',
    (elem ->> 'settlement_amount_cents')::bigint,v_settlement_id::text,
    jsonb_build_object(
      'capital_recovery_cents',elem ->> 'capital_recovery_cents',
      'participant_profit_cents',elem ->> 'participant_profit_cents'
    ),auth.uid()
  from jsonb_array_elements(v_snapshot) elem
  where not (elem ->> 'is_ctg_internal')::boolean
    and (elem ->> 'settlement_amount_cents')::bigint > 0;

  perform public._investment_write_production_event(
    p_lot_id,v_lot.status,'SETTLED',auth.uid(),'Settlement finalized'
  );

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values (
    auth.uid(),'finalize_settlement','investment_settlements',v_settlement_id,
    jsonb_build_object(
      'lot_id',p_lot_id,'ndlp_cents',v_ndlp,'formula_version_id',v_formula_version_id,
      'sales_gross_cents',v_sales_gross,'sales_tax_cents',v_sales_tax,
      'credit_gross_cents',v_credit_gross,'credit_tax_cents',v_credit_tax,
      'net_sales_gross_cents',v_sales_gross-v_credit_gross,
      'net_sales_tax_cents',v_sales_tax-v_credit_tax
    )
  );

  return v_settlement_id;
end;
$$;

revoke all on function public.finalize_settlement(uuid) from public,anon;
grant execute on function public.finalize_settlement(uuid) to authenticated;

comment on table public.investment_sales_credit_notes is
  'Immutable commercial credit note for physical bottle returns. Original sale documents remain unchanged.';
comment on table public.investment_sales_credit_note_items is
  'Unit-level return genealogy. Each original sale item/bottle may be commercially returned at most once.';
comment on column public.investment_inventory_movements.source_credit_note_id is
  'Authoritative credit note for SALE_RETURNED inventory movements.';
comment on column public.investment_lot_financial_entries.source_credit_note_id is
  'Authoritative credit note for REVENUE_REVERSAL/TAX_REVERSAL entries.';
