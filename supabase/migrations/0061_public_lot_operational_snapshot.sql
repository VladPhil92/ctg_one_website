-- CTG Craft Beer Investment — public lot operational truth boundary.
--
-- The public lot page previously attempted to read operational tables directly.
-- `investment_inventory_movements` is ops-only, so anonymous visitors could see
-- a misleading all-zero inventory summary. Production events were the opposite:
-- the whole row was publicly selectable, including actor/evidence/internal notes.
--
-- This migration closes both gaps:
--   1. direct production-event SELECT becomes ops.read-only;
--   2. a reviewed aggregate SECURITY DEFINER read model exposes only current
--      bottle-state counts and a minimal public status timeline for published lots.

-- Internal event rows are operational evidence, not a public API contract.
drop policy if exists investment_production_events_select on public.investment_production_events;
drop policy if exists investment_production_events_ops_select on public.investment_production_events;

create policy investment_production_events_ops_select
on public.investment_production_events
for select
to authenticated
using ((select public.has_investment_permission('ops.read')));


create or replace function public.get_public_investment_lot_operations(p_lot_id uuid)
returns table(
  lot_id uuid,
  serialized_units integer,
  warehouse_units integer,
  dispatched_units integer,
  in_market_units integer,
  sold_units integer,
  returned_units integer,
  incident_units integer,
  timeline jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with published as (
    select l.id
    from public.investment_production_lots l
    where l.id = p_lot_id
      and l.status <> 'DRAFT'
  ),
  inventory as (
    select
      count(*)::integer as serialized_units,
      count(*) filter (where b.status = 'WAREHOUSE')::integer as warehouse_units,
      count(*) filter (where b.status = 'DISPATCHED')::integer as dispatched_units,
      count(*) filter (where b.status = 'IN_MARKET')::integer as in_market_units,
      count(*) filter (where b.status = 'SOLD')::integer as sold_units,
      count(*) filter (where b.status = 'RETURNED')::integer as returned_units,
      count(*) filter (where b.status in ('DAMAGED','LOST','EXPIRED','RECALLED'))::integer as incident_units
    from public.investment_bottle_units b
    join published p on p.id = b.lot_id
  ),
  public_timeline as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'status', e.new_status,
          'occurred_at', e.occurred_at
        )
        order by e.occurred_at asc, e.id asc
      ),
      '[]'::jsonb
    ) as timeline
    from public.investment_production_events e
    join published p on p.id = e.lot_id
  )
  select
    p.id as lot_id,
    i.serialized_units,
    i.warehouse_units,
    i.dispatched_units,
    i.in_market_units,
    i.sold_units,
    i.returned_units,
    i.incident_units,
    t.timeline
  from published p
  cross join inventory i
  cross join public_timeline t;
$$;

comment on function public.get_public_investment_lot_operations(uuid) is
  'Minimal public operational snapshot for one published lot: aggregate bottle-state counts plus status/timestamp timeline only. No actor IDs, evidence IDs, notes, serial codes, locations, prices or sale references.';

revoke all on function public.get_public_investment_lot_operations(uuid) from public;
grant execute on function public.get_public_investment_lot_operations(uuid) to anon, authenticated;

-- Align the high-level health counter with the third deliberately reviewed
-- anonymous SECURITY DEFINER read model. Exact exposure/result/object contracts
-- remain enforced independently by the CI security-definer smoke test.
create or replace function public.get_system_migration_health()
returns table(
  latest_migration text,
  migration_0012_applied boolean,
  migration_0015_applied boolean,
  migration_0016_applied boolean,
  core_permission_guard_triggers integer,
  unintended_anon_security_definer_exec integer,
  unintended_authenticated_internal_exec integer
)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
begin
  if public.get_investment_role() <> 'SUPER_ADMIN' then
    raise exception 'not authorized';
  end if;

  return query
  select
    (select max(m.version) from supabase_migrations.schema_migrations m),
    exists (select 1 from supabase_migrations.schema_migrations m where m.version = '0012'),
    exists (select 1 from supabase_migrations.schema_migrations m where m.version = '0015'),
    exists (select 1 from supabase_migrations.schema_migrations m where m.version = '0016'),
    (
      select count(*)::int
      from pg_trigger t
      where not t.tgisinternal
        and t.tgname in (
          'investment_lots_permission_guard',
          'investment_allocation_permission_guard',
          'investment_inventory_permission_guard',
          'investment_financial_permission_guard',
          'investment_settlement_permission_guard',
          'investment_orders_permission_guard'
        )
    ),
    (
      select count(*)::int
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prosecdef
        and has_function_privilege('anon', p.oid, 'EXECUTE')
        and p.proname not in (
          'get_public_bottle_trace',
          'get_public_investment_lot_funding',
          'get_public_investment_lot_operations'
        )
    ),
    (
      select count(*)::int
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prosecdef
        and has_function_privilege('authenticated', p.oid, 'EXECUTE')
        and p.proname in (
          '_investment_create_allocation',
          '_investment_write_production_event',
          'guard_investment_allocation_insert',
          'guard_investment_financial_entry',
          'guard_investment_inventory_movement',
          'guard_investment_lot_write',
          'guard_investment_order_write',
          'guard_investment_settlement_insert',
          'handle_new_kyc_submission',
          'handle_new_user'
        )
    );
end;
$$;
