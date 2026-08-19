-- CTG Craft Beer Investment OS — Sales document idempotency qualification
--
-- Immutable follow-up to 0028. The record_bottle_sale_document() return table
-- exposes an output variable named `sale_id`. In the exact-idempotent-replay
-- branch, an unqualified `where sale_id = v_existing.id` is therefore ambiguous
-- to PL/pgSQL and makes a legitimate retry fail after the original sale has
-- already committed. Keep the full Sales OS contract unchanged and qualify the
-- sale-item columns explicitly.

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
    select array_agg(si.serial_code order by si.serial_code),
           bool_and(si.unit_price_cents = p_unit_price_cents)
      into v_existing_serials,v_existing_item_prices_match
    from public.investment_sale_items si
    where si.sale_id = v_existing.id;

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
