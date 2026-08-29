import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [workflow, storageDrill, evidenceCompiler, runbook] = await Promise.all([
  read('.github/workflows/recovery-drill.yml'),
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
const checkoutIndex = workflow.indexOf('uses: actions/checkout@v4');
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
assert.match(workflow, /pg_dump --format=custom/, 'Recovery drill must create a real PostgreSQL backup artifact.');
assert.match(workflow, /pg_restore --exit-on-error/, 'Recovery drill must restore the database backup into the isolated target.');
assert.match(workflow, /recovery_drill/, 'Database restore target must be a dedicated recovery database.');
assert.match(workflow, /recovery-storage-drill\.mjs/, 'Recovery drill must restore actual Storage bytes, not metadata only.');
assert.match(workflow, /golden-path-transactional-smoke\.sql/, 'Recovered database must execute the transactional Golden Path.');
assert.match(workflow, /Upload redacted recovery evidence only/, 'Only redacted evidence may leave the ephemeral runner.');
assert.doesNotMatch(
  workflow,
  /path:\s*[^\n]*(production\.dump|\.recovery-work\/storage(?:\/|\b))/,
  'Raw database dumps or Storage object bytes must never be uploaded as workflow artifacts.',
);
assert.match(workflow, /rm -rf \.recovery-work/, 'Recovery material must be destroyed even when the job fails.');

assert.match(storageDrill, /127\.0\.0\.1.*localhost.*::1/s, 'Storage restore must enforce a loopback-only target.');
assert.match(storageDrill, /Hosted targets are refused by design/, 'Storage drill must fail closed for hosted restore targets.');
assert.match(storageDrill, /sha256/, 'Storage recovery must checksum object bytes.');
assert.match(storageDrill, /sourceObjectCount/, 'Storage recovery evidence must include source object count.');
assert.doesNotMatch(storageDrill, /console\.log\([^\n]*(objectPath|sourceKey|targetKey)/, 'Storage drill must not log object paths or secret keys.');

assert.match(evidenceCompiler, /RECOVERY_CHECKED_OUT_SHA/, 'Recovery evidence must prefer the independently verified checked-out SHA.');
assert.match(evidenceCompiler, /\^\[0-9a-f\]\{40\}\$/i, 'Recovery evidence must require a full exact Git SHA.');
assert.match(evidenceCompiler, /countsMatched:\s*true/, 'Recovery evidence must require source/restored database count equality.');
assert.match(evidenceCompiler, /checksumsMatched:\s*true/, 'Recovery evidence must require restored Storage checksum equality.');
assert.match(evidenceCompiler, /measuredDrillRtoSeconds/, 'Recovery evidence must record measured drill duration.');
assert.match(evidenceCompiler, /observedBackupAgeAtCompletionSeconds/, 'Recovery evidence must record observed backup age.');
assert.match(runbook.toLowerCase(), /database data recovery:\s*unverified/, 'Runbook must remain UNVERIFIED until a real drill has passed.');
assert.match(runbook.toLowerCase(), /storage object recovery:\s*unverified/, 'Storage recovery must remain UNVERIFIED until a real drill has passed.');

console.log('Recovery drill automation invariants: PASS');
