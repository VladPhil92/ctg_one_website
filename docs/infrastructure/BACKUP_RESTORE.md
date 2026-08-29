# Backup, Restore and Rollback Runbook

## Current recovery status

**Database data recovery: UNVERIFIED**

**Storage object recovery: UNVERIFIED**

**Schema reconstruction: VERIFIED IN CI**

The production Supabase organization hosting `CTG One Web` is currently on the **Free** plan. Do not assume provider-managed daily database backups or Point-in-Time Recovery (PITR) are available. Until an off-site backup process is configured and a restore rehearsal succeeds, CTG One must treat material financial recovery capability as incomplete.

The repository does verify that a fresh local PostgreSQL/Supabase database can apply the complete migration chain from zero and satisfy the Golden Path schema contract. That proves schema reconstruction, not production-data recovery.

The repository also contains a manual `Production Recovery Drill` GitHub Actions workflow. Its existence does **not** change the recovery status to VERIFIED: the gate changes only after a successful production-derived run produces retained redacted evidence and the result is reviewed.

## Recovery objectives

RPO and RTO are not declared as achieved targets until measured in a restore rehearsal.

Initial operational targets once backups are configured:

- **Target RPO:** 24 hours maximum for database data while using daily logical backups.
- **Target RTO:** 4 hours for a small production dataset, subject to measurement.
- **Storage RPO:** must be equal to or better than database RPO for payment/KYC/evidence objects.

These are targets, not guarantees. Replace them with measured values after the first successful rehearsal.

## Required backup perimeter

A complete recovery set must include all of the following:

1. PostgreSQL schema and data.
2. Supabase Storage objects, not only `storage.objects` metadata.
3. A record of the Git commit deployed at backup time.
4. The expected database migration number/name/count for that release.
5. Non-secret configuration inventory: feature-flag names, callback URLs, bucket names and deployment topology.
6. A secure external record of required secrets/credentials. Secrets must never be committed to Git.

A database dump alone is not a complete platform backup because Storage files are external objects.

## Manual Production Recovery Drill workflow

`.github/workflows/recovery-drill.yml` is deliberately **manual-only**. It must never run from `push`, `pull_request`, a schedule, or `workflow_run`, because a recovery rehearsal reads production-derived data and must require an explicit operator decision.

The workflow requires the operator to type `RUN_READ_ONLY_RECOVERY_DRILL` and uses these GitHub Actions secrets:

- `RECOVERY_PRODUCTION_DATABASE_URL` — a production PostgreSQL direct/session connection suitable for Supabase CLI logical backup operations;
- `RECOVERY_PRODUCTION_SUPABASE_URL` — the production project URL;
- `RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY` — a server-only key authorized to read private Storage objects.

The workflow performs the following bounded sequence:

1. capture only redacted source counts and migration identity;
2. create Supabase-aware filtered production schema and data backups with `supabase db dump`, avoiding replay of provider-managed internal DDL;
3. reconstruct the exact checked-out release in an isolated local Supabase target through the reviewed migration chain;
4. verify that transactional/Auth/business state is empty before any destructive local normalization;
5. normalize **only the ephemeral loopback target** by removing application/reference rows and private bucket definitions materialized by migrations that will otherwise collide with authoritative production data;
6. verify that the normalized application-data baseline is empty while migration history remains intact;
7. import the production data backup using the provider-documented trigger-disabled restore pattern;
8. compare broad source/restored database counts and migration identity, with Storage metadata excluded from this database-only comparison because it is verified separately at byte level;
9. run the Golden Path, HTTP-security, `SECURITY DEFINER`, outbox, Document/Notification OS and Operations Intelligence PostgreSQL contracts against the restored database;
10. download the **actual bytes** of every source Storage object within configured object/byte limits;
11. align/create Storage buckets only in the loopback Supabase target, restore the bytes, then re-download and compare SHA-256 hashes;
12. reconcile the Storage API object count against the source `storage.objects` metadata count;
13. retain only a redacted evidence JSON/Markdown artifact containing database backup digests, critical counts, checksums, schema identity and measured drill timing;
14. destroy the raw database backup files and Storage object bytes even when a prior step fails.

The local Supabase stack itself is the isolated recovery target. It is ephemeral to the GitHub runner and must never be replaced with a hosted target. Both the workflow and the Storage script independently refuse a hosted destructive target.

Raw production database backup files, object paths and Storage bytes must not be uploaded as GitHub Actions artifacts. Only the redacted recovery evidence may be retained.

### Why migration-materialized data is normalized before import

Some reviewed migrations intentionally materialize bootstrap/reference rows as part of schema reconstruction. Examples include the CTG Craft Beer style catalog, notification templates and the initial private Storage bucket definitions. Those rows are useful for a new empty installation, but a production `--data-only` backup contains the current authoritative values again.

Importing production data directly on top of migration-materialized rows can therefore fail on primary/unique keys even though the transactional database is otherwise clean. It can also silently preserve stale bootstrap configuration instead of the current production value if such tables were excluded from backup.

The recovery design resolves that conflict explicitly:

- migrations remain the authority for **structure, functions, policies and constraints**;
- production backup remains the authority for **current recoverable application data and mutable configuration rows**;
- a reviewed recovery-only script removes migration-materialized application data before import;
- the script requires an explicit session guard and the workflow independently requires the exact loopback PostgreSQL URL;
- extension-owned tables are excluded from the normalization perimeter;
- migration history is preserved;
- Storage objects are never treated as database rows: their actual bytes are restored later through the Storage API and checksum-verified.

This normalization is destructive by design and is permitted **only** on the ephemeral local recovery target. It must never be run against production or a hosted Supabase project.

### Why raw `pg_dump` is not used for the drill

