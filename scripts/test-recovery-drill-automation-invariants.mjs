import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [workflow, normalizer, snapshot, storageDrill, evidenceCompiler, runbook] = await Promise.all([
  read('.github/workflows/recovery-drill.yml'),
  read('scripts/recovery-normalize-local-data.sql'),
  read('scripts/recovery-database-snapshot.sql'),
  read('scripts/recovery-storage-drill.mjs'),
  read('scripts/compile-recovery-evidence.mjs'),
  read('docs/infrastructure/BACKUP_RESTORE.md'),
]);

assert.match(workflow, /name:\s*Production Recovery Drill/, 'Recovery workflow must have a stable operational name.');
assert.match(workflow, /\n\s*workflow_dispatch:\s*\n/, 'Recovery drill must require explicit manual dispatch.');
for (const forbiddenTrigger of ['push', 'pull_request', 'schedule', 'workflow_run']) {
  assert.doesNotMatch(
    workflow,
    new RegExp(`\\n\\s*${forbiddenTrigger}:\\s*\\n`),
    `Recovery drill must never run automatically from ${forbiddenTrigger}.`,
  );
}
assert.match(workflow, /RUN_READ_ONLY_RECOVERY_DRILL/, 'Recovery drill must require an explicit human confirmation phrase.');
for (const secret of [
  'RECOVERY_PRODUCTION_DATABASE_URL',
  'RECOVERY_PRODUCTION_SUPABASE_URL',
  'RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY',
]) {
  assert.match(workflow, new RegExp(`secrets\\.${secret}`), `Recovery workflow must obtain ${secret} only from GitHub Secrets.`);
}

