-- CTG One / CTG Craft Beer — authoritative system health observability
-- Read-only SUPER_ADMIN RPC used by the internal System Health panel.
-- It exposes migration/security invariants without granting clients direct access
-- to Supabase migration metadata or PostgreSQL catalogs.

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
          'investment_allocations_permission_guard',
          'investment_inventory_permission_guard',
          'investment_financial_permission_guard',
          'investment_settlements_permission_guard',
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
        and p.proname <> 'get_public_bottle_trace'
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

revoke all on function public.get_system_migration_health() from public;
revoke all on function public.get_system_migration_health() from anon;
grant execute on function public.get_system_migration_health() to authenticated;
