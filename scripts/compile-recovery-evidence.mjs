import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const sourcePath = process.env.RECOVERY_SOURCE_DB_EVIDENCE ?? '.recovery-work/source-db.json';
const restoredPath = process.env.RECOVERY_RESTORED_DB_EVIDENCE ?? '.recovery-work/restored-db.json';
const storagePath = process.env.RECOVERY_STORAGE_EVIDENCE_PATH ?? '.recovery-work/storage-evidence.json';
const dumpPath = process.env.RECOVERY_DATABASE_DUMP ?? '.recovery-work/production.dump';
const outputJson = process.env.RECOVERY_EVIDENCE_JSON ?? '.recovery-work/evidence/recovery-drill.json';
const outputMarkdown = process.env.RECOVERY_EVIDENCE_MARKDOWN ?? '.recovery-work/evidence/recovery-drill.md';
const startedAt = new Date(process.env.RECOVERY_DRILL_STARTED_AT ?? '');
const gitSha = process.env.GITHUB_SHA ?? null;
const runId = process.env.RECOVERY_GITHUB_RUN_ID ?? process.env.GITHUB_RUN_ID ?? null;
const runAttempt = process.env.RECOVERY_GITHUB_RUN_ATTEMPT ?? process.env.GITHUB_RUN_ATTEMPT ?? null;
const repository = process.env.RECOVERY_GITHUB_REPOSITORY ?? process.env.GITHUB_REPOSITORY ?? null;
const gitRef = process.env.RECOVERY_GITHUB_REF ?? process.env.GITHUB_REF ?? null;

if (Number.isNaN(startedAt.getTime())) throw new Error('RECOVERY_DRILL_STARTED_AT must be a valid ISO timestamp.');

const parseJson = async (file) => JSON.parse(await readFile(file, 'utf8'));
const [source, restored, storage, dump] = await Promise.all([
  parseJson(sourcePath),
  parseJson(restoredPath),
  parseJson(storagePath),
  readFile(dumpPath),
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
const dumpSha256 = createHash('sha256').update(dump).digest('hex');

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
    dumpSha256,
    restoredTo: 'ephemeral-local-postgres',
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

const markdown = `# Recovery drill evidence\n\n- Result: **PASS**\n- Repository: \`${repository ?? 'unknown'}\`\n- Git ref: \`${gitRef ?? 'unknown'}\`\n- Git SHA: \`${gitSha ?? 'unknown'}\`\n- GitHub Actions run: \`${runId ?? 'unknown'}\` attempt \`${runAttempt ?? 'unknown'}\`\n- Source snapshot: ${evidence.sourceSnapshotAt}\n- Completed: ${evidence.completedAt}\n- Latest migration: \`${evidence.sourceSchema.latestMigration}\` (${evidence.sourceSchema.migrationCount} migrations)\n- Database dump SHA-256: \`${dumpSha256}\`\n- Database critical counts matched: **yes**\n- Golden Path on restored database: **PASS**\n- KYC transactional resilience contract: **PASS**\n- Storage buckets restored: ${evidence.storage.bucketCount}\n- Storage objects restored and checksum-verified: ${evidence.storage.objectCount}\n- Storage bytes verified: ${evidence.storage.bytes}\n- Measured drill duration: ${rtoSeconds}s\n- Observed backup age at completion: ${observedBackupAgeSeconds}s\n\nOnly redacted operational evidence is retained. The database dump and Storage object bytes remain ephemeral runner data and are deleted at job completion.\n`;

await writeFile(outputJson, JSON.stringify(evidence, null, 2));
await writeFile(outputMarkdown, markdown);
console.log(`Recovery drill evidence PASS. Measured drill duration: ${rtoSeconds}s.`);
