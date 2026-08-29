\set ON_ERROR_STOP on

-- Recovery-only destructive normalization for the ephemeral local Supabase target.
--
-- The release migration chain intentionally materializes bootstrap/reference data
-- (for example beer styles, notification templates and private Storage buckets).
-- A production --data-only dump contains the authoritative current rows again,
-- so importing it on top of those bootstrap rows can violate UNIQUE constraints.
--
-- This script is deliberately unusable unless the workflow first sets the custom
-- session guard below. The workflow also verifies the exact loopback connection
-- string before invoking this file. Never run this against a hosted database.

do $recovery$
declare
  v_guard text := current_setting('ctg.recovery_target', true);
  v_tables text;
  v_table record;
  v_rows bigint;
begin
  if v_guard is distinct from 'local-ephemeral-supabase' then
    raise exception 'recovery normalization refused: local ephemeral guard is missing';
  end if;

  if current_database() <> 'postgres' then
    raise exception 'recovery normalization refused: unexpected database %', current_database();
  end if;

  -- Clear every application-owned PUBLIC table in one FK-aware TRUNCATE. Tables
  -- owned by PostgreSQL extensions are excluded so extension reference data is
  -- never treated as application backup content. Partition children are omitted
  -- because truncating the partitioned parent covers them.
  select string_agg(format('%I.%I', n.nspname, c.relname), ', ' order by c.relname)
    into v_tables
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and not c.relispartition
    and not exists (
      select 1
      from pg_depend d
      where d.classid = 'pg_class'::regclass
        and d.objid = c.oid
        and d.refclassid = 'pg_extension'::regclass
        and d.deptype = 'e'
    );

  if v_tables is null then
    raise exception 'recovery normalization refused: no application tables found in public schema';
  end if;

  execute 'truncate table ' || v_tables || ' restart identity';

  -- 0001_init materializes these two private buckets during schema replay. Their
  -- production definitions are authoritative. Objects must already be absent at
  -- this stage; actual Storage bytes are restored and checksum-verified later via
  -- the loopback Storage API.
  if exists (
    select 1 from storage.objects
    where bucket_id in ('kyc-documents', 'payment-proofs')
  ) then
    raise exception 'recovery normalization refused: migration-created Storage buckets unexpectedly contain objects';
  end if;

  delete from storage.buckets
  where id in ('kyc-documents', 'payment-proofs');

  -- Fail closed if any non-extension application table retained rows. This turns
  -- the normalization step into a verified boundary rather than an assumed one.
  for v_table in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relispartition
      and not exists (
        select 1
        from pg_depend d
        where d.classid = 'pg_class'::regclass
          and d.objid = c.oid
          and d.refclassid = 'pg_extension'::regclass
          and d.deptype = 'e'
      )
  loop
    execute format('select count(*) from %I.%I', v_table.schema_name, v_table.table_name)
      into v_rows;
    if v_rows <> 0 then
      raise exception 'recovery normalization failed: %.% retained % row(s)',
        v_table.schema_name, v_table.table_name, v_rows;
    end if;
  end loop;

  if exists (
    select 1 from storage.buckets
    where id in ('kyc-documents', 'payment-proofs')
  ) then
    raise exception 'recovery normalization failed: migration-created Storage bucket rows remain';
  end if;
end
$recovery$;
