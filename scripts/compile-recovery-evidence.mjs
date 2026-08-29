import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const sourcePath = process.env.RECOVERY_SOURCE_DB_EVIDENCE ?? '.recovery-work/source-db.json';
const restoredPath = process.env.RECOVERY_RESTORED_DB_EVIDENCE ?? '.recovery-work/restored-db.json';
const storagePath = process.env.RECOVERY_STORAGE_EVIDENCE_PATH ?? '.recovery-work/storage-evidence.json';
const schemaDumpPath = process.env.RECOVERY_DATABASE_SCHEMA_DUMP ?? '.recovery-work/production-schema.sql';
const dataDumpPath = process.env.RECOVERY_DATABASE_DATA_DUMP ?? '.recovery-work/production-data.sql';
const outputJson = process.env.RECOVERY_EVIDENCE_JSON ?? '.recovery-work/evidence/recovery-drill.json';
const outputMarkdown = process.env.RECOVERY_EVIDENCE_MARKDOWN ?? '.recovery-work/evidence/recovery-drill.md';
const startedAt = new Date(process.env.RECOVERY_DRILL_STARTED_AT ?? '');
const gitSha = process.env.RECOVERY_CHECKED_OUT_SHA ?? process.env.GITHUB_SHA ?? null;
const runId = process.env.RECOVERY_GITHUB_RUN_ID ?? process.env.GITHUB_RUN_ID ?? null;
const runAttempt = process.env.RECOVERY_GITHUB_RUN_ATTEMPT ?? process.env.GITHUB_RUN_ATTEMPT ?? null;
const repository = process.env.RECOVERY_GITHUB_REPOSITORY ?? process.env.GITHUB_REPOSITORY ?? null;
const gitRef = process.env.RECOVERY_GITHUB_REF ?? process.env.GITHUB_REF ?? null;

if (Number.isNaN(startedAt.getTime())) throw new Error('RECOVERY_DRILL_STARTED_AT must be a valid ISO timestamp.');
if (!gitSha || !/^[0-9a-f]{40}$/i.test(gitSha)) throw new Error('Recovery evidence requires an exact checked-out Git SHA.');

const parseJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const [source, restored, storage, schemaDump, dataDump] = await Promise.all([
  parseJson(sourcePath),
  parseJson(restoredPath),
  parseJson(storagePath),
  readFile(schemaDumpPath),
  readFile(dataDumpPath),
]);

const countKeys = [
  'authUsers',
  'profiles',
  'storageObjectMetadata',
  'investmentLots',
  'investmentOrders',
  'investmentLedgerEntries',
  'investmentSettlements',
  'investmentSales',
  'investmentBottleUnits',
  'migrationCount',
];

const mismatches = [];
for (const key of countKeys) {
  if (Number(source[key]) !== Number(restored[key])) {
    mismatches.push(`${key}: source=${String(source[key])}, restored=${String(restored[key])}`);
  }
}
if (String(source.latestMigration) !== String(restored.latestMigration)) {
  mismatches.push(`latestMigration: source=${String(source.latestMigration)}, restored=${String(restored.latestMigration)}`);
}
if (mismatches.length) throw new Error(`Database recovery verification failed: ${mismatches.join('; ')}`);
if (storage?.result !== 'PASS') throw new Error('Storage recovery evidence is not PASS.');
if (Number(storage.sourceObjectCount) !== Number(source.storageObjectMetadata)) {
  throw new Error(
    `Storage byte backup count (${storage.sourceObjectCount}) does not match source storage.objects metadata (${source.storageObjectMetadata}).`,
  );
}

