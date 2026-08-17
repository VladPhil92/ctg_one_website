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

const versions = files.map((name) => {
  const match = /^(\d{4})_[a-z0-9_]+\.sql$/.exec(name);
  assert.ok(match, `Invalid migration filename: ${name}. Expected NNNN_snake_case.sql.`);
  return match[1];
});

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
assert.ok(expectedMigrationMatch, 'EXPECTED_DATABASE_MIGRATION must be declared in schema-version.ts.');

const latestMigration = versions.at(-1);
assert.equal(
  expectedMigrationMatch[1],
  latestMigration,
  `Runtime expected migration (${expectedMigrationMatch[1]}) must equal repository latest migration (${latestMigration}).`
);

console.log(`Migration integrity: PASS (${versions[0]}..${latestMigration}, ${files.length} files)`);
