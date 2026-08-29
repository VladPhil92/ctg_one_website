# Backup, Restore and Rollback Runbook

## Current recovery status

**Database data recovery: UNVERIFIED**

**Storage object recovery: UNVERIFIED**

**Schema reconstruction: VERIFIED IN CI**

The repository proves that the full migration chain can reconstruct a clean Supabase/PostgreSQL application schema and satisfy the Golden Path contracts. That does not by itself prove production-data or Storage recovery.

Recovery becomes **VERIFIED** only after a fresh production-derived `Production Recovery Drill` completes on the exact reviewed `main` SHA, produces redacted evidence, and that evidence is reviewed.

## Recovery objectives

Initial operational targets:

- **Database RPO target:** 24 hours while using daily logical backups.
- **RTO target:** 4 hours for the current small production dataset, subject to measurement.
- **Storage RPO target:** equal to or better than database RPO for payment, KYC and evidence objects.

These are targets, not achieved guarantees. Replace them with measured values after the first successful restore rehearsal.

## Required recovery perimeter

A complete recovery set includes:

1. PostgreSQL schema plus recoverable application/Auth data.
2. Supabase Storage bucket configuration and actual object bytes.
3. Exact deployed Git SHA.
4. Expected migration identity/count.
5. Non-secret configuration inventory, including callback URLs, bucket names and deployment topology.
6. A secure external record of required credentials. Secrets must never be committed to Git or uploaded in recovery artifacts.

A database dump alone is not a complete Supabase backup because Storage bytes live outside PostgreSQL and provider-managed `storage.*` metadata can evolve independently of the pinned local stack.

## Manual Production Recovery Drill

`.github/workflows/recovery-drill.yml` is deliberately **manual-only**. It must not run from `push`, `pull_request`, schedules or `workflow_run`.

The operator must type:

`RUN_READ_ONLY_RECOVERY_DRILL`

The workflow currently requires only these GitHub Actions secrets:

- `RECOVERY_PRODUCTION_DATABASE_URL` — production PostgreSQL session/direct connection suitable for Supabase CLI logical backup operations.
- `RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY` — server-only Supabase API credential authorized for Storage administration/read access.

The production Supabase API origin is public configuration and is pinned in the workflow as:

`https://mdscwjvlihdiflcvghhk.supabase.co`

`RECOVERY_PRODUCTION_SUPABASE_URL` is **not** a required secret and must not be reintroduced as one.

## Storage administrator credential contract

`RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY` must contain the **raw key only**.

Preferred format:

`sb_secret_...`

Accepted compatibility format:

- complete legacy `service_role` JWT while Supabase still supports it.

Do **not** use any of the following:

- project JWT Secret;
- database password;
- `anon` key;
- `sb_publishable_...` key;
- personal access token;
- `KEY=value` environment assignment;
- a quoted value such as `"sb_secret_..."`;
- truncated JWT/key text.

For managed Supabase, obtain the correct server credential from **Project Settings > API Keys**. Prefer a modern Secret key beginning `sb_secret_`.

The drill validates this credential before starting the expensive local recovery stack. The preflight:

1. verifies the expected production project origin;
2. rejects obviously wrong credential classes locally;
3. performs the read-only `storage.listBuckets()` call;
4. fails before database export/restore if Storage administration cannot be authenticated.

No credential value is printed to logs.

## Recovery sequence

The bounded workflow performs:

1. explicit authorization, exact-SHA checkout and provenance verification;
2. read-only production Storage credential preflight;
3. isolated local Supabase startup;
4. redacted production database snapshot and migration identity capture;
5. Supabase-aware schema and data dumps;
6. deterministic removal of provider-managed `storage.*` data blocks from the plain SQL data dump;
7. validation that the local transactional/Auth/application state is empty;
8. recovery-only normalization of migration-materialized rows on the exact loopback PostgreSQL target;
9. import of authoritative production application/Auth data;
10. source/restored database fact reconciliation;
11. Golden Path, HTTP security, `SECURITY DEFINER`, outbox, Document/Notification OS and Operations Intelligence contracts;
12. actual Storage bucket/object-byte backup through the production Storage API;
13. bucket configuration reconciliation only against the loopback Storage API;
14. object restore, re-download and SHA-256 verification;
15. Storage API object-count reconciliation against the source `storage.objects` metadata count;
16. redacted JSON/Markdown evidence artifact creation;
17. destruction of raw database dumps and Storage bytes even if an earlier stage fails.

