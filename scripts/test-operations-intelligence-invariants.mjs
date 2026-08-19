import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const migration = await readFile(join(root, 'supabase', 'migrations', '0055_operations_intelligence_read_model.sql'), 'utf8');
const route = await readFile(join(root, 'src', 'app', 'api', 'admin', 'operations-intelligence', 'route.ts'), 'utf8');

assert.match(migration, /create or replace function public\.get_operations_intelligence_snapshot\(\)/i);
assert.match(migration, /\bstable\b/i, 'Operations intelligence RPC must be declared STABLE.');
assert.match(migration, /has_investment_permission\('audit\.read'\)/, 'RPC must require audit.read.');
assert.match(migration, /'mode',\s*'READ_ONLY'/, 'Snapshot must advertise READ_ONLY mode.');
assert.match(migration, /'mutations_allowed',\s*false/, 'AI contract must prohibit mutations.');
assert.match(migration, /revoke all on function public\.get_operations_intelligence_snapshot\(\) from public, anon;/i);
assert.match(migration, /grant execute on function public\.get_operations_intelligence_snapshot\(\) to authenticated;/i);

for (const forbidden of [
  'participant_user_id',
  'external_reference',
  'merchant_reference',
  'destination_masked',
  'destination_fingerprint',
  'payment_reference',
  'payment_proof_storage_path',
]) {
  assert.ok(!migration.includes(`'${forbidden}'`), `Snapshot payload must not expose ${forbidden}.`);
}

assert.match(route, /export async function GET\(\)/, 'Endpoint must expose GET.');
assert.ok(!/export async function (POST|PUT|PATCH|DELETE)\(/.test(route), 'Endpoint must not expose mutation HTTP methods.');
assert.match(route, /profile\?\.role !== 'admin'/);
assert.match(route, /investmentProfile\?\.investment_role !== 'SUPER_ADMIN'/);
assert.match(route, /rpc\('get_operations_intelligence_snapshot'\)/);
assert.match(route, /'Cache-Control': 'no-store'/);
assert.ok(!route.includes('service_role'), 'Route must not use or expose service-role credentials.');
assert.ok(!route.includes('OPENAI_API_KEY'), 'P2.5 foundation must not execute a model.');

console.log('Operations intelligence invariants: PASS');
