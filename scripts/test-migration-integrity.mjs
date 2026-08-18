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

const migrations = files.map((name) => {
  const match = /^(\d{4})_([a-z0-9_]+)\.sql$/.exec(name);
  assert.ok(match, `Invalid migration filename: ${name}. Expected NNNN_snake_case.sql.`);
  return { version: match[1], name: match[2], file: name };
});

const versions = migrations.map(({ version }) => version);
assert.equal(new Set(versions).size, versions.length, 'Duplicate Supabase migration versions are not allowed.');

for (let index = 0; index < versions.length; index += 1) {
  const expected = String(index + 1).padStart(4, '0');
  assert.equal(versions[index], expected, `Migration sequence drift: expected ${expected}, found ${versions[index]}.`);
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
  latest.version,
  `Runtime expected migration (${expectedMigrationMatch[1]}) must equal repository latest migration (${latest.version}).`
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

console.log(`Migration integrity: PASS (${versions[0]}..${latest.version}, ${migrations.length} files, latest=${latest.name})`);