A managed Supabase database contains provider-owned schemas such as Realtime, Auth, Storage and extension-managed objects. An unfiltered raw `pg_dump` includes internal DDL that is not intended to be replayed as the project `postgres` role into a newly initialized Supabase target and can fail on privileged function settings or other provider-managed objects.

The supported recovery strategy is therefore:

- reconstruct the exact application schema from the reviewed Git migration chain;
- capture a Supabase-filtered schema backup for the recovery set;
- capture production data with `supabase db dump --data-only --use-copy`;
- normalize migration-materialized application data on the exact ephemeral loopback target;
- restore authoritative production data using `SET session_replication_role = replica`;
- restore actual Storage bytes separately and verify checksums.

Do not add `--clean` to the data-only dump as a substitute for this boundary. Recovery deliberately separates schema reconstruction from data restoration and does not allow a production-derived dump to drop/recreate the local schema.

## Free-plan production strategy

Until the project is upgraded to a plan with managed backups, use an off-site logical backup process.

Recommended implementation:

- create a dedicated least-privilege operational credential for backup execution;
- use `supabase db dump` on a defined schedule so Supabase-managed schemas and reserved roles are filtered with provider-aware semantics;
- create both schema and data backup files and encrypt them before off-site storage;
- retain multiple restore points;
- separately mirror Supabase Storage objects using the Storage S3-compatible interface or supported API/CLI tooling;
- store database backups and Storage backups outside the production Supabase project;
- record backup timestamp, Git SHA and expected schema version in a manifest.

Do not use an unfiltered raw `pg_dump` as the default Supabase project backup path. Do not store production database dumps as public GitHub artifacts or commit them to this repository.

## Managed-backup upgrade path

If the organization moves to Supabase Pro or above, verify backup availability in the Supabase Dashboard before changing this document from UNVERIFIED. Managed-backup availability alone is insufficient: perform an actual non-production restore rehearsal.

PITR should be considered only if the business requires a materially smaller RPO than the selected daily-backup cadence. Enabling PITR is an operational/billing decision and must not be inferred from source code.

## Restore rehearsal

Never rehearse destructive restore operations against the production project.

Use a local Supabase environment or a disposable non-production project. The repository's automated drill currently allows destructive normalization only on its exact loopback local target; a future disposable-hosted restore procedure would require a separate reviewed safety design rather than weakening that guard.

### Database restore rehearsal

1. Select the schema/data backup set and its manifest.
2. Verify checksums and decrypt the backups in a controlled environment.
3. Provision a clean compatible Supabase target and reconstruct the expected application schema from the exact reviewed migration chain.
4. Verify the target contains no unexpected Auth, Storage-object or transactional/business state.
5. On the approved ephemeral/local target only, normalize migration-materialized application/reference data that is also present in the authoritative production backup.
6. Verify the normalized application-data baseline while retaining migration history and provider infrastructure.
7. Import the Supabase-filtered production data using the documented trigger-disabled restore pattern.
8. Apply any repository migrations newer than the backup manifest, in order, only when rehearsing recovery to a newer release.
9. Run the repository Golden Path database contract.
10. Compare critical row counts and domain totals against the backup manifest or source snapshot.
11. Verify authentication-linked foreign keys are intact.
12. Verify ledger tables remain append-only and settlement uniqueness constraints exist.
13. Record actual recovery duration and resulting RPO/RTO.

### Storage restore rehearsal

1. Provision non-production buckets with equivalent policy configuration.
2. Restore Storage objects from the off-site mirror.
3. Compare object counts and checksums; keep object paths out of retained public/redacted evidence.
4. Verify representative payment proof, KYC/evidence and public media objects are readable only by intended roles.
5. Confirm database metadata does not reference missing objects.

## Application rollback

Application rollback and database rollback are different operations.

### Safe application rollback

If a release is faulty but its database changes are backward-compatible:

1. identify the last known-good merge commit;
2. redeploy/revert application code through a reviewed PR or Render rollback capability;
3. verify `/api/health` and schema compatibility;
4. run critical auth and investment smoke checks.

### Database rollback rule

Do **not** edit or delete an already-applied migration and do not blindly reverse financial data.

For normal defects, prefer a new forward corrective migration. Use database restore only for true destructive/corruption incidents where forward correction cannot preserve integrity.

Before restoring production, explicitly determine:

- transactions that will be lost between the restore point and incident time;
- whether external bank/provider events occurred after the restore point;
- whether Storage objects would become orphaned or missing;
- whether reconciliation must be re-run after restore.

## Production financial gate

The following capabilities must remain fail-closed until data and Storage recovery are VERIFIED:

- public investment funding;
- automatic settlement;
- automatic withdrawals;
- automatic payment gateway activation where it can create authoritative financial state.

Repository defaults must remain `false`. Production activation requires an explicit operational sign-off after a successful restore rehearsal.

## Recovery evidence record

For every rehearsal record:

- date/time;
- operator;
- backup timestamp;
- database schema backup checksum;
- database data backup checksum;
- combined recovery-set checksum;
- Git SHA;
- expected schema version;
- target environment;
- database restore start/end;
- Storage restore start/end;
- measured RPO;
- measured RTO;
- Golden Path result;
- discrepancies found;
- corrective actions.

## Definition of verified recovery

Recovery is **VERIFIED** only when all conditions are true:

- a real production-derived backup exists outside the production project;
- the database backup has been restored successfully to a non-production target;
- Storage objects have been restored or independently verified recoverable;
- Golden Path schema checks pass after restoration;
- critical data reconciliation succeeds;
- measured RPO/RTO are recorded;
- an owner and escalation path are assigned.

Until then, the correct status remains **UNVERIFIED**.
