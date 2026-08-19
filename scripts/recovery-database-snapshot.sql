\set ON_ERROR_STOP on

select json_build_object(
  'snapshotAt', to_char(clock_timestamp() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'authUsers', (select count(*) from auth.users),
  'profiles', (select count(*) from public.profiles),
  'storageObjectMetadata', (select count(*) from storage.objects),
  'investmentLots', (select count(*) from public.investment_production_lots),
  'investmentOrders', (select count(*) from public.investment_orders),
  'investmentLedgerEntries', (select count(*) from public.investment_ledger_entries),
  'investmentSettlements', (select count(*) from public.investment_settlements),
  'investmentSales', (select count(*) from public.investment_sales),
  'investmentBottleUnits', (select count(*) from public.investment_bottle_units),
  'migrationCount', (select count(*) from supabase_migrations.schema_migrations),
  'latestMigration', (select max(version) from supabase_migrations.schema_migrations)
)::text;
