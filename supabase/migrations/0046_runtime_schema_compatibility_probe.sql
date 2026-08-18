-- CTG One — runtime database schema compatibility probe
--
-- Purpose:
--   Give the server runtime a minimal, read-only way to verify that the
--   production database migration state matches the application release.
--
-- Security boundary:
--   - SECURITY DEFINER is required because supabase_migrations is not exposed
--     through the public PostgREST schema.
--   - EXECUTE is granted only to service_role.
--   - anon/authenticated/public receive no execution privilege.
--   - The function returns only the latest migration version; it does not expose
--     migration SQL, checksums, catalog contents, secrets, or application data.

create or replace function public.get_runtime_schema_version()
returns text
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select max(m.version)::text
  from supabase_migrations.schema_migrations m;
$$;

revoke all on function public.get_runtime_schema_version() from public;
revoke all on function public.get_runtime_schema_version() from anon;
revoke all on function public.get_runtime_schema_version() from authenticated;
grant execute on function public.get_runtime_schema_version() to service_role;
