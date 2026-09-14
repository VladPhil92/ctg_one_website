import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [migration, sourceRoute, signature, processing, adminApi, adminPage, panel, nav, schemaVersion, history, docs] = await Promise.all([
  read('supabase/migrations/20260914130944_0136_rewards_signed_source_connectors_v4.sql'),
  read('src/app/api/rewards/source-events/[connectorCode]/route.ts'),
  read('src/lib/rewards/source-signature.ts'),
  read('src/lib/rewards/source-shadow-processing.ts'),
  read('src/app/api/admin/rewards/source-connectors/route.ts'),
  read('src/app/admin/rewards/connectors/page.tsx'),
  read('src/components/admin/RewardsSourceConnectorsPanel.tsx'),
  read('src/components/admin/AdminNav.tsx'),
  read('src/lib/observability/schema-version.ts'),
  read('scripts/fixtures/supabase-production-migration-history.json'),
  read('docs/product/CTG_REWARDS_SIGNED_SOURCE_CONNECTORS_V4.md'),
]);

for (const table of [
  'reward_source_connectors',
  'reward_source_connector_event_allowlist',
  'reward_source_nonces',
  'reward_source_delivery_attempts',
  'reward_source_connector_config_events',
  'reward_source_reconciliation_runs',
]) {
  assert.match(migration, new RegExp(`create table public\\.${table}`), `${table} must be created by 0136.`);
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`), `${table} must enforce RLS.`);
  assert.match(migration, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated, service_role`), `${table} must fail closed before server grants.`);
}

assert.match(migration, /auth_scheme text not null default 'ed25519_v1' check \(auth_scheme = 'ed25519_v1'\)/, 'Connector auth scheme must be Ed25519 v1.');
assert.doesNotMatch(migration, /private_key|shared_secret|hmac_secret/i, '0136 must never persist a source private key or shared HMAC secret.');
assert.match(migration, /ingestion_enabled boolean not null default false/, 'Per-source ingestion must default closed.');
assert.match(migration, /not ingestion_enabled or stage = 'validated'/, 'Only validated connectors may be enabled.');
assert.match(migration, /primary key \(connector_id, nonce\)/, 'Nonce replay protection must be database-enforced per connector.');
assert.match(migration, /grant select, insert on table public\.reward_source_nonces to service_role/, 'Nonce reservations must be append-only.');
assert.match(migration, /grant select, insert on table public\.reward_source_delivery_attempts to service_role/, 'Delivery attempts must be append-only.');
assert.match(migration, /grant select, insert on table public\.reward_source_connector_config_events to service_role/, 'Config audit events must be append-only.');
assert.match(migration, /grant select, insert on table public\.reward_source_reconciliation_runs to service_role/, 'Reconciliation runs must be append-only.');
assert.doesNotMatch(migration, /grant[^;]*(update|delete)[^;]*reward_source_(nonces|delivery_attempts|connector_config_events|reconciliation_runs)/i, 'Evidence tables must never grant UPDATE or DELETE.');
assert.doesNotMatch(migration, /grant[^;]*(insert|update|delete)[^;]*to authenticated/i, 'Browser users must not mutate v4 connector tables directly.');
assert.doesNotMatch(migration, /grant[^;]*(insert|update|delete)[^;]*reward_(accounts|ledger_entries)/i, '0136 must not add Rewards ledger privileges.');
assert.doesNotMatch(migration, /insert into public\.reward_ledger_entries|update public\.reward_accounts|points_balance\s*=/i, '0136 must have zero Rewards ledger mutation path.');
assert.match(migration, /Signed Source Connectors & Reconciliation v4 remains shadow-only/, 'Migration must state the shadow-only boundary.');

