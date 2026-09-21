import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [migration, api, hook, dashboard, publicSection, services, funnel, schemaVersion, docs] = await Promise.all([
  read('supabase/migrations/20260914035147_0133_rewards_foundation_v1.sql'),
  read('src/app/api/rewards/account/route.ts'),
  read('src/hooks/useRewardsSummary.ts'),
  read('src/app/dashboard/rewards/page.tsx'),
  read('src/components/sections/RewardsSection.tsx'),
  read('src/config/dashboard-services.ts'),
  read('src/lib/analytics/funnel.ts'),
  read('src/lib/observability/schema-version.ts'),
  read('docs/product/CTG_REWARDS_FOUNDATION_V1.md'),
]);

for (const table of ['reward_accounts', 'reward_ledger_entries']) {
  assert.match(migration, new RegExp(`create table if not exists public\\.${table}`), `${table} must exist.`);
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`), `${table} must enforce RLS.`);
}

assert.match(migration, /grant select on table public\.reward_accounts to authenticated/, 'Authenticated users may only read Rewards accounts.');
assert.match(migration, /grant select on table public\.reward_ledger_entries to authenticated/, 'Authenticated users may only read their own Rewards ledger.');
assert.doesNotMatch(migration, /grant[^;]*(insert|update|delete)[^;]*authenticated/i, 'Authenticated users must never mutate Rewards state directly.');
assert.doesNotMatch(migration, /grant[^;]*(insert|update|delete)[^;]*service_role/i, 'Foundation v1 must not grant service_role direct Rewards mutation privileges.');
assert.match(migration, /revoke all on table public\.reward_accounts from public, anon, authenticated, service_role/, 'Reward account privileges must fail closed before explicit authenticated SELECT grants.');
assert.match(migration, /revoke all on table public\.reward_ledger_entries from public, anon, authenticated, service_role/, 'Reward ledger privileges must fail closed before explicit authenticated SELECT grants.');
assert.match(migration, /using \(\(select auth\.uid\(\)\) = user_id\)/, 'Rewards reads must be owner-scoped by auth.uid().');
assert.match(migration, /reward_ledger_immutable_update_trg/, 'Ledger updates must be blocked.');
assert.doesNotMatch(migration, /reward_ledger_immutable_delete_trg/, 'Ledger immutability must not break identity ON DELETE CASCADE cleanup.');
assert.match(migration, /created_by uuid,/, 'Ledger actor identity must be retained as an immutable UUID snapshot.');
assert.doesNotMatch(migration, /created_by uuid references public\.profiles/, 'Ledger actor snapshot must not use an ON DELETE mutation-producing profile FK.');
assert.match(migration, /create or replace function private\.rewards_create_account_for_profile\(\)/, 'Automatic account creation must live in the private schema.');
assert.match(migration, /private\.rewards_create_account_for_profile\(\)[\s\S]*security definer/, 'The private profile trigger may use tightly scoped SECURITY DEFINER authority.');
assert.match(migration, /revoke all on function private\.rewards_create_account_for_profile\(\) from public, anon, authenticated, service_role/, 'Private trigger execution must not be exposed as an application RPC.');
assert.doesNotMatch(migration, /apply_reward_ledger_entry/, 'Foundation v1 must not expose a Rewards mutation RPC before commercial rules exist.');
assert.match(migration, /default 'foundation'/, 'New Rewards accounts must default to foundation, not active.');
assert.match(migration, /No points are seeded/, 'Migration must explicitly reject retroactive point seeding.');

for (const forbidden of ['redeem', 'transfer', 'cashback', 'ctgo_conversion']) {
  assert.doesNotMatch(migration, new RegExp(`entry_type[^;]*'${forbidden}'`, 'i'), `Foundation v1 must not create an active ${forbidden} ledger type.`);
}

assert.match(api, /createAuthenticatedRequestContext/, 'Rewards read model must use the canonical authenticated request boundary.');
assert.doesNotMatch(api, /createAdminClient|SUPABASE_SERVICE_ROLE_KEY/, 'Rewards user reads must never use service-role authority.');
assert.match(api, /commercialStatus:\s*'inactive'/, 'API must declare commercial Rewards inactive.');
assert.match(api, /earningActive:\s*false/, 'API must not claim active earning.');
assert.match(api, /redemptionActive:\s*false/, 'API must not claim active redemption.');
assert.match(api, /tokenConversionActive:\s*false/, 'API must not claim CTGO conversion.');

assert.match(hook, /state:\s*'error'/, 'Rewards client read failures must remain distinguishable from zero balance.');
assert.match(hook, /credentials:\s*'same-origin'/, 'Rewards read must stay on the authenticated same-origin boundary.');
assert.doesNotMatch(hook, /\.from\(/, 'Rewards dashboard hook must not query Rewards tables directly from the browser.');

assert.match(dashboard, /CTG Rewards · Foundation v1/, 'Authenticated Rewards surface must identify Foundation v1.');
assert.match(dashboard, /no es dinero, cashback ni un criptoactivo/i, 'Dashboard must explain that Rewards points are non-monetary.');
assert.match(dashboard, /no pueden convertirse a CTGO/i, 'Dashboard must deny CTGO conversion.');
assert.match(dashboard, /redención activa/i, 'Dashboard must disclose that redemption is inactive.');
assert.doesNotMatch(dashboard, /canjear ahora|redimir ahora|ganar puntos ahora/i, 'Foundation surface must not expose fake commercial CTAs.');

assert.match(publicSection, /Foundation v1/, 'Public Rewards surface must expose current maturity.');
assert.match(publicSection, /todavía no/i, 'Public Rewards copy must retain inactive commercial truth.');
assert.match(services, /id: 'rewards'[\s\S]*href: '\/dashboard\/rewards'/, 'Rewards service must route signed-in users to the authenticated surface.');
assert.match(services, /id: 'rewards'[\s\S]*status: 'DEVELOPMENT'/, 'Rewards must remain DEVELOPMENT, not LIVE.');
assert.match(services, /id: 'rewards'[\s\S]*publicHref: '\/rewards'/, 'Rewards must retain a public maturity surface.');
assert.ok(funnel.includes("'rewards'"), 'Rewards must be an approved funnel service key.');
assert.match(schemaVersion, /EXPECTED_DATABASE_MIGRATION = '0141'/, 'Repository schema authority must reflect the current additive global schema.');
assert.match(schemaVersion, /EXPECTED_DATABASE_MIGRATION_NAME = 'expand_service_federation_rate_limits'/, 'Current schema authority must name the latest additive global migration.');
assert.match(schemaVersion, /EXPECTED_DATABASE_MIGRATION_COUNT = 141/, 'Current schema migration count must remain aligned with repository history.');

for (const truth of ['**does not activate**', 'No `redeem`', 'Moving CTG Rewards from `DEVELOPMENT`']) {
  assert.ok(docs.includes(truth), `Rewards governance document must retain: ${truth}`);
}

console.log('CTG Rewards Foundation v1 invariants: PASS');
await import('./test-rewards-pilot-control-plane-v2-invariants.mjs');
