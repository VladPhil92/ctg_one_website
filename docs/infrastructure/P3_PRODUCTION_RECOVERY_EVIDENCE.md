# P3.3 — Production Recovery Evidence

Status: **PREFLIGHT EVIDENCE CAPTURED — FULL RESTORE DRILL STILL REQUIRED**

Date: 2026-08-20

## Scope

This record captures the production baseline immediately before the P3 hardening branch and defines the evidence still required to close the recovery gate truthfully.

It is intentionally not presented as proof of recovery. A recovery claim requires an actual production-derived database + Storage backup, isolated restore, invariant execution, redacted evidence artifact, and measured recovery timing from the existing `Production Recovery Drill` workflow.

## Verified production baseline

Read-only checks against Supabase project `CTG One Web` (`mdscwjvlihdiflcvghhk`) confirm:

- project status: `ACTIVE_HEALTHY`;
- PostgreSQL engine: 17;
- deployed database version: 17.6.1.147;
- migration history latest: `0063 finance_payout_queue_snapshot`;
- previous migrations: `0062 production_os_bounded_inventory_read`, `0061 public_lot_operational_snapshot`, `0060 public_investment_opportunity_read_model`, `0059 admin_aggregate_read_models`;
- KYC submissions: 2;
- pending KYC submissions: 0;
- KYC document metadata rows: 4;
- private KYC Storage objects: 4;
- profiles with `kyc_status = pending`: 0.

The KYC counts are internally balanced at this baseline: each historical submission has two registered document objects and there is no pending partial state requiring repair before migration `0064`.

## Security-advisor baseline

The production Security Advisor was re-run on 2026-08-20.

Relevant unresolved findings remain:

- leaked-password protection is disabled and remains a hosted-plan/configuration gate;
- Supabase warns on reviewed `SECURITY DEFINER` RPC exposure (`0028` / `0029` classes);
- several internal queue tables intentionally have RLS enabled with no browser policies.

P3.1 therefore introduces no new authenticated `SECURITY DEFINER` KYC RPC. Participant KYC mutation functions use `SECURITY INVOKER` plus RLS, while the profile-state trigger function is not directly executable by `anon` or `authenticated`.

## Repository recovery capability

`.github/workflows/recovery-drill.yml` already performs the required destructive-isolation discipline:

1. validates explicit `RUN_READ_ONLY_RECOVERY_DRILL` authorization;
2. captures a redacted source snapshot;
3. creates a PostgreSQL 17 logical production dump;
4. restores into an isolated local `recovery_drill` database;
5. compares source/restored migration and critical counts;
6. runs Golden Path, HTTP-security, privileged-function, outbox, document/notification and Operations Intelligence contracts;
7. copies actual Supabase Storage bytes into an ephemeral local recovery target and verifies SHA-256 equality;
8. emits only redacted recovery evidence;
9. destroys raw database/object recovery material even on failure.

## Evidence still required for closure

Issue #115 must remain open until one real workflow execution provides all of the following:

- source production migration identity after the target release;
- restored migration identity matching source;
- critical source/restored counts matching;
- Golden Path and security contracts passing on the restored database;
- Storage object count/byte limits respected;
- restored Storage SHA-256 equality;
- workflow start/end timestamps and measured recovery duration;
- retained redacted `recovery-drill.json` and `recovery-drill.md` artifacts.

The workflow requires repository Actions secrets:

- `RECOVERY_PRODUCTION_DATABASE_URL`;
- `RECOVERY_PRODUCTION_SUPABASE_URL`;
- `RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY`.

No repository code should fabricate recovery evidence when those credentials or a completed workflow run are unavailable.

## P3 execution decision

P3.3 is therefore split into two truthful states:

- **repository readiness:** implemented;
- **production restore evidence:** pending one authorized workflow dispatch with the required Actions secrets.

The recovery issue may only be closed after the second state is evidenced.