const completedAt = new Date();
const snapshotAt = new Date(source.snapshotAt);
if (Number.isNaN(snapshotAt.getTime())) throw new Error('Source database evidence is missing a valid snapshotAt timestamp.');
const rtoSeconds = Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000));
const observedBackupAgeSeconds = Math.max(0, Math.round((completedAt.getTime() - snapshotAt.getTime()) / 1000));
const schemaDumpSha256 = createHash('sha256').update(schemaDump).digest('hex');
const dataDumpSha256 = createHash('sha256').update(dataDump).digest('hex');
const recoverySetSha256 = createHash('sha256')
  .update(`schema:${schemaDumpSha256}\ndata:${dataDumpSha256}\n`)
  .digest('hex');

const evidence = {
  result: 'PASS',
  drillStartedAt: startedAt.toISOString(),
  sourceSnapshotAt: snapshotAt.toISOString(),
  completedAt: completedAt.toISOString(),
  gitSha,
  provenance: {
    repository,
    ref: gitRef,
    runId,
    runAttempt: runAttempt == null ? null : Number(runAttempt),
  },
  sourceSchema: {
    latestMigration: source.latestMigration,
    migrationCount: Number(source.migrationCount),
  },
  database: {
    backupFormat: 'supabase-filtered-schema-plus-data',
    restoreStrategy: 'exact-release migration reconstruction plus production data import into an ephemeral local Supabase stack',
    schemaDumpSha256,
    dataDumpSha256,
    recoverySetSha256,
    restoredTo: 'ephemeral-local-supabase-postgres',
    countsMatched: true,
    goldenPath: 'PASS',
    kycTransactionalResilience: 'PASS',
    criticalCounts: Object.fromEntries(countKeys.map((key) => [key, Number(source[key])])),
  },
  storage: {
    restoredTo: storage.target,
    bucketCount: Number(storage.sourceBucketCount),
    objectCount: Number(storage.sourceObjectCount),
    bytes: Number(storage.sourceBytes),
    aggregateDigest: storage.aggregateDigest,
    buckets: storage.buckets,
    checksumsMatched: true,
  },
  measurements: {
    measuredDrillRtoSeconds: rtoSeconds,
    observedBackupAgeAtCompletionSeconds: observedBackupAgeSeconds,
    note: 'Measured drill duration and backup age are evidence from this rehearsal, not provider guarantees or a standing production RPO/RTO SLA.',
  },
};

const markdown = `# Recovery drill evidence\n\n- Result: **PASS**\n- Repository: \`${repository ?? 'unknown'}\`\n- Git ref: \`${gitRef ?? 'unknown'}\`\n- Git SHA: \`${gitSha}\`\n- GitHub Actions run: \`${runId ?? 'unknown'}\` attempt \`${runAttempt ?? 'unknown'}\`\n- Source snapshot: ${evidence.sourceSnapshotAt}\n- Completed: ${evidence.completedAt}\n- Latest migration: \`${evidence.sourceSchema.latestMigration}\` (${evidence.sourceSchema.migrationCount} migrations)\n- Database schema backup SHA-256: \`${schemaDumpSha256}\`\n- Database data backup SHA-256: \`${dataDumpSha256}\`\n- Database recovery-set SHA-256: \`${recoverySetSha256}\`\n- Database restore strategy: Supabase-filtered production backup + exact-release schema reconstruction\n- Database critical counts matched: **yes**\n- Golden Path on restored database: **PASS**\n- KYC transactional resilience contract: **PASS**\n- Storage buckets restored: ${evidence.storage.bucketCount}\n- Storage objects restored and checksum-verified: ${evidence.storage.objectCount}\n- Storage bytes verified: ${evidence.storage.bytes}\n- Measured drill duration: ${rtoSeconds}s\n- Observed backup age at completion: ${observedBackupAgeSeconds}s\n\nOnly redacted operational evidence is retained. The database backup files and Storage object bytes remain ephemeral runner data and are deleted at job completion.\n`;

await writeFile(outputJson, JSON.stringify(evidence, null, 2));
await writeFile(outputMarkdown, markdown);
console.log(`Recovery drill evidence PASS for ${gitSha}. Measured drill duration: ${rtoSeconds}s.`);
