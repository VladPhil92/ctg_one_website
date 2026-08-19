# Backup, Restore and Rollback Runbook

## Current recovery status

**Database data recovery: UNVERIFIED**

**Storage object recovery: UNVERIFIED**

**Schema reconstruction: VERIFIED IN CI**

The production Supabase organization hosting `CTG One Web` is currently on the **Free** plan. Do not assume provider-managed daily database backups or Point-in-Time Recovery (PITR) are available. Until an off-site backup process is configured and a restore rehearsal succeeds, CTG One must treat material financial recovery capability as incomplete.

The repository does verify that a fresh local PostgreSQL/Supabase database can apply the complete migration chain from zero and satisfy the Golden Path schema contract. That proves schema reconstruction, not production-data recovery.

The repository now also contains a manual `Production Recovery Drill` GitHub Actions workflow. Its existence does **not** change the recovery status to VERIFIED: the gate changes only after a successful production-derived run produces retained redacted evidence and the result is reviewed.

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

- `RECOVERY_PRODUCTION_DATABASE_URL` — a production PostgreSQL direct/session connection suitable for PostgreSQL 17 `pg_dump`;
- `RECOVERY_PRODUCTION_SUPABASE_URL` — the production project URL;
- `RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY` — a server-only key authorized to read private Storage objects.

The workflow performs the following bounded sequence:

1. capture only redacted source counts and migration identity;
2. create a PostgreSQL 17 custom-format logical dump in the ephemeral runner;
3. restore that dump into a dedicated local `recovery_drill` database;
4. compare critical source/restored counts and migration identity;
5. run the Golden Path, HTTP-security, `SECURITY DEFINER`, outbox, Document/Notification OS and Operations Intelligence PostgreSQL contracts against the restored database;
6. download the **actual bytes** of every source Storage object within configured object/byte limits;
7. restore those bytes only into a loopback Supabase target, then re-download and compare SHA-256 hashes;
8. retain only a redacted evidence JSON/Markdown artifact containing counts, checksums, schema identity and measured drill timing;
9. destroy the raw database dump and Storage object bytes even when a prior step fails.

The Storage script refuses hosted restore targets by design. A recovery rehearsal must never write test/restored objects into production or another hosted project accidentally.

Raw production dumps, object paths and Storage bytes must not be uploaded as GitHub Actions artifacts. Only the redacted recovery evidence may be retained.

## Free-plan production strategy

Until the project is upgraded to a plan with managed backups, use an off-site logical backup process.

Recommended implementation:

- create a dedicated least-privilege operational credential for backup execution;
- run `supabase db dump` or `pg_dump` on a defined schedule;
- encrypt the resulting dump before off-site storage;
- retain multiple restore points;
- separately mirror Supabase Storage objects using the Storage S3-compatible interface or supported CLI tooling;
- store database backups and Storage backups outside the production Supabase project;
- record backup timestamp, Git SHA and expected schema version in a manifest.

Do not store production database dumps as public GitHub artifacts or commit them to this repository.

## Managed-backup upgrade path

If the organization moves to Supabase Pro or above, verify backup availability in the Supabase Dashboard before changing this document from UNVERIFIED. Managed-backup availability alone is insufficient: perform an actual non-production restore rehearsal.

PITR should be considered only if the business requires a materially smaller RPO than the selected daily-backup cadence. Enabling PITR is an operational/billing decision and must not be inferred from source code.

## Restore rehearsal

Never rehearse destructive restore operations against the production project.

Use a local Supabase environment or a disposable non-production project.

### Database restore rehearsal

1. Select a backup artifact and its manifest.
2. Verify checksum and decrypt the backup in a controlled environment.
3. Provision an empty compatible PostgreSQL/Supabase target.
4. Restore the dump using the matching PostgreSQL tooling.
5. Apply any repository migrations newer than the backup manifest, in order.
6. Run the repository Golden Path database contract.
7. Compare critical row counts and domain totals against the backup manifest or source snapshot.
8. Verify authentication-linked foreign keys are intact.
9. Verify ledger tables remain append-only and settlement uniqueness constraints exist.
10. Record actual recovery duration and resulting RPO/RTO.

### Storage restore rehearsal

1. Provision non-production buckets with equivalent policy configuration.
2. Restore Storage objects from the off-site mirror.
3. Compare object counts, paths and checksums where available.
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
- backup checksum;
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
