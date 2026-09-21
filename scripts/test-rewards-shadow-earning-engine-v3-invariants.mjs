import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [migration, api, evaluator, adminPage, panel, nav, schemaVersion, history, docs] = await Promise.all([
  read('supabase/migrations/20260914123941_0135_rewards_shadow_earning_engine_v3.sql'),
  read('src/app/api/admin/rewards/shadow-engine/route.ts'),
  read('src/lib/rewards/shadow-evaluation.ts'),
  read('src/app/admin/rewards/shadow/page.tsx'),
  read('src/components/admin/RewardsShadowEnginePanel.tsx'),
  read('src/components/admin/AdminNav.tsx'),
  read('src/lib/observability/schema-version.ts'),
  read('scripts/fixtures/supabase-production-migration-history.json'),
  read('docs/product/CTG_REWARDS_SHADOW_EARNING_ENGINE_V3.md'),
]);

for (const table of ['reward_shadow_runtime_config', 'reward_shadow_events', 'reward_shadow_evaluations']) {
  assert.match(migration, new RegExp(`create table public\\.${table}`), `${table} must be created by 0135.`);
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`), `${table} must enforce RLS.`);
  assert.match(migration, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated, service_role`), `${table} must fail closed before server grants.`);
}

assert.match(migration, /where stage = 'validated'/, '0135 must enforce one validated rule per unit/event with a partial index.');
assert.match(migration, /processing_enabled boolean not null default false/, 'Shadow processing kill switch must default closed.');
assert.match(migration, /constraint reward_shadow_events_source_external_uidx unique \(source_domain, external_event_id\)/, 'Source event idempotency must be database-enforced.');
assert.match(migration, /reward_shadow_events_single_reversal_uidx/, 'An original shadow event must allow at most one reversal.');
assert.match(migration, /source_event_id uuid not null unique/, 'Each shadow event must have at most one evaluation.');
assert.match(migration, /grant select, update on table public\.reward_shadow_runtime_config to service_role/, 'Only server authority may manage shadow runtime config.');
assert.match(migration, /grant select, insert on table public\.reward_shadow_events to service_role/, 'Shadow events must be append-only through server authority.');
assert.match(migration, /grant select, insert on table public\.reward_shadow_evaluations to service_role/, 'Shadow evaluations must be append-only through server authority.');
assert.doesNotMatch(migration, /grant[^;]*delete[^;]*to service_role/i, 'Shadow engine must not grant direct DELETE.');
assert.doesNotMatch(migration, /grant[^;]*(insert|update|delete)[^;]*to authenticated/i, 'Browser users must not mutate shadow engine tables directly.');
assert.doesNotMatch(migration, /grant[^;]*(insert|update|delete)[^;]*reward_(accounts|ledger_entries)/i, '0135 must not add Rewards balance/ledger privileges.');
assert.doesNotMatch(migration, /insert into public\.reward_ledger_entries|update public\.reward_accounts|points_balance\s*=/i, '0135 must have zero Rewards ledger mutation path.');
assert.match(migration, /Shadow Earning Engine v3 intentionally has zero Rewards ledger authority/, 'Migration must state the zero-ledger boundary.');

const authIndex = api.indexOf("supabase.auth.getUser()");
const profileIndex = api.indexOf("profile?.role !== 'admin'");
const superAdminIndex = api.indexOf("investmentProfile?.investment_role !== 'SUPER_ADMIN'");
const adminClientIndex = api.indexOf('createAdminClient()');
assert.ok(authIndex >= 0 && profileIndex > authIndex && superAdminIndex > authIndex && adminClientIndex > superAdminIndex, 'Shadow service-role authority must be created only after SUPER_ADMIN authorization.');
assert.match(api, /commercialStatus:\s*'inactive'/, 'Shadow engine must keep commercial Rewards inactive.');
assert.match(api, /ledgerEffects:\s*false/, 'Shadow engine must explicitly deny ledger effects.');
assert.match(api, /ingestionMode:\s*'admin_replay_only'/, 'v3 must retain manual replay even after signed-source v4 is added.');
for (const action of ['configure_runtime', 'ingest_event', 'reverse_event']) {
  assert.ok(api.includes(`body.action === '${action}'`), `Shadow API must implement ${action}.`);
}
assert.match(api, /IDEMPOTENCY_CONFLICT/, 'Mismatched replays must fail as idempotency conflicts.');
assert.match(api, /originalMatches/, 'Replay identity must compare canonical event facts.');
assert.match(api, /SHADOW_EVENT_WRITE_FAILED/, 'Unexpected source-event write failures must remain distinguishable from idempotency conflicts.');
assert.match(api, /async function ensureReversalEvaluation/, 'Concurrent reversal requests must converge on exactly one reversal evaluation.');
assert.match(api, /function reversalMatches/, 'Reversal replays must compare canonical reversal facts.');
assert.match(api, /idempotentReplay = true/, 'Concurrent inserts must surface as idempotent replay after canonical re-read.');
assert.match(api, /subjectDailyOriginalCount/, 'Shadow evaluation must enforce subject-day event limits.');
assert.match(api, /reversalBypassesKillSwitch:\s*true/, 'Safety reversals must remain representable when shadow processing is disabled.');
assert.match(api, /ORIGINAL_ALREADY_REVERSED/, 'Second reversals must fail explicitly.');
assert.doesNotMatch(api, /\.from\('reward_accounts'\)|\.from\('reward_ledger_entries'\)/, 'Shadow API must not touch user Rewards balances or ledger rows.');

