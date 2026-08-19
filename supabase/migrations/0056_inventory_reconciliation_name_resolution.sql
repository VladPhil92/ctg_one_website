-- CTG One OS — inventory reconciliation name-resolution repair
--
-- `get_inventory_reconciliation(uuid)` returns TABLE columns, which become
-- PL/pgSQL variables. Unqualified CTE columns such as `lot_id` therefore collide
-- with those output variables at runtime. This migration preserves the existing
-- reconciliation semantics and qualifies every potentially ambiguous reference.

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
      mu.bottle_unit_id as bottle_unit_id,
      m.lot_id as event_lot_id,
      m.movement_type as movement_type,
      m.to_location_id as to_location_id,
      m.source_sale_id as source_sale_id,
      m.source_credit_note_id as source_credit_note_id,
      row_number() over (
        partition by mu.bottle_unit_id
        order by m.sequence_no desc
      ) as rn
    from public.investment_inventory_movement_units mu
    join public.investment_inventory_movements m on m.id = mu.movement_id
  ),
  last_events as (
    select
      re.bottle_unit_id,
      re.event_lot_id,
      re.movement_type,
      re.to_location_id,
      re.source_sale_id,
      re.source_credit_note_id
    from ranked_events re
    where re.rn = 1
  ),
  credit_return_events as (
    select distinct
      mu.bottle_unit_id as bottle_unit_id,
      m.source_credit_note_id as source_credit_note_id
    from public.investment_inventory_movement_units mu
    join public.investment_inventory_movements m on m.id = mu.movement_id
    where m.movement_type = 'SALE_RETURNED'
      and m.source_credit_note_id is not null
  ),
  bottle_eval as (
    select
      b.lot_id as evaluated_lot_id,
      count(*)::bigint as serialized_count,
      count(*) filter (where le.bottle_unit_id is null)::bigint as bottles_without_history_count,
      count(*) filter (
        where b.current_location_id is null
           or (le.bottle_unit_id is not null and le.to_location_id is null)
      )::bigint as canonical_location_gaps_count,
      count(*) filter (
        where le.bottle_unit_id is not null
          and b.current_location_id is distinct from le.to_location_id
      )::bigint as location_mismatches_count,
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
      )::bigint as status_mismatches_count,
      count(*) filter (
        where
          (
            b.status = 'SOLD'
            and (
              si.sale_id is null
              or cni.id is not null
              or le.source_sale_id is distinct from si.sale_id
            )
          )
          or (
            b.status <> 'SOLD'
            and si.sale_id is not null
            and (
              cni.id is null
              or cre.source_credit_note_id is distinct from cni.credit_note_id
            )
          )
      )::bigint as sale_link_mismatches_count
    from public.investment_bottle_units b
    left join last_events le on le.bottle_unit_id = b.id
    left join public.investment_sale_items si on si.bottle_unit_id = b.id
    left join public.investment_sales_credit_note_items cni on cni.sale_item_id = si.id
    left join credit_return_events cre
      on cre.bottle_unit_id = b.id
     and cre.source_credit_note_id = cni.credit_note_id
    group by b.lot_id
  ),
  movement_eval as (
    select
      m.lot_id as evaluated_lot_id,
      count(*)::bigint as movement_event_count,
      count(*) filter (
        where m.quantity_units <> coalesce(mu.linked_units, 0)
      )::bigint as movement_quantity_mismatch_count
    from public.investment_inventory_movements m
    left join (
      select
        imu.movement_id as movement_id,
        count(*)::integer as linked_units
      from public.investment_inventory_movement_units imu
      group by imu.movement_id
    ) mu on mu.movement_id = m.id
    group by m.lot_id
  )
  select
    l.id,
    l.code,
    coalesce(be.serialized_count, 0),
    coalesce(me.movement_event_count, 0),
    coalesce(me.movement_quantity_mismatch_count, 0),
    coalesce(be.bottles_without_history_count, 0),
    coalesce(be.canonical_location_gaps_count, 0),
    coalesce(be.location_mismatches_count, 0),
    coalesce(be.status_mismatches_count, 0),
    coalesce(be.sale_link_mismatches_count, 0),
    (
      coalesce(me.movement_quantity_mismatch_count, 0) = 0
      and coalesce(be.bottles_without_history_count, 0) = 0
      and coalesce(be.canonical_location_gaps_count, 0) = 0
      and coalesce(be.location_mismatches_count, 0) = 0
      and coalesce(be.status_mismatches_count, 0) = 0
      and coalesce(be.sale_link_mismatches_count, 0) = 0
    )
  from public.investment_production_lots l
  left join bottle_eval be on be.evaluated_lot_id = l.id
  left join movement_eval me on me.evaluated_lot_id = l.id
  where p_lot_id is null or l.id = p_lot_id
  order by l.created_at desc;
end;
$$;

revoke all on function public.get_inventory_reconciliation(uuid) from public, anon;
grant execute on function public.get_inventory_reconciliation(uuid) to authenticated;