Raw production data, object names/paths and object bytes must never be retained as GitHub artifacts.

## Database recovery boundary

Managed Supabase schemas contain provider-owned objects that are not safe to replay blindly into another stack. The recovery strategy therefore separates responsibilities:

- reviewed Git migrations are authoritative for application structure, functions, policies and constraints;
- production logical backup is authoritative for current recoverable application/Auth data and mutable application configuration;
- the exact local Supabase stack provides provider schemas/services;
- migration-materialized bootstrap/reference rows are removed only on the ephemeral loopback target before importing production values.

The recovery SQL normalizer must never mutate `storage.*` directly.

Do not replace this design with raw unfiltered `pg_dump`, `pg_restore --superuser`, or `--clean` on a production-derived data dump.

## Storage recovery boundary

Supabase Storage is a managed subsystem. Hosted and local versions can expose different internal `storage.buckets` columns. The drill therefore does **not** replay Storage metadata through SQL.

The production data dump is sanitized before `psql` receives it:

- `COPY storage.<table> (...) FROM stdin` blocks are removed through their exact `\.` terminator;
- supported residual Storage-scoped data statements are removed;
- unknown/malformed managed Storage SQL fails closed;
- application/Auth COPY payloads remain unchanged.

Storage is recovered independently through the API:

- list source buckets;
- align bucket configuration on the loopback target;
- remove only empty target-only buckets through `deleteBucket`;
- download actual source object bytes within configured object/byte limits;
- upload them to the local target;
- re-download and compare SHA-256;
- reconcile object count with the redacted production metadata count.

The Storage script independently refuses a hosted destructive target.

## Restore rehearsal safety

A restore rehearsal must never target production. Destructive normalization is permitted only on the exact ephemeral loopback PostgreSQL target established by the workflow, and Storage bucket/object restoration is permitted only through the loopback Storage API.

A failed rehearsal is diagnostic evidence, not permission to weaken these guards. Correct the failing boundary, retain only redacted evidence, and start a fresh exact-SHA run after the correction is reviewed.

## Cleanup behavior

Cleanup runs with `if: always()`.

If a failure occurs before Supabase CLI installation, cleanup must not emit a misleading `supabase: command not found` error. The workflow checks whether the CLI exists before calling `supabase stop`, then removes `.recovery-work` unconditionally.

## Application rollback

Application rollback and database recovery are different operations.

If a faulty release has backward-compatible database changes:

1. identify the last known-good commit;
2. revert/redeploy application code through a reviewed PR or deployment rollback;
3. verify `/api/health` and schema compatibility;
4. run critical Auth and Investment smoke checks.

Do not edit/delete already-applied migrations and do not blindly reverse financial records. Prefer a forward corrective migration unless a true corruption/destructive incident requires point-in-time recovery.

## Production financial gate

The following remain fail-closed until database and Storage recovery are VERIFIED:

- public investment funding;
- automatic settlement;
- automatic withdrawals;
- automatic payment-gateway activation where it creates authoritative financial state.

Repository defaults must remain disabled. Production activation requires explicit human approval after recovery and operating-evidence gates pass.

## Recovery evidence record

A successful rehearsal must record at least:

- date/time and operator;
- exact Git SHA;
- migration identity;
- schema/data backup digests;
- combined recovery-set digest;
- critical source/restored counts;
- Storage object count and aggregate checksum evidence;
- target environment;
- measured duration/RTO;
- effective backup age/RPO;
- Golden Path/security result;
- cleanup result;
- discrepancies and corrective actions.

## Definition of verified recovery

Recovery is **VERIFIED** only when all of the following are true:

- the production-derived logical backup succeeds;
- recoverable application/Auth data restores to the isolated target;
- source/restored database reconciliation succeeds;
- Storage buckets and actual object bytes restore and checksum-verify;
- Golden Path/security contracts pass after restoration;
- measured recovery timing is captured;
- only redacted evidence is retained;
- raw recovery material is destroyed;
- the evidence is bound to the current reviewed/deployed SHA and receives human review.

Until then, the correct status remains **UNVERIFIED**.