assert.match(evaluator, /export function evaluateShadowReward/, 'Shadow decisioning must be a pure reusable function.');
assert.match(evaluator, /kill_switch_disabled/, 'Pure evaluator must fail closed when processing is disabled.');
assert.match(evaluator, /amount_limit_exceeded/, 'Pure evaluator must enforce runtime amount limits.');
assert.match(evaluator, /subject_daily_event_limit_exceeded/, 'Pure evaluator must enforce daily subject limits.');
assert.match(evaluator, /no_complete_block/, 'Zero complete-block outcomes must not be mislabeled as minimum-amount failures.');
assert.match(evaluator, /Math\.min\(preview\.points, input\.runtime\.maxPointsPerEvent\)/, 'Runtime points cap must bound the rule result.');
assert.doesNotMatch(evaluator, /fetch\(|\.from\(|createAdminClient|reward_ledger/i, 'Shadow evaluator must remain side-effect free.');

assert.match(adminPage, /investment_role !== 'SUPER_ADMIN'/, 'Shadow admin page must require SUPER_ADMIN.');
assert.match(panel, /SHADOW ONLY — cero efectos de ledger/, 'Shadow UI must visibly disclose zero ledger effects.');
assert.match(panel, /habilita únicamente evaluación hipotética/i, 'Runtime enablement must be explained as hypothetical-only.');
assert.match(panel, /Replay manual de evento/, 'v3 UI must retain controlled admin replay.');
assert.doesNotMatch(panel, /activar rewards|earning comercial activo|acreditar puntos ahora|redimir ahora/i, 'Shadow UI must not expose commercial activation claims.');
assert.match(nav, /href: '\/admin\/rewards\/shadow', label: 'Rewards Shadow', roles: \['SUPER_ADMIN'\]/, 'Shadow navigation must remain SUPER_ADMIN-only.');

assert.match(schemaVersion, /EXPECTED_DATABASE_MIGRATION = '0143'/, 'Repository schema authority must reflect the current additive global schema.');
assert.match(schemaVersion, /EXPECTED_DATABASE_MIGRATION_NAME = 'runtime_schema_requirement_probe_timestamp_compatibility'/, 'Schema authority must name the current additive global migration.');
assert.match(schemaVersion, /EXPECTED_DATABASE_MIGRATION_COUNT = 143/, 'Schema migration count must align with the current global schema.');
assert.match(history, /"logicalVersion": "0135", "remoteVersion": "20260914123941", "remoteName": "0135_rewards_shadow_earning_engine_v3"/, 'Production provenance must retain the real 0135 Supabase migration.');
assert.match(history, /"logicalVersion": "0136", "remoteVersion": "20260914130944", "remoteName": "0136_rewards_signed_source_connectors_v4"/, 'Production provenance must retain the real 0136 Supabase migration.');
assert.match(history, /"logicalVersion": "0137", "remoteVersion": "20260914132842", "remoteName": "0137_rewards_signed_source_atomicity_hardening"/, 'Production provenance must contain the real 0137 Supabase hardening migration.');
assert.match(history, /"logicalVersion": "0138", "remoteVersion": "20260914154606", "remoteName": "0138_rewards_signed_source_integrity_hardening_v4_1"/, 'Production provenance must retain the real 0138 Supabase hardening migration.');
assert.match(history, /"logicalVersion": "0139", "remoteVersion": "20260914155204", "remoteName": "0139_rewards_source_integrity_transactional_boundaries_v4_1"/, 'Production provenance must retain the real 0139 Supabase transactional-boundaries migration.');

for (const truth of ['Every result remains **shadow-only**', '`admin_replay_only`', 'Signed Source Connectors & Reconciliation v4']) {
  assert.ok(docs.includes(truth), `Rewards v3 governance must retain: ${truth}`);
}

console.log('CTG Rewards Shadow Earning Engine v3 invariants: PASS');
await import('./test-rewards-signed-source-connectors-v4-invariants.mjs');
