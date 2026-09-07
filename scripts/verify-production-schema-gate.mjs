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

async function postPrivilegedRpc(rpcName, payload) {
  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/${rpcName}`;
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
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: controller.signal,
    });
    body = await response.text();
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`${rpcName} production schema probe failed with HTTP ${response.status}.`);
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${rpcName} production schema probe returned non-JSON data.`);
  }
}

const [compatibilityPayload, requiredMigrationPayload] = await Promise.all([
  postPrivilegedRpc('get_runtime_schema_compatibility', {}),
  postPrivilegedRpc('has_runtime_schema_migration', {
    p_logical_version: expectedMigration,
    p_expected_name: expectedMigrationName,
  }),
]);

const row = (Array.isArray(compatibilityPayload)
  ? compatibilityPayload[0]
  : compatibilityPayload) ?? null;
const observedMigrationCount = row?.migration_count == null ? null : Number(row.migration_count);
const observedLatestMigrationName = normalizeLatestName(row?.latest_name ?? null);
const requiredMigrationPresent = requiredMigrationPayload === true;

if (!Number.isInteger(observedMigrationCount) || observedMigrationCount < 1) {
  throw new Error('Production schema probe returned an invalid migration count.');
}

if (!requiredMigrationPresent) {
  throw new Error(
    `Production schema does not contain required logical migration ${expectedMigration}_${expectedMigrationName}. A numerically newer or divergent history is not sufficient; Render deployment is blocked.`
  );
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

const exact = requiredMigrationPresent
  && observedMigrationCount === expectedMigrationCount
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
    requiredMigrationPresent,
    migrationCount: observedMigrationCount,
    latestMigrationName: observedLatestMigrationName,
  },
  policy: 'db-first-expand-contract',
}, null, 2));

if (!exact) {
  console.warn(
    `Production schema is ${observedMigrationCount - expectedMigrationCount} migration(s) ahead of this runtime, and the exact required migration is present. Deployment remains compatible; repository/runtime reconciliation should follow.`
  );
}
