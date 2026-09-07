import { readFile } from 'node:fs/promises';

const timeoutMs = Number(process.env.PRODUCTION_SCHEMA_GATE_TIMEOUT_MS ?? '10000');
if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
  throw new Error('PRODUCTION_SCHEMA_GATE_TIMEOUT_MS must be an integer between 1000 and 30000.');
}

const schemaVersionSource = await readFile(
  new URL('../src/lib/observability/schema-version.ts', import.meta.url),
  'utf8'
);
const migrationMatch = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(schemaVersionSource);
const migrationNameMatch = /EXPECTED_DATABASE_MIGRATION_NAME\s*=\s*['"]([^'"]+)['"]/.exec(schemaVersionSource);
const migrationCountMatch = /EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(schemaVersionSource);

if (!migrationMatch || !migrationNameMatch || !migrationCountMatch) {
  throw new Error('Unable to resolve expected database migration metadata from schema-version.ts.');
}

const expectedMigration = migrationMatch[1];
const expectedMigrationName = migrationNameMatch[1];
const expectedMigrationCount = Number(migrationCountMatch[1]);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';

if (!supabaseUrl || !/^https:\/\//i.test(supabaseUrl)) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL must be configured with an HTTPS production Supabase URL.');
}
if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY must be configured for the privileged production schema gate.');
}

function normalizeLatestName(name) {
  if (typeof name !== 'string' || !name) return null;
  const timestampEraMatch = /^(\d{4})_(.+)$/.exec(name);
  if (!timestampEraMatch) return name;
  const [, logicalVersion, semanticName] = timestampEraMatch;
  return logicalVersion === expectedMigration ? semanticName : name;
}

const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/get_runtime_schema_compatibility`;
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
let response;
let body;
try {
  response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'User-Agent': 'ctg-one-render-production-schema-gate/1.0',
    },
    body: '{}',
    cache: 'no-store',
    signal: controller.signal,
  });
  body = await response.text();
} finally {
  clearTimeout(timer);
}

if (!response.ok) {
  throw new Error(`Production schema probe failed with HTTP ${response.status}.`);
}

let payload;
try {
  payload = JSON.parse(body);
} catch {
  throw new Error('Production schema probe returned non-JSON data.');
}

const row = (Array.isArray(payload) ? payload[0] : payload) ?? null;
const observedMigrationCount = row?.migration_count == null ? null : Number(row.migration_count);
const observedLatestMigrationName = normalizeLatestName(row?.latest_name ?? null);

if (!Number.isInteger(observedMigrationCount) || observedMigrationCount < 1) {
  throw new Error('Production schema probe returned an invalid migration count.');
}

if (observedMigrationCount < expectedMigrationCount) {
  throw new Error(
    `Production schema is behind this release: observed ${observedMigrationCount}, required ${expectedMigrationCount}. Apply the reviewed DB migration first; Render deployment is blocked.`
  );
}

if (
  observedMigrationCount === expectedMigrationCount
  && observedLatestMigrationName !== expectedMigrationName
) {
  throw new Error(
    `Production schema history diverged at migration ${expectedMigration}: expected ${expectedMigrationName}, observed ${String(observedLatestMigrationName)}.`
  );
}

const exact = observedMigrationCount === expectedMigrationCount
  && observedLatestMigrationName === expectedMigrationName;
const mode = exact ? 'exact' : 'database-ahead-compatible';

console.log(JSON.stringify({
  result: 'PASS',
  mode,
  expected: {
    migration: expectedMigration,
    migrationName: expectedMigrationName,
    migrationCount: expectedMigrationCount,
  },
  observed: {
    migrationCount: observedMigrationCount,
    latestMigrationName: observedLatestMigrationName,
  },
  policy: 'db-first-expand-contract',
}, null, 2));

if (!exact) {
  console.warn(
    `Production schema is ${observedMigrationCount - expectedMigrationCount} migration(s) ahead of this runtime. Deployment remains compatible, but repository/runtime reconciliation should follow.`
  );
}
