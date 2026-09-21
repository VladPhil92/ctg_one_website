-- 0143_runtime_schema_requirement_probe_timestamp_compatibility.sql
-- Preserve the fail-closed production schema gate while supporting Supabase's
-- timestamp-versioned migration rows whose semantic migration name is exact.

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
        or (
          migration.version ~ '^[0-9]{14}$'
          and migration.name = p_expected_name
        )
    );
$$;

revoke all on function public.has_runtime_schema_migration(text, text) from public;
revoke all on function public.has_runtime_schema_migration(text, text) from anon;
revoke all on function public.has_runtime_schema_migration(text, text) from authenticated;
grant execute on function public.has_runtime_schema_migration(text, text) to service_role;

comment on function public.has_runtime_schema_migration(text, text) is
  'Server-only exact semantic migration proof supporting both legacy logical versions and Supabase timestamp-versioned migration history; used by DB-first deployment orchestration.';
