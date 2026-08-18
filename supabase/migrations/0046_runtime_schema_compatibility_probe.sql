-- CTG One — runtime database schema compatibility probe
--
-- Purpose:
--   Give the trusted server runtime a minimal, read-only way to verify that the
--   production database migration history is compatible with the application
--   release, without exposing the Supabase migration catalog to browser roles.
--
-- Important history note:
--   This project contains legacy four-digit migration versions and, from the
--   investment_minimum_two_cases migration onward, Supabase-managed timestamp
--   versions may also exist in production. Runtime compatibility therefore
--   compares migration count + latest migration name, not the raw version format.
--
-- Security boundary:
--   - SECURITY DEFINER is required because supabase_migrations is not exposed
--     through the public Data API schema.
--   - search_path is empty and every referenced object is schema-qualified.
--   - EXECUTE is granted only to service_role.
--   - anon/authenticated/PUBLIC receive no execution privilege.
--   - Only migration metadata needed for compatibility is returned.

create or replace function public.get_runtime_schema_compatibility()
returns table(
  migration_count bigint,
  latest_version text,
  latest_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*)::bigint as migration_count,
    (array_agg(m.version::text order by m.version desc))[1] as latest_version,
    (array_agg(m.name::text order by m.version desc))[1] as latest_name
  from supabase_migrations.schema_migrations as m;
$$;

revoke all on function public.get_runtime_schema_compatibility() from public;
revoke all on function public.get_runtime_schema_compatibility() from anon;
revoke all on function public.get_runtime_schema_compatibility() from authenticated;
grant execute on function public.get_runtime_schema_compatibility() to service_role;