assert.match(signature, /import 'server-only'/, 'Signature verification must stay server-only.');
assert.match(signature, /asymmetricKeyType !== 'ed25519'/, 'Public-key inspection must reject non-Ed25519 keys.');
assert.match(signature, /ctg-rewards-source-v1/, 'Canonical signing contract must be explicitly versioned.');
assert.match(signature, /verify\(\s*null,/, 'Ed25519 verification must use the Node crypto verifier.');
assert.doesNotMatch(signature, /createHmac|privateKey|sharedSecret/i, 'v4 verification must not depend on a server-held shared secret.');

assert.match(sourceRoute, /sha256Hex\(raw\)/, 'Signatures must bind the SHA-256 digest of the raw request body.');
for (const header of ['x-ctg-rewards-timestamp', 'x-ctg-rewards-nonce', 'x-ctg-rewards-signature']) {
  assert.ok(sourceRoute.includes(header), `Signed source route must require ${header}.`);
}
assert.match(sourceRoute, /clockSkewMs > connector\.max_clock_skew_seconds \* 1000/, 'Signed requests must enforce the connector clock-skew window.');
assert.match(sourceRoute, /reserveNonce/, 'Signed requests must reserve and verify source nonces.');
assert.match(sourceRoute, /SOURCE_NONCE_PAYLOAD_CONFLICT/, 'Changed payloads must not reuse a nonce.');
assert.match(sourceRoute, /nonceRetry \|\| processing\.idempotentReplay/, 'Exact retries must converge idempotently.');
assert.match(sourceRoute, /connector\.stage !== 'validated' \|\| !connector\.ingestion_enabled/, 'Source ingestion must fail closed unless the connector is validated and enabled.');
assert.match(sourceRoute, /reward_source_connector_event_allowlist/, 'Every signed event must pass the per-source allowlist.');
assert.match(sourceRoute, /SOURCE_SUBJECT_UNKNOWN/, 'Original events must reference an existing CTG One identity.');
assert.match(sourceRoute, /commercialStatus:\s*'inactive'/, 'Signed ingestion must keep commercial Rewards inactive.');
assert.match(sourceRoute, /ledgerEffects:\s*false/, 'Signed ingestion must explicitly deny ledger effects.');
assert.doesNotMatch(sourceRoute, /createClient\(|auth\.getUser|reward_accounts|reward_ledger_entries/, 'Source-system authority must be cryptographic, not browser-auth or ledger authority.');

assert.match(processing, /processSignedSourcePayload/, 'Signed source events must enter an explicit shadow-processing boundary.');
assert.match(processing, /eventKind === 'reversal'/, 'Signed sources must support explicit reversals.');
assert.match(processing, /ensureOriginalEvaluation/, 'Original signed events must reuse the bounded shadow evaluator contract.');
assert.match(processing, /ensureReversalEvaluation/, 'Signed reversals must create exactly-once reversal evidence.');
assert.match(processing, /ingestionMode: 'signed_source_ed25519'/, 'Evaluation provenance must identify signed-source ingestion.');
assert.doesNotMatch(processing, /reward_accounts|reward_ledger_entries/, 'Signed shadow processing must not touch Rewards balances or ledger rows.');

const authIndex = adminApi.indexOf("supabase.auth.getUser()");
const profileIndex = adminApi.indexOf("profile?.role !== 'admin'");
const superAdminIndex = adminApi.indexOf("investmentProfile?.investment_role !== 'SUPER_ADMIN'");
const adminClientIndex = adminApi.indexOf('createAdminClient()');
assert.ok(authIndex >= 0 && profileIndex > authIndex && superAdminIndex > authIndex && adminClientIndex > superAdminIndex, 'Connector service-role authority must be created only after SUPER_ADMIN authorization.');
for (const action of ['create_connector', 'replace_allowlist', 'set_stage', 'set_ingestion', 'rotate_key', 'reconcile']) {
  assert.ok(adminApi.includes(`body.action === '${action}'`), `Connector admin API must implement ${action}.`);
}
assert.match(adminApi, /GLOBAL_SHADOW_KILL_SWITCH_CLOSED/, 'Per-source enablement must also require the global shadow kill switch.');
assert.match(adminApi, /ingestion_enabled: false/, 'Key rotation must disable source ingestion for safety.');
assert.match(adminApi, /MAX_RECON_WINDOW_MS = 31 \* 24 \* 60 \* 60 \* 1000/, 'Reconciliation windows must remain bounded.');
assert.match(adminApi, /originalCountDelta === 0 && reversalCountDelta === 0 && amountDeltaCents === 0/, 'Matched reconciliation must require zero event/reversal/amount deltas.');
assert.match(adminApi, /hypotheticalEligiblePoints/, 'Reconciliation must expose hypothetical value without posting it.');
assert.doesNotMatch(adminApi, /\.from\('reward_accounts'\)|\.from\('reward_ledger_entries'\)/, 'Connector admin API must not touch user Rewards balances or ledger rows.');

assert.match(adminPage, /investment_role !== 'SUPER_ADMIN'/, 'Signed Sources admin page must require SUPER_ADMIN.');
assert.match(panel, /SIGNED SOURCE — SHADOW ONLY/, 'Signed Sources UI must disclose the non-commercial boundary.');
assert.match(panel, /La clave privada permanece en el sistema origen/, 'UI must make private-key custody explicit.');
assert.match(panel, /Reconciliación fuente ↔ shadow/, 'UI must expose source-vs-shadow reconciliation.');
assert.doesNotMatch(panel, /acreditar puntos ahora|earning comercial activo|redimir ahora/i, 'v4 UI must not expose commercial activation claims.');
assert.match(nav, /href: '\/admin\/rewards\/connectors', label: 'Rewards Sources', roles: \['SUPER_ADMIN'\]/, 'Signed Sources navigation must remain SUPER_ADMIN-only.');

assert.match(schemaVersion, /EXPECTED_DATABASE_MIGRATION = '0136'/, 'Repository schema authority must advance to 0136.');
assert.match(schemaVersion, /EXPECTED_DATABASE_MIGRATION_NAME = 'rewards_signed_source_connectors_v4'/, 'Schema authority must name Signed Source Connectors v4.');
assert.match(schemaVersion, /EXPECTED_DATABASE_MIGRATION_COUNT = 136/, 'Schema migration count must advance to 136.');
assert.match(history, /"logicalVersion": "0136", "remoteVersion": "20260914130944", "remoteName": "0136_rewards_signed_source_connectors_v4"/, 'Production provenance must contain the real 0136 Supabase migration.');

for (const truth of ['Every accepted event remains **shadow-only**', 'CTG One stores only the source\'s Ed25519 public key', 'Closed Earning Canary v5']) {
  assert.ok(docs.includes(truth), `Rewards v4 governance must retain: ${truth}`);
}

console.log('CTG Rewards Signed Source Connectors & Reconciliation v4 invariants: PASS');
