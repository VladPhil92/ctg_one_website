import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const unitEconomics = await read('src/components/inversion/UnitEconomics.tsx');
const simulatorPage = await read('src/app/inversion/simulador/page.tsx');
const simulatorClient = await read('src/components/inversion/InvestmentSimulatorClient.tsx');
const economics = await read('src/lib/investment/economics.ts');
const queries = await read('src/lib/investment/queries.ts');
const operations = await read('src/app/admin/operations/page.tsx');
const migration = await read('supabase/migrations/0020_authoritative_lot_economics.sql');

assert.ok(unitEconomics.includes('getPublicEconomicsReferenceLot'), 'Public unit economics must come from a persisted lot snapshot.');
assert.ok(unitEconomics.includes('deriveUnitEconomics'), 'Public unit economics must use the shared economics calculator.');
for (const forbidden of ['const productionCost = 6000', 'const labelCost = 900', 'const ownPointGrossPrice = 18000', 'const b2bPrice = 8000', 'const incRate = 0.08', 'const advertisingRate = 0.035']) {
  assert.ok(!unitEconomics.includes(forbidden), `UnitEconomics must not reintroduce hard-coded economics: ${forbidden}`);
}

assert.ok(simulatorPage.includes('getPublicSimulationLots'), 'Simulator must load real funding-open lots.');
assert.ok(simulatorPage.includes('getActiveInvestmentFormulaVersion'), 'Simulator must load the active formula version from Supabase.');
for (const forbidden of ['CAPITAL_PER_CASE_CENTS', 'PROJECTED_NDLP_RATIO', 'PARTICIPANT_PROFIT_SHARE', 'CASE_SIZE_UNITS']) {
  assert.ok(!simulatorPage.includes(forbidden), `Simulator page must not contain legacy financial constant ${forbidden}.`);
  assert.ok(!simulatorClient.includes(forbidden), `Simulator client must not contain legacy financial constant ${forbidden}.`);
}
assert.ok(simulatorClient.includes('deriveLotScenario'), 'Simulator scenarios must use the shared lot-snapshot calculator.');
assert.ok(economics.includes('lot.production_cost_unit_cents'), 'Shared economics must derive capital from the lot production-cost snapshot.');
assert.ok(economics.includes('formula.participant_profit_share'), 'Participant scenario share must come from the versioned formula record.');
assert.ok(queries.includes("lot.status === 'FUNDING_OPEN'"), 'Public simulator must only use funding-open lots.');

assert.ok(operations.includes("rpc('update_investment_beer_style_economics'"), 'Production OS must provide a database-authoritative preset update path.');
assert.ok(operations.includes("production:'',label:'',ownPrice:'',b2bPrice:'',inc:'',advertising:''"), 'Production OS must initialize economics blank rather than inventing defaults.');
for (const forbidden of ["production:'7000'", "label:'900'", "ownPrice:'18000'", "b2bPrice:'10000'", "inc:'8'", "advertising:'3.5'", "useState('18000')"]) {
  assert.ok(!operations.includes(forbidden), `Production OS must not reintroduce financial UI default ${forbidden}.`);
}
assert.ok(operations.includes('lot.own_point_price_unit_cents/100'), 'Sales entry should initialize from the selected lot snapshot, not a fixed sale price.');

for (const column of ['production_cost_unit_cents','label_cost_unit_cents','own_point_price_unit_cents','b2b_price_unit_cents','inc_rate','advertising_rate_on_pre_inc']) {
  assert.ok(migration.includes(`alter column ${column} drop default`), `Migration 0020 must remove implicit lot default for ${column}.`);
}
assert.ok(migration.includes('p_production_cost_unit_cents bigint default null'), 'Canonical lot RPC must fail closed when production economics are omitted.');
assert.ok(migration.includes('p_inc_rate numeric default null'), 'Canonical lot RPC must fail closed when tax economics are omitted.');
assert.ok(migration.includes('update_investment_beer_style_economics'), 'Migration 0020 must expose an audited master-data update RPC.');
assert.ok(migration.includes('revoke execute on function public.create_production_lot('), 'Legacy lot creation RPC must no longer be client executable.');

console.log('Investment economics invariants: PASS');
