import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [migration, queries, detail, simulatorPage, simulatorClient, schemaVersion] = await Promise.all([
  read('supabase/migrations/0061_public_lot_operational_snapshot.sql'),
  read('src/lib/investment/queries.ts'),
  read('src/app/inversion/lotes/[slug]/page.tsx'),
  read('src/app/inversion/simulador/page.tsx'),
  read('src/components/inversion/InvestmentSimulatorClient.tsx'),
  read('src/lib/observability/schema-version.ts'),
]);

assert.match(
  migration,
  /drop policy if exists investment_production_events_select on public\.investment_production_events/i,
  'Historical public row-level production-event access must be removed.',
);
assert.match(
  migration,
  /create policy investment_production_events_ops_select[\s\S]*?to authenticated[\s\S]*?has_investment_permission\('ops\.read'\)/i,
  'Direct production-event reads must be constrained to ops.read actors.',
);
assert.match(
  migration,
  /create or replace function public\.get_public_investment_lot_operations\(p_lot_id uuid\)/i,
  'Published lot operational truth must have one reviewed aggregate read model.',
);
assert.match(migration, /security definer[\s\S]*?set search_path = public/i, 'Public operational read model must pin search_path.');
assert.match(migration, /l\.status <> 'DRAFT'/, 'Public operational snapshot must reject draft lots independently of caller RLS.');
for (const status of ['WAREHOUSE','DISPATCHED','IN_MARKET','SOLD','RETURNED','DAMAGED','LOST','EXPIRED','RECALLED']) {
  assert.ok(migration.includes(`'${status}'`), `Public operational snapshot must account for ${status}.`);
}
assert.match(migration, /jsonb_build_object\([\s\S]*?'status',[\s\S]*?e\.new_status[\s\S]*?'occurred_at',[\s\S]*?e\.occurred_at/, 'Public timeline must expose only status progression and timestamp.');
assert.doesNotMatch(migration, /jsonb_build_object\([\s\S]*?'actor_id'/, 'Public timeline must not publish actor IDs.');
assert.doesNotMatch(migration, /jsonb_build_object\([\s\S]*?'notes'/, 'Public timeline must not publish operational notes.');
assert.match(
  migration,
  /'get_public_bottle_trace',[\s\S]*?'get_public_investment_lot_funding',[\s\S]*?'get_public_investment_lot_operations'/,
  'System Health must recognize all three reviewed anonymous read models.',
);

assert.match(queries, /rpc\('get_public_investment_lot_operations'/, 'Public lot details must consume the reviewed operational snapshot.');
assert.doesNotMatch(queries, /\.from\('investment_inventory_movements'\)/, 'Public query helpers must not read ops-only inventory movements directly.');
assert.doesNotMatch(queries, /\.from\('investment_production_events'\)/, 'Public query helpers must not read internal production-event rows directly.');
assert.match(queries, /serializedUnits:\s*Number\(row\.serialized_units/, 'Operational snapshot must map aggregate serialized-unit count.');
assert.match(queries, /timeline:\s*rawTimeline[\s\S]*?status: event\.status[\s\S]*?occurredAt: event\.occurred_at/, 'Public timeline mapping must retain only reviewed fields.');

assert.match(detail, /getPublicLotOperationalSnapshot/, 'Lot detail must use the public operational snapshot.');
assert.match(detail, /funding\.availableCasesEquivalent >= MIN_INVESTMENT_CASES/, 'Lot detail CTA must enforce the same minimum as checkout.');
assert.match(detail, /Capacidad financiable/, 'Lot detail must distinguish physical production from fundable capacity.');
assert.match(detail, /Asignadas/, 'Lot detail must expose consolidated allocation count.');
assert.match(detail, /Reservadas/, 'Lot detail must expose aggregate active reservations.');
assert.match(detail, /Disponible para nueva orden/, 'Lot detail must label true reservable capacity explicitly.');
assert.match(detail, /Serializadas/, 'Public inventory must describe bottle-unit truth as serialized units, not inferred physical production.');
assert.match(detail, /Vendidas vigentes/, 'Public inventory must distinguish currently sold units from returned units.');
assert.match(detail, /La capacidad no asignada no equivale a disponibilidad de inversión/, 'Non-open lots must not imply residual capacity is investable.');

assert.match(simulatorPage, /getPublicLotFundingSummaries/, 'Simulator must load live availability separately from economic snapshots.');
assert.match(simulatorPage, /puede usar un snapshot histórico aunque el lote no esté abierto/, 'Simulator introduction must be state-neutral about opportunity availability.');
assert.match(simulatorClient, /fundingByLot:\s*Record<string, LotFundingSummary>/, 'Simulator must receive live aggregate funding state.');
assert.match(simulatorClient, /max=\{selected\.total_eligible_units\}/, 'Simulator input must be capped by fundable snapshot capacity, not physical production.');
assert.match(simulatorClient, /Math\.min\(selected\.total_eligible_units/, 'Simulator change handler must enforce fundable snapshot capacity.');
assert.doesNotMatch(simulatorClient, /max=\{selected\.total_cases\}/, 'Simulator must not advertise full physical production as fundable capacity.');
assert.match(simulatorClient, /simulationExceedsLiveCapacity/, 'Simulator must detect scenarios above current reservable capacity.');
assert.match(simulatorClient, /El cálculo sigue siendo válido como escenario económico del snapshot, no como reserva de cupo/, 'Simulator must explain the distinction between scenario size and live capacity.');

const schemaMatch = schemaVersion.match(/EXPECTED_DATABASE_MIGRATION\s*=\s*'(\d{4})'/);
const countMatch = schemaVersion.match(/EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/);
assert.ok(schemaMatch && Number(schemaMatch[1]) >= 61, 'Runtime schema must remain at or beyond public lot operational boundary 0061.');
assert.ok(countMatch && Number(countMatch[1]) >= 61, 'Runtime migration count must remain at or beyond public lot operational boundary 0061.');

console.log('Public lot operational truth invariants: PASS');
