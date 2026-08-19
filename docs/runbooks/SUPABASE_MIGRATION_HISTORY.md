# Supabase migration history synchronization

## Invariant

The migration version stored in `supabase_migrations.schema_migrations.version` must match the numeric prefix of the corresponding file in `supabase/migrations/`.

CTG One uses the repository sequence `0001`, `0002`, ... as the canonical migration identity. Production migration history must therefore preserve those same identities.

## Why this matters

Supabase GitHub Preview compares remote migration versions with the migration files in the checked-out Git ref. If a migration is applied through an API/tool that records a generated timestamp instead of the repository prefix, the database schema may be correct while Preview fails with `Remote migration versions not found in local migrations directory`.

That is migration-history drift, not schema drift.

## Deployment rule

For every schema change:

1. Add the next sequential `NNNN_snake_case.sql` migration to the repository.
2. Prove the complete migration chain on a fresh PostgreSQL/Supabase database in CI.
3. Merge only after CI is green.
4. Apply the exact migration to production.
5. Verify that production migration history uses the same `NNNN` version and migration name as the repository.
6. Verify runtime schema compatibility and Supabase Preview before continuing.

Do not rename an already-applied repository migration and do not allow tool-generated timestamp versions to become the canonical production identity.

## Recovery from history-only drift

If the schema objects are already correctly applied and only migration metadata differs, reconcile the migration-history version to the existing repository identity after verifying the migration name and schema effects. Do not rerun the migration SQL merely to change its version: that can duplicate or conflict with already-applied DDL.

After reconciliation, verify:

- local and remote migration version/name pairs match;
- the expected migration count matches;
- clean-database CI still passes;
- Supabase Preview no longer reports missing remote migration versions.
