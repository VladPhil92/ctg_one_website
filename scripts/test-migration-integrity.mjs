import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const migrationsDir = join(root, 'supabase', 'migrations');

const files = (await readdir(migrationsDir))
  .filter((name) => name.endsWith('.sql'))
  .sort();

assert.ok(files.length > 0, 'At least one Supabase migration is required.');

const migrations = files.map((file) => {
  const legacyMatch = /^(\d{4})_([a-z0-9_]+)\.sql$/.exec(file);
  if (legacyMatch) {
    return {
      logicalVersion: legacyMatch[1],
      remoteVersion: legacyMatch[1],
      name: legacyMatch[2],
      file,
      format: 'legacy',
    };
  }

  const timestampMatch = /^(\d{14})_(\d{4})_([a-z0-9_]+)\.sql$/.exec(file);
  assert.ok(
    timestampMatch,
    `Invalid migration filename: ${file}. Expected legacy NNNN_snake_case.sql or YYYYMMDDHHMMSS_NNNN_snake_case.sql.`
  );

  return {
    logicalVersion: timestampMatch[2],
    remoteVersion: timestampMatch[1],
    name: timestampMatch[3],
    file,
    format: 'timestamp',
  };
});

migrations.sort((left, right) => Number(left.logicalVersion) - Number(right.logicalVersion));

const logicalVersions = migrations.map(({ logicalVersion }) => logicalVersion);
const remoteVersions = migrations.map(({ remoteVersion }) => remoteVersion);

assert.equal(
  new Set(logicalVersions).size,
  logicalVersions.length,
  'Duplicate logical Supabase migration versions are not allowed.'
);
assert.equal(
  new Set(remoteVersions).size,
  remoteVersions.length,
  'Duplicate remote Supabase migration versions are not allowed.'
);

for (let index = 0; index < logicalVersions.length; index += 1) {
  const expected = String(index + 1).padStart(4, '0');
  assert.equal(
    logicalVersions[index],
    expected,
    `Migration sequence drift: expected logical ${expected}, found ${logicalVersions[index]}.`
  );
}

const firstTimestampIndex = migrations.findIndex(({ format }) => format === 'timestamp');
if (firstTimestampIndex >= 0) {
  for (let index = firstTimestampIndex; index < migrations.length; index += 1) {
    assert.equal(
      migrations[index].format,
      'timestamp',
      `Migration ${migrations[index].file} reverts to the legacy filename format after timestamp versioning began.`
    );
  }

  const timestampVersions = migrations
    .slice(firstTimestampIndex)
    .map(({ remoteVersion }) => BigInt(remoteVersion));
  for (let index = 1; index < timestampVersions.length; index += 1) {
    assert.ok(
      timestampVersions[index] > timestampVersions[index - 1],
      'Timestamped Supabase migration versions must increase with logical migration order.'
    );
  }
}

const schemaVersionSource = await readFile(
  join(root, 'src', 'lib', 'observability', 'schema-version.ts'),
  'utf8'
);

const expectedMigrationMatch = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(schemaVersionSource);
const expectedMigrationNameMatch = /EXPECTED_DATABASE_MIGRATION_NAME\s*=\s*['"]([a-z0-9_]+)['"]/.exec(schemaVersionSource);
const expectedMigrationCountMatch = /EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(schemaVersionSource);

assert.ok(expectedMigrationMatch, 'EXPECTED_DATABASE_MIGRATION must be declared in schema-version.ts.');
assert.ok(expectedMigrationNameMatch, 'EXPECTED_DATABASE_MIGRATION_NAME must be declared in schema-version.ts.');
assert.ok(expectedMigrationCountMatch, 'EXPECTED_DATABASE_MIGRATION_COUNT must be declared in schema-version.ts.');

const latest = migrations.at(-1);
assert.ok(latest, 'Latest migration must be available.');

assert.equal(
  expectedMigrationMatch[1],
  latest.logicalVersion,
  `Runtime expected logical migration (${expectedMigrationMatch[1]}) must equal repository latest logical migration (${latest.logicalVersion}).`
);

assert.equal(
  expectedMigrationNameMatch[1],
  latest.name,
  `Runtime expected migration name (${expectedMigrationNameMatch[1]}) must equal repository latest migration name (${latest.name}).`
);

assert.equal(
  Number(expectedMigrationCountMatch[1]),
  migrations.length,
  `Runtime expected migration count (${expectedMigrationCountMatch[1]}) must equal repository migration count (${migrations.length}).`
);

console.log(
  `Migration integrity: PASS (${logicalVersions[0]}..${latest.logicalVersion}, ${migrations.length} files, latest=${latest.name}, remote=${latest.remoteVersion})`
);
