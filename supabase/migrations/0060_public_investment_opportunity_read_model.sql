-- CTG Craft Beer Investment — public opportunity publication boundary.
--
-- Correctness/security goals:
--   1. DRAFT production lots are internal working data and must not be readable
--      by anonymous/ordinary participant Data API clients.
--   2. Public funding progress must be computed from all authoritative
--      allocations and active order reservations without exposing participant
--      identities, payment evidence or row-level financial data.
--   3. The public read model is aggregate-only and bounded to published lots.

-- Replace the historical unconditional SELECT policy. Published/non-draft lots
-- remain readable by visitors and participants; ops.read actors retain full
-- visibility, including DRAFT, through a separate authenticated policy.
drop policy if exists investment_production_lots_select on public.investment_production_lots;
drop policy if exists investment_production_lots_public_select on public.investment_production_lots;
drop policy if exists investment_production_lots_ops_select on public.investment_production_lots;

create policy investment_production_lots_public_select
on public.investment_production_lots
for select
to anon, authenticated
using (status <> 'DRAFT');

create policy investment_production_lots_ops_select
on public.investment_production_lots
for select
to authenticated
using ((select public.has_investment_permission('ops.read')));


create or replace function public.get_public_investment_lot_funding(p_lot_id uuid default null)
returns table(
  lot_id uuid,
  total_cases integer,
  allocated_cases integer,
  reserved_cases integer,
  funded_percent integer,
  available_cases_equivalent integer
)
language sql
stable
security definer
set search_path = public
as $$
  with allocation_totals as (
    select
      a.lot_id,
      coalesce(sum(a.case_equivalent_units), 0)::integer as allocated_cases_raw
    from public.investment_funding_allocations a
    where p_lot_id is null or a.lot_id = p_lot_id
    group by a.lot_id
  ),
  reservation_totals as (
    select
      o.lot_id,
      coalesce(sum(o.case_equivalent_units), 0)::integer as reserved_cases_raw
    from public.investment_orders o
    where o.status in ('AWAITING_PAYMENT','PENDING_BANK_VERIFICATION','PAYMENT_SUBMITTED','PAYMENT_VERIFIED')
      and (p_lot_id is null or o.lot_id = p_lot_id)
    group by o.lot_id
  ),
  normalized as (
    select
      l.id,
      greatest(l.total_eligible_units, 0)::integer as total_cases,
      least(
        greatest(coalesce(a.allocated_cases_raw, 0), 0),
        greatest(l.total_eligible_units, 0)
      )::integer as allocated_cases,
      greatest(coalesce(r.reserved_cases_raw, 0), 0)::integer as reserved_cases_raw
    from public.investment_production_lots l
    left join allocation_totals a on a.lot_id = l.id
    left join reservation_totals r on r.lot_id = l.id
    where l.status <> 'DRAFT'
      and (p_lot_id is null or l.id = p_lot_id)
  ),
  published as (
    select
      n.id,
      n.total_cases,
      n.allocated_cases,
      least(
        n.reserved_cases_raw,
        greatest(n.total_cases - n.allocated_cases, 0)
      )::integer as reserved_cases
    from normalized n
  )
  select
    p.id as lot_id,
    p.total_cases,
    p.allocated_cases,
    p.reserved_cases,
    case
      when p.total_cases <= 0 then 0
      else round((p.allocated_cases::numeric / p.total_cases::numeric) * 100)::integer
    end as funded_percent,
    greatest(p.total_cases - p.allocated_cases - p.reserved_cases, 0)::integer as available_cases_equivalent
  from published p
  order by p.id;
$$;

comment on function public.get_public_investment_lot_funding(uuid) is
  'Aggregate public funding progress for published investment lots. Funded percent reflects completed allocations; availability also subtracts active order reservations. Exposes no participant, payment-evidence, KYC or bank identifiers.';

revoke all on function public.get_public_investment_lot_funding(uuid) from public;
grant execute on function public.get_public_investment_lot_funding(uuid) to anon, authenticated;

-- System Health historically allowed exactly one anonymous SECURITY DEFINER
-- function by name. Migration 0060 adds a second reviewed anonymous read model;
-- keep the health metric aligned while the stricter CI contract above/beside it
-- continues validating exact signatures, result shapes and referenced objects.
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
        and p.proname not in ('get_public_bottle_trace','get_public_investment_lot_funding')
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