assert.match(
  workflow,
  /if:\s*github\.ref\s*==\s*['"]refs\/heads\/main['"]/,
  'Production recovery must be dispatchable only from the protected main branch.',
);
assert.match(
  workflow,
  /ref:\s*\$\{\{\s*github\.sha\s*\}\}/,
  'Recovery checkout must pin the exact SHA captured by workflow_dispatch instead of following a moving branch head.',
);
assert.doesNotMatch(
  workflow,
  /with:\s*\n\s*ref:\s*main(?:\s|$)/,
  'Recovery checkout must not follow a mutable main ref after dispatch.',
);
assert.match(workflow, /uses:\s*actions\/checkout@v7/, 'Recovery workflow must use the current Node 24 checkout action runtime.');
assert.match(workflow, /uses:\s*actions\/setup-node@v7/, 'Recovery workflow must use the current Node 24 setup-node action runtime.');
assert.match(workflow, /git rev-parse HEAD/, 'Recovery drill must independently resolve the checked-out commit.');
assert.match(
  workflow,
  /checked_out_sha[^\n]*!=[^\n]*GITHUB_SHA/,
  'Recovery drill must fail closed when the checked-out commit differs from the dispatched SHA.',
);
assert.match(
  workflow,
  /RECOVERY_CHECKED_OUT_SHA=/,
  'Verified checked-out SHA must be exported for redacted recovery evidence provenance.',
);
const checkoutIndex = workflow.indexOf('uses: actions/checkout@v7');
const workspaceIndex = workflow.indexOf('mkdir -p .recovery-work/evidence .recovery-work/storage');
assert.ok(checkoutIndex >= 0, 'Recovery workflow must check out the repository.');
assert.ok(
  workspaceIndex > checkoutIndex,
  'Recovery workspace must be created after checkout so actions/checkout cleanup cannot delete it.',
);

assert.match(
  workflow,
  /run:\s*supabase start(?:\s|$)/m,
  'Recovery drill must start the full local Supabase stack so the isolated target includes Auth, Storage and APIs.',
);
assert.doesNotMatch(
  workflow,
  /run:\s*supabase db start(?:\s|$)/m,
  'Recovery drill must not use a database-only local target because Storage byte restoration requires the local Storage API.',
);
assert.match(workflow, /supabase status -o env/, 'Recovery drill must resolve credentials from the running local stack.');
assert.match(
  workflow,
  /supabase db dump[\s\S]*--db-url "\$SOURCE_DATABASE_URL"/,
  'Production database backup must use Supabase-aware dump filtering rather than an unfiltered raw pg_dump.',
);
assert.match(
  workflow,
  /--file "\$RECOVERY_DATABASE_SCHEMA_DUMP"/,
  'Recovery set must contain a Supabase-filtered production schema backup.',
);
assert.match(
  workflow,
  /--file "\$RECOVERY_DATABASE_DATA_DUMP"[\s\S]*--data-only[\s\S]*--use-copy/,
  'Recovery set must contain a production data backup suitable for supported Supabase restore semantics.',
);
assert.match(
  workflow,
  /--file "\$RECOVERY_DATABASE_DATA_DUMP"[\s\S]*-x ['"]storage\.\*['"]/,
  'Production SQL data restore must exclude managed Storage metadata because Storage is recovered through the API and hosted/local Storage schemas may differ.',
);
assert.doesNotMatch(workflow, /\bpg_dump\b/, 'Recovery workflow must not call raw pg_dump.');
assert.doesNotMatch(workflow, /\bpg_restore\b/, 'Recovery workflow must not replay an unfiltered custom archive.');
assert.doesNotMatch(
  workflow,
  /supabase db dump[\s\S]{0,500}--clean/,
  'Data recovery must not hide baseline conflicts by turning a data-only import into destructive schema cleanup.',
);
assert.match(
  workflow,
  /RECOVERY_TARGET_DATABASE_URL:\s*postgresql:\/\/postgres:postgres@127\.0\.0\.1:54322\/postgres/,
  'Database recovery target must remain the ephemeral loopback Supabase Postgres instance.',
);

const preflightIndex = workflow.indexOf('Verify isolated local transactional state before normalization');
const normalizeIndex = workflow.indexOf('Normalize migration-materialized data on isolated local target');
const normalizedVerifyIndex = workflow.indexOf('Verify normalized local data baseline');
const restoreIndex = workflow.indexOf('Restore production data into isolated local Supabase database');
assert.ok(preflightIndex >= 0, 'Recovery drill must verify transactional state before destructive local normalization.');
assert.ok(normalizeIndex > preflightIndex, 'Local normalization must occur only after the pre-normalization safety check.');
assert.ok(normalizedVerifyIndex > normalizeIndex, 'Recovery drill must verify the normalized baseline before production import.');
assert.ok(restoreIndex > normalizedVerifyIndex, 'Production data import must occur only after baseline normalization is verified.');
assert.match(
  workflow,
  /expected_target=['"]postgresql:\/\/postgres:postgres@127\.0\.0\.1:54322\/postgres['"]/,
  'Workflow must independently bind destructive normalization to the exact loopback recovery URL.',
);
assert.match(
  workflow,
  /SET ctg\.recovery_target = 'local-ephemeral-supabase'/,
  'Workflow must set the explicit local-recovery guard required by the normalization SQL.',
);
assert.match(
  workflow,
  /--file scripts\/recovery-normalize-local-data\.sql/,
  'Recovery workflow must invoke the reviewed local normalization script.',
);
assert.match(
  workflow,
  /\.investmentBeerStyles == 0/,
  'Normalized baseline verification must prove migration-materialized beer styles were removed before import.',
);
assert.match(
  workflow,
  /\.notificationTemplates == 0/,
  'Normalized baseline verification must prove migration-materialized notification templates were removed before import.',
);
assert.match(
  workflow,
  /del\(\.snapshotAt, \.storageObjectMetadata\)/,
  'Database row-count reconciliation must leave Storage metadata to the byte-level Storage recovery contract.',
);
assert.match(
  workflow,
  /SET session_replication_role = replica/,
  'Production data restore must disable triggers using the provider-documented restore pattern.',
);

assert.match(
  normalizer,
  /current_setting\('ctg\.recovery_target', true\)/,
  'Normalizer must require an explicit session-scoped recovery target guard.',
);
assert.match(
  normalizer,
  /local-ephemeral-supabase/,
  'Normalizer must recognize only the reviewed local ephemeral recovery guard value.',
);
assert.match(
  normalizer,
  /pg_depend[\s\S]*pg_extension/,
  'Normalizer must exclude extension-owned tables from application-data truncation.',
);
assert.match(
  normalizer,
  /truncate table[\s\S]*restart identity/i,
  'Normalizer must clear migration-materialized application rows in an FK-aware table set.',
);
assert.doesNotMatch(
  normalizer,
  /\b(?:insert|update|delete|truncate)\b[^;]*\bstorage\./i,
  'SQL normalization must never mutate Supabase Storage tables directly; Storage changes belong to the Storage API contract.',
);
assert.doesNotMatch(
  normalizer,
  /https?:\/\//,
  'Normalizer is a database-local contract and must not contain any hosted endpoint.',
);

for (const criticalCount of [
  'investmentBeerStyles',
  'investmentPaymentReceipts',
  'investmentPayouts',
  'notificationTemplates',
  'domainEvents',
]) {
  assert.match(snapshot, new RegExp(`'${criticalCount}'`), `Recovery snapshot must include ${criticalCount}.`);
  assert.match(evidenceCompiler, new RegExp(`'${criticalCount}'`), `Recovery evidence must reconcile ${criticalCount}.`);
}
assert.match(
  evidenceCompiler,
  /sourceObjectCount[\s\S]*source\.storageObjectMetadata/,
  'Storage byte count must still reconcile against source storage.objects metadata.',
);

assert.match(workflow, /recovery-storage-drill\.mjs/, 'Recovery drill must restore actual Storage bytes, not metadata only.');
assert.match(workflow, /golden-path-transactional-smoke\.sql/, 'Recovered database must execute the transactional Golden Path.');
assert.match(workflow, /Upload redacted recovery evidence only/, 'Only redacted evidence may leave the ephemeral runner.');
assert.match(workflow, /uses:\s*actions\/upload-artifact@v7/, 'Recovery evidence upload must use the current artifact action runtime.');
assert.doesNotMatch(
  workflow,
  /path:\s*[^\n]*(production-(?:schema|data)\.sql|\.recovery-work\/storage(?:\/|\b))/,
  'Raw database backups or Storage object bytes must never be uploaded as workflow artifacts.',
);
assert.match(workflow, /rm -rf \.recovery-work/, 'Recovery material must be destroyed even when the job fails.');

assert.match(storageDrill, /127\.0\.0\.1.*localhost.*::1/s, 'Storage restore must enforce a loopback-only target.');
assert.match(storageDrill, /Hosted targets are refused by design/, 'Storage drill must fail closed for hosted restore targets.');
assert.match(storageDrill, /target\.storage\.deleteBucket/, 'Target-only local buckets must be removed through the supported Storage API, never direct SQL.');
assert.match(storageDrill, /unexpectedObjects\.length !== 0/, 'Storage drill must refuse to remove a target-only bucket that unexpectedly contains objects.');
assert.match(storageDrill, /alignedBucketIds[\s\S]*expectedBucketIds/, 'Storage recovery must verify the final local bucket set matches production.');
assert.match(storageDrill, /sha256/, 'Storage recovery must checksum object bytes.');
assert.match(storageDrill, /sourceObjectCount/, 'Storage recovery evidence must include source object count.');
assert.doesNotMatch(storageDrill, /console\.log\([^\n]*(objectPath|sourceKey|targetKey)/, 'Storage drill must not log object paths or secret keys.');

assert.match(evidenceCompiler, /RECOVERY_CHECKED_OUT_SHA/, 'Recovery evidence must prefer the independently verified checked-out SHA.');
assert.match(evidenceCompiler, /\^\[0-9a-f\]\{40\}\$/i, 'Recovery evidence must require a full exact Git SHA.');
assert.match(evidenceCompiler, /schemaDumpSha256/, 'Recovery evidence must hash the filtered production schema backup.');
assert.match(evidenceCompiler, /dataDumpSha256/, 'Recovery evidence must hash the production data backup.');
assert.match(evidenceCompiler, /recoverySetSha256/, 'Recovery evidence must bind schema and data backup hashes into one recovery-set digest.');
assert.match(evidenceCompiler, /countsMatched:\s*true/, 'Recovery evidence must require source/restored database count equality.');
assert.match(evidenceCompiler, /checksumsMatched:\s*true/, 'Recovery evidence must require restored Storage checksum equality.');
assert.match(evidenceCompiler, /measuredDrillRtoSeconds/, 'Recovery evidence must record measured drill duration.');
assert.match(evidenceCompiler, /observedBackupAgeAtCompletionSeconds/, 'Recovery evidence must record observed backup age.');
assert.match(runbook.toLowerCase(), /database data recovery:\s*unverified/, 'Runbook must remain UNVERIFIED until a real drill has passed.');
assert.match(runbook.toLowerCase(), /storage object recovery:\s*unverified/, 'Storage recovery must remain UNVERIFIED until a real drill has passed.');

console.log('Recovery drill automation invariants: PASS');
