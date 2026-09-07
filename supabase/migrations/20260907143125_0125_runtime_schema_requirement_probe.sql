-- 0125_runtime_schema_requirement_probe.sql
-- Deployment-orchestration capability probe.
--
-- This RPC is intentionally server-only. It allows a release to prove that
-- its exact required logical migration is present even when production has
-- advanced beyond that release under the DB-first expand/contract protocol.

create or replace function public.has_runtime_schema_migration(
  p_logical_version text,
  p_expected_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_logical_version ~ '^[0-9]{4}$'
    and p_expected_name ~ '^[a-z0-9_]+$'
    and exists (
      select 1
      from supabase_migrations.schema_migrations as migration
      where
        (
          migration.version = p_logical_version
          and migration.name = p_expected_name
        )
        or migration.name = p_logical_version || '_' || p_expected_name
    );
$$;

revoke all on function public.has_runtime_schema_migration(text, text) from public;
revoke all on function public.has_runtime_schema_migration(text, text) from anon;
revoke all on function public.has_runtime_schema_migration(text, text) from authenticated;
grant execute on function public.has_runtime_schema_migration(text, text) to service_role;

comment on function public.has_runtime_schema_migration(text, text) is
  'Server-only proof that an exact logical migration is present in Supabase migration history; used by DB-first deployment orchestration.';
