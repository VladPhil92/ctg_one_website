-- CTG Craft Beer Investment OS — Sales Returns hardening
-- Follow-up to 0028: privileged-write invariants, full FK indexes and corrected
-- stock aggregation by commercial eligibility.

-- Full covering indexes keep FK maintenance predictable and satisfy the same
-- performance discipline used by Inventory Reconciliation.
create index if not exists investment_inventory_movements_source_credit_note_full_idx
  on public.investment_inventory_movements(source_credit_note_id);
create index if not exists investment_lot_financial_entries_source_credit_note_idx
  on public.investment_lot_financial_entries(source_credit_note_id);

-- A privileged insert into an existing immutable note item set must not be able
-- to make note totals diverge after the note's own deferred trigger has passed.
create or replace function public._assert_sales_credit_note_parent_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_note public.investment_sales_credit_notes;
  v_gross bigint;
  v_tax bigint;
begin
  select * into v_note
  from public.investment_sales_credit_notes
  where id = new.credit_note_id;

  if v_note.id is null then raise exception 'credit note not found'; end if;

  select coalesce(sum(gross_credit_cents),0),coalesce(sum(tax_credit_cents),0)
    into v_gross,v_tax
  from public.investment_sales_credit_note_items
  where credit_note_id = new.credit_note_id;

  if v_gross <> v_note.gross_credit_cents or v_tax <> v_note.tax_credit_cents then
    raise exception 'credit-note parent/item mismatch: note %, gross %/% tax %/%',
      v_note.id,v_note.gross_credit_cents,v_gross,v_note.tax_credit_cents,v_tax;
  end if;

  return null;
end;
$$;

revoke all on function public._assert_sales_credit_note_parent_totals()
  from public,anon,authenticated;

create constraint trigger investment_sales_credit_note_item_parent_totals_guard
after insert on public.investment_sales_credit_note_items
deferrable initially deferred
for each row execute function public._assert_sales_credit_note_parent_totals();

-- Financial document genealogy must prove not only ownership but exact value.
create or replace function public.guard_investment_financial_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_lot uuid;
  v_sale_status text;
  v_sale_gross bigint;
  v_sale_tax bigint;
  v_credit_lot uuid;
  v_credit_gross bigint;
  v_credit_tax bigint;
begin
  if new.entry_type in ('REVENUE','TAX') then
    if new.source_credit_note_id is not null then
      raise exception 'sale revenue/tax cannot reference a credit note';
    end if;

    if new.source_sale_id is not null then
      select lot_id,status,gross_revenue_cents,tax_recognized_cents
        into v_sale_lot,v_sale_status,v_sale_gross,v_sale_tax
      from public.investment_sales
      where id = new.source_sale_id;

      if v_sale_lot is null or v_sale_lot <> new.lot_id or v_sale_status <> 'CONFIRMED' then
        raise exception 'financial sale source must be a confirmed sale from the same lot';
      end if;
      if new.entry_type = 'REVENUE' and new.amount_cents <> v_sale_gross then
        raise exception 'sales-backed REVENUE must equal authoritative sale gross';
      end if;
      if new.entry_type = 'TAX' and new.amount_cents <> v_sale_tax then
        raise exception 'sales-backed TAX must equal authoritative sale tax';
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

    select lot_id,gross_credit_cents,tax_credit_cents
      into v_credit_lot,v_credit_gross,v_credit_tax
    from public.investment_sales_credit_notes
    where id = new.source_credit_note_id;

    if v_credit_lot is null or v_credit_lot <> new.lot_id then
      raise exception 'financial credit-note source must belong to the same lot';
    end if;
    if new.entry_type = 'REVENUE_REVERSAL' and new.amount_cents <> v_credit_gross then
      raise exception 'REVENUE_REVERSAL must equal authoritative credit-note gross';
    end if;
    if new.entry_type = 'TAX_REVERSAL' and new.amount_cents <> v_credit_tax then
      raise exception 'TAX_REVERSAL must equal authoritative credit-note tax';
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

-- Correct stock aggregation. Sale history is projected once per bottle and then
-- grouped by the resulting inventory class instead of grouping by bottle id.
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
  with classified as (
    select
      b.id,b.lot_id,b.status,b.current_location_id,
      case
        when b.status = 'SOLD' then 'SOLD'
        when exists (
          select 1 from public.investment_sale_items si where si.bottle_unit_id = b.id
        ) then 'NON_SELLABLE'
        when b.status in ('WAREHOUSE','DISPATCHED','IN_MARKET') then 'SELLABLE'
        when b.status in ('PACKAGED','QC_APPROVED') then 'WORK_IN_PROCESS'
        else 'NON_SELLABLE'
      end as inventory_class
    from public.investment_bottle_units b
    where p_lot_id is null or b.lot_id = p_lot_id
  )
  select
    loc.id,
    coalesce(loc.code,'UNMAPPED'),
    coalesce(loc.name,'Ubicación no mapeada'),
    coalesce(loc.location_type,'OTHER'),
    c.lot_id,
    lot.code,
    c.status,
    c.inventory_class,
    count(*)::bigint
  from classified c
  join public.investment_production_lots lot on lot.id = c.lot_id
  left join public.investment_inventory_locations loc on loc.id = c.current_location_id
  group by loc.id,loc.code,loc.name,loc.location_type,
           c.lot_id,lot.code,c.status,c.inventory_class
  order by lot.code,coalesce(loc.code,'UNMAPPED'),c.status,c.inventory_class;
end;
$$;

revoke all on function public.get_inventory_location_stock(uuid) from public,anon;
grant execute on function public.get_inventory_location_stock(uuid) to authenticated;
