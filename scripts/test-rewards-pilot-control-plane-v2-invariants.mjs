import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [migration, api, simulation, adminPage, panel, nav, schemaVersion, history, docs] = await Promise.all([
  read('supabase/migrations/20260914111247_0134_rewards_pilot_control_plane_v2.sql'),
  read('src/app/api/admin/rewards/control-plane/route.ts'),
  read('src/lib/rewards/pilot-simulation.ts'),
  read('src/app/admin/rewards/page.tsx'),
  read('src/components/admin/RewardsPilotControlPlane.tsx'),
  read('src/components/admin/AdminNav.tsx'),
  read('src/lib/observability/schema-version.ts'),
  read('scripts/fixtures/supabase-production-migration-history.json'),
  read('docs/product/CTG_REWARDS_PILOT_CONTROL_PLANE_V2.md'),
]);

for (const table of ['reward_pilot_units', 'reward_rule_drafts', 'reward_rule_simulations']) {
  assert.match(migration, new RegExp(`create table public\\.${table}`), `${table} must be created by 0134.`);
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`), `${table} must enforce RLS.`);
  assert.match(migration, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated, service_role`), `${table} must fail closed before server grants.`);
}

assert.match(migration, /stage text not null default 'draft' check \(stage in \('draft', 'validated', 'archived'\)\)/, 'Control-plane stages must remain non-operational.');
assert.doesNotMatch(migration, /stage in \([^)]*'active'|stage in \([^)]*'live'|stage in \([^)]*'published'/i, 'Pilot control-plane schema must not contain an operational stage.');
assert.match(migration, /grant select, insert, update on table public\.reward_pilot_units to service_role/, 'Server may manage candidate units.');
assert.match(migration, /grant select, insert, update on table public\.reward_rule_drafts to service_role/, 'Server may manage draft rules.');
assert.match(migration, /grant select, insert on table public\.reward_rule_simulations to service_role/, 'Simulations must be append-only through server authority.');
assert.doesNotMatch(migration, /grant[^;]*delete[^;]*to service_role/i, 'Pilot control plane must not grant direct DELETE.');
assert.doesNotMatch(migration, /grant[^;]*(insert|update|delete)[^;]*to authenticated/i, 'Signed-in browser users must not mutate control-plane tables directly.');
assert.doesNotMatch(migration, /grant[^;]*(insert|update|delete)[^;]*reward_(accounts|ledger_entries)/i, '0134 must not introduce Rewards balance or ledger privileges.');
assert.doesNotMatch(migration, /apply_reward_ledger_entry|points_balance\s*=|insert into public\.reward_ledger_entries/i, '0134 must not contain any Rewards balance/ledger mutation path.');
assert.match(migration, /Pilot Control Plane v2 is intentionally simulation-only/, 'Migration must carry the simulation-only product boundary.');

const authIndex = api.indexOf("supabase.auth.getUser()");
const profileIndex = api.indexOf("profile?.role !== 'admin'");
const superAdminIndex = api.indexOf("investmentProfile?.investment_role !== 'SUPER_ADMIN'");
const adminClientIndex = api.indexOf('createAdminClient()');
assert.ok(authIndex >= 0 && profileIndex > authIndex && superAdminIndex > authIndex && adminClientIndex > superAdminIndex, 'Service-role access must be created only after normal-user SUPER_ADMIN authorization.');
assert.match(api, /commercialStatus:\s*'inactive'/, 'Control-plane API must keep commercial Rewards inactive.');
assert.match(api, /ledgerEffects:\s*false/, 'Control-plane API must explicitly deny ledger effects.');
for (const action of ['create_unit', 'create_rule', 'set_stage', 'simulate_rule']) {
  assert.ok(api.includes(`body.action === '${action}'`), `Control-plane API must implement ${action}.`);
}
assert.doesNotMatch(api, /\.from\('reward_accounts'\)|\.from\('reward_ledger_entries'\)/, 'Control-plane API must not touch user Rewards balances or ledger rows.');
assert.match(api, /nonBinding:\s*true/, 'Simulation snapshots must identify themselves as non-binding.');
assert.match(api, /async function loadAllPilotUnits/, 'Candidate units must be read through an explicit paginated loader.');
assert.match(api, /\.range\(offset, offset \+ READ_PAGE_SIZE - 1\)/, 'Control-plane reads must paginate instead of silently truncating candidate units.');
assert.match(api, /MAX_CONTROL_PLANE_ROWS/, 'Paginated control-plane reads must retain a bounded fail-closed ceiling.');
assert.match(api, /parentUnit\.stage === 'archived'/, 'Rules under archived pilot units must be rejected by the server boundary.');
assert.match(api, /PILOT_UNIT_NOT_SIMULATABLE/, 'Simulation attempts for archived parent units must fail explicitly.');

assert.match(simulation, /export function calculateRewardPreview/, 'Pilot formula must be implemented as a pure reusable function.');
assert.match(simulation, /Math\.floor\(input\.inputAmountCents \/ input\.copBlockCents\)/, 'COP-block simulations must use whole blocks.');
assert.match(simulation, /Math\.min\(points, input\.maximumPointsPerEvent\)/, 'Simulation must enforce optional event caps.');
assert.doesNotMatch(simulation, /fetch\(|\.from\(|createAdminClient|reward_ledger/i, 'Simulation calculation must remain side-effect free.');

assert.match(adminPage, /investment_role !== 'SUPER_ADMIN'/, 'Admin Rewards page must require SUPER_ADMIN.');
assert.match(panel, /SIMULACIÓN — cero efectos de ledger/, 'Admin UI must visibly disclose zero ledger effects.');
assert.match(panel, /Validado significa listo para análisis interno; nunca significa activo para usuarios/, 'Validated state must be explained as non-operational.');
assert.doesNotMatch(panel, /activar rewards|publicar regla|ganar puntos ahora|redimir ahora/i, 'Control-plane UI must not expose activation or commercial CTAs.');
assert.match(nav, /href: '\/admin\/rewards', label: 'Rewards Lab', roles: \['SUPER_ADMIN'\]/, 'Rewards Lab navigation must remain SUPER_ADMIN-only.');

assert.match(schemaVersion, /EXPECTED_DATABASE_MIGRATION = '0135'/, 'Repository schema authority must reflect the current additive schema.');
assert.match(schemaVersion, /EXPECTED_DATABASE_MIGRATION_NAME = 'rewards_shadow_earning_engine_v3'/, 'Schema authority must name the shadow engine migration.');
assert.match(schemaVersion, /EXPECTED_DATABASE_MIGRATION_COUNT = 135/, 'Schema migration count must advance to 135.');
assert.match(history, /"logicalVersion": "0134", "remoteVersion": "20260914111247", "remoteName": "0134_rewards_pilot_control_plane_v2"/, 'Production provenance must retain the real 0134 Supabase migration.');
assert.match(history, /"logicalVersion": "0135", "remoteVersion": "20260914123941", "remoteName": "0135_rewards_shadow_earning_engine_v3"/, 'Production provenance must contain the real 0135 Supabase migration.');

for (const truth of ['**simulation only**', 'There is intentionally no `active`', 'separate decision before any CTGO interoperability']) {
  assert.ok(docs.includes(truth), `Rewards v2 governance must retain: ${truth}`);
}

console.log('CTG Rewards Pilot Control Plane v2 invariants: PASS');
await import('./test-rewards-shadow-earning-engine-v3-invariants.mjs');
