-- CTG One OS — exact, bounded inventory read model for Production & Traceability OS.
--
-- The Production console must not infer lot-wide metrics from a capped unit list.
-- This read model returns exact aggregate counts for the selected lot while
-- exposing only one bounded page of unit rows for operator inspection.

create or replace function public.get_production_lot_inventory_snapshot(
  p_lot_id uuid,
  p_unit_limit integer default 60,
  p_unit_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_snapshot jsonb;
begin
  if not public.has_investment_permission('ops.read') then
    raise exception 'ops.read required';
  end if;

  if p_lot_id is null then
    raise exception 'lot id required';
  end if;

  if p_unit_limit is null or p_unit_limit < 1 or p_unit_limit > 100 then
    raise exception 'unit limit must be between 1 and 100';
  end if;

  if p_unit_offset is null or p_unit_offset < 0 then
    raise exception 'unit offset must be non-negative';
  end if;

  if not exists (
    select 1
    from public.investment_production_lots l
    where l.id = p_lot_id
  ) then
    raise exception 'production lot not found';
  end if;

  with summary as (
    select
      count(*)::bigint as total_units,
      coalesce(
        jsonb_object_agg(status, status_count order by status),
        '{}'::jsonb
      ) as status_counts
    from (
      select b.status, count(*)::bigint as status_count
      from public.investment_bottle_units b
      where b.lot_id = p_lot_id
      group by b.status
    ) counts
  ),
  unit_page as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'lot_id', b.lot_id,
          'serial_code', b.serial_code,
          'unit_number', b.unit_number,
          'status', b.status,
          'current_location', b.current_location,
          'sold_at', b.sold_at,
          'sale_price_cents', b.sale_price_cents
        )
        order by b.unit_number desc, b.id desc
      ),
      '[]'::jsonb
    ) as rows
    from (
      select
        u.id,
        u.lot_id,
        u.serial_code,
        u.unit_number,
        u.status,
        u.current_location,
        u.sold_at,
        u.sale_price_cents
      from public.investment_bottle_units u
      where u.lot_id = p_lot_id
      order by u.unit_number desc, u.id desc
      limit p_unit_limit
      offset p_unit_offset
    ) b
  )
  select jsonb_build_object(
    'lot_id', p_lot_id,
    'generated_at', now(),
    'total_units', s.total_units,
    'status_counts', s.status_counts,
    'unit_limit', p_unit_limit,
    'unit_offset', p_unit_offset,
    'units', u.rows
  )
  into v_snapshot
  from summary s
  cross join unit_page u;

  return v_snapshot;
end;
$$;

comment on function public.get_production_lot_inventory_snapshot(uuid, integer, integer) is
  'Authorized Production OS read model: exact lot-wide bottle counts plus one bounded unit page. No financial, participant or payment data.';

revoke all on function public.get_production_lot_inventory_snapshot(uuid, integer, integer) from public, anon;
grant execute on function public.get_production_lot_inventory_snapshot(uuid, integer, integer) to authenticated;
