-- CTG Craft Beer Investment OS — deterministic sales-return reconciliation name resolution
--
-- Follow-up to P2.5 runtime verification. The existing function used unqualified
-- CTE column names such as `sale_id`, which collide with RETURNS TABLE output
-- variables in PL/pgSQL. This migration preserves reconciliation semantics while
-- making every intermediate identifier explicit and deterministic.

create or replace function public.get_sales_return_reconciliation(
  p_sale_id uuid default null
)
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
    select
      si.sale_id as item_sale_id,
      count(*)::bigint as sold_units
    from public.investment_sale_items si
    group by si.sale_id
  ),
  credit_agg as (
    select
      cn.sale_id as credit_sale_id,
      count(distinct cn.id)::bigint as credit_note_count,
      count(cni.id)::bigint as returned_units,
      coalesce(sum(cni.gross_credit_cents), 0)::bigint as gross_credit_cents,
      coalesce(sum(cni.tax_credit_cents), 0)::bigint as tax_credit_cents,
      count(*) filter (
        where not exists (
          select 1
          from public.investment_inventory_movements m
          join public.investment_inventory_movement_units mu
            on mu.movement_id = m.id
          where m.movement_type = 'SALE_RETURNED'
            and m.source_credit_note_id = cn.id
            and mu.bottle_unit_id = cni.bottle_unit_id
        )
      )::bigint as physical_return_mismatches
    from public.investment_sales_credit_notes cn
    join public.investment_sales_credit_note_items cni
      on cni.credit_note_id = cn.id
    group by cn.sale_id
  ),
  financial_agg as (
    select
      cn.sale_id as financial_sale_id,
      coalesce(sum(fe.amount_cents) filter (where fe.entry_type = 'REVENUE_REVERSAL'), 0)::bigint as revenue_reversal,
      coalesce(sum(fe.amount_cents) filter (where fe.entry_type = 'TAX_REVERSAL'), 0)::bigint as tax_reversal
    from public.investment_sales_credit_notes cn
    left join public.investment_lot_financial_entries fe
      on fe.source_credit_note_id = cn.id
    group by cn.sale_id
  )
  select
    s.id,
    s.lot_id,
    s.sale_reference,
    coalesce(ic.sold_units, 0),
    coalesce(ca.returned_units, 0),
    coalesce(ca.credit_note_count, 0),
    s.gross_revenue_cents,
    coalesce(ca.gross_credit_cents, 0),
    s.gross_revenue_cents - coalesce(ca.gross_credit_cents, 0),
    s.tax_recognized_cents,
    coalesce(ca.tax_credit_cents, 0),
    s.tax_recognized_cents - coalesce(ca.tax_credit_cents, 0),
    coalesce(ca.physical_return_mismatches, 0),
    case
      when coalesce(fa.revenue_reversal, 0) <> coalesce(ca.gross_credit_cents, 0)
        or coalesce(fa.tax_reversal, 0) <> coalesce(ca.tax_credit_cents, 0)
      then 1
      else 0
    end::bigint,
    case
      when coalesce(ca.returned_units, 0) = 0 then 'NONE'
      when coalesce(ca.returned_units, 0) = coalesce(ic.sold_units, 0) then 'FULL'
      else 'PARTIAL'
    end,
    (
      coalesce(ca.physical_return_mismatches, 0) = 0
      and coalesce(fa.revenue_reversal, 0) = coalesce(ca.gross_credit_cents, 0)
      and coalesce(fa.tax_reversal, 0) = coalesce(ca.tax_credit_cents, 0)
    )
  from public.investment_sales s
  left join item_counts ic on ic.item_sale_id = s.id
  left join credit_agg ca on ca.credit_sale_id = s.id
  left join financial_agg fa on fa.financial_sale_id = s.id
  where s.status = 'CONFIRMED'
    and (p_sale_id is null or s.id = p_sale_id)
  order by s.sold_at desc;
end;
$$;

revoke all on function public.get_sales_return_reconciliation(uuid) from public, anon;
grant execute on function public.get_sales_return_reconciliation(uuid) to authenticated;
