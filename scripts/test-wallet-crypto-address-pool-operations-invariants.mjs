import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260930151850_0159_wallet_crypto_address_pool_operational_hardening_v1_1.sql', 'utf8');
const route = readFileSync('src/app/api/admin/wallet/crypto-address-pool/route.ts', 'utf8');
const page = readFileSync('src/app/admin/finance/crypto-address-pool/page.tsx', 'utf8');
const schema = readFileSync('src/lib/observability/schema-version.ts', 'utf8');

assert.match(migration, /create or replace function public\.get_wallet_crypto_address_pool_snapshot_page_server\(/i,
  '0159 must expose a bounded paginated server-only address-pool snapshot.');
assert.match(migration, /where asset=p_asset and network=p_network\s+for share;/i,
  'Quote allocation must lock the pool control row so disablement serializes with allocation.');
assert.match(migration, /for update skip locked/i,
  'Claimant-specific address leasing must keep row-level SKIP LOCKED allocation.');
assert.match(migration, /revoke all on function public\.get_wallet_crypto_address_pool_snapshot_page_server\(integer,integer\) from public, anon, authenticated, service_role;/i,
  'Paginated pool snapshot must revoke browser-role execution.');
assert.match(migration, /grant execute on function public\.get_wallet_crypto_address_pool_snapshot_page_server\(integer,integer\) to service_role;/i,
  'Paginated pool snapshot must be executable by service_role only.');

assert.match(route, /get_wallet_crypto_address_pool_snapshot_page_server/,
  'Admin API must consume the paginated server-only snapshot RPC.');
assert.match(route, /p_address_limit:\s*limit/,
  'Admin API must pass a bounded page limit.');
assert.match(route, /p_address_offset:\s*offset/,
  'Admin API must pass a bounded page offset.');
assert.match(route, /requireSuperAdmin\(\)/,
  'Address-pool API must remain behind the SUPER_ADMIN server boundary.');

assert.match(page, /const ok = await run\(/,
  'Batch import must observe whether the request succeeded.');
assert.match(page, /if \(ok\) setBatch\(''\);/,
  'Batch input must only be cleared after a successful import.');
assert.match(page, /snapshot\.hasMore/,
  'Admin console must expose forward pagination for pools larger than one page.');
assert.match(page, /snapshot\.addressOffset-snapshot\.addressLimit/,
  'Admin console must expose backward pagination.');

const schemaMigrationDeclarations = schema.match(/export const EXPECTED_DATABASE_MIGRATION =/g) ?? [];
assert.equal(schemaMigrationDeclarations.length, 1,
  'Repository schema authority must contain exactly one EXPECTED_DATABASE_MIGRATION declaration.');
assert.match(schema, /EXPECTED_DATABASE_MIGRATION = '0159'/,
  'Repository schema authority must track 0159.');
assert.match(schema, /EXPECTED_DATABASE_MIGRATION_COUNT = 158/,
  'Repository schema migration count must track 158 migrations.');

console.log('Wallet crypto address-pool operations invariants: PASS');
