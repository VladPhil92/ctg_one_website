-- CTG Craft Beer Investment OS — Inventory Reconciliation preflight
--
-- This cutover deliberately does not invent physical history. If an environment
-- already contains operational bottle/sales/inventory rows, it needs an explicit
-- audited backfill plan before the canonical location model can be installed.
-- Running this gate first prevents a partially upgraded environment.

do $$
declare
  v_bottles bigint;
  v_movements bigint;
  v_sales bigint;
  v_sale_items bigint;
begin
  select count(*) into v_bottles from public.investment_bottle_units;
  select count(*) into v_movements from public.investment_inventory_movements;
  select count(*) into v_sales from public.investment_sales;
  select count(*) into v_sale_items from public.investment_sale_items;

  if v_bottles > 0 or v_movements > 0 or v_sales > 0 or v_sale_items > 0 then
    raise exception
      'inventory reconciliation preflight failed: historical physical data requires an explicit backfill before canonical cutover (bottles=%, movements=%, sales=%, sale_items=%)',
      v_bottles, v_movements, v_sales, v_sale_items;
  end if;
end;
$$;
