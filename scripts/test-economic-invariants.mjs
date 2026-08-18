import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const unitEconomics = await read('src/components/inversion/UnitEconomics.tsx');
const simulatorPage = await read('src/app/inversion/simulador/page.tsx');
const simulatorClient = await read('src/components/inversion/InvestmentSimulatorClient.tsx');
const economics = await read('src/lib/investment/economics.ts');
const queries = await read('src/lib/investment/queries.ts');
const operations = await read('src/app/admin/operations/page.tsx');
const createLotRoute = await read('src/app/api/investment/admin/lots/route.ts');
const migration = await read('supabase/migrations/0020_authoritative_lot_economics.sql');
const partialInventoryMigration = await read('supabase/migrations/0042_partial_inventory_funding_capacity.sql');
const privilegeHardening = await read('supabase/migrations/0021_economics_function_privilege_hardening.sql');
const languageContext = await read('src/contexts/LanguageContext.tsx');
const economicsTranslations = await read('src/i18n/investmentEconomicsTranslations.ts');

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
assert.ok(economics.includes('lot.total_eligible_units'), 'Simulator must cap scenarios at the fundable case capacity, not total physical production.');
assert.ok(queries.includes("lot.status === 'FUNDING_OPEN'"), 'Public simulator must prefer funding-open lots.');
assert.ok(queries.includes('lot.total_eligible_units >= MIN_INVESTMENT_CASES'), 'Public simulator eligibility must use fundable case capacity.');
assert.ok(queries.includes('const fundableCases = lot.total_eligible_units'), 'Funding summaries must derive availability from fundable capacity.');

assert.ok(languageContext.includes('translateInvestmentEconomicsPhrase'), 'LanguageContext must route investment economics through parameter-aware translations.');
assert.ok(economicsTranslations.includes('Economía unitaria · (.+)'), 'Dynamic lot-code economics badges must have translation coverage.');
assert.ok(economicsTranslations.includes('Advertising · ${match[1]} on pre-INC base'), 'Dynamic advertising-rate labels must have translation coverage.');
assert.ok(economicsTranslations.includes("en: 'Batch-snapshot simulator'"), 'Simulator copy must have an English translation contract.');

assert.ok(operations.includes("rpc('update_investment_beer_style_economics'"), 'Production OS must provide a database-authoritative preset update path.');
for (const field of ['production', 'label', 'ownPrice', 'b2bPrice', 'inc', 'advertising']) {
  assert.match(
    operations,
    new RegExp(`${field}\\s*:\\s*''`),
    `Production OS must initialize ${field} blank rather than inventing a financial default.`,
  );
}
for (const [field, value] of [
  ['production', '7000'],
  ['label', '900'],
  ['ownPrice', '18000'],
  ['b2bPrice', '10000'],
  ['inc', '8'],
  ['advertising', '3.5'],
]) {
  assert.ok(
    !new RegExp(`${field}\\s*:\\s*'${value}'`).test(operations),
    `Production OS must not reintroduce financial UI default ${field}=${value}.`,
  );
}
assert.ok(!/useState\(\s*'18000'\s*\)/.test(operations), 'Production OS must not reintroduce a fixed 18,000 COP sales state.');
assert.match(
  operations,
  /lot\.own_point_price_unit_cents\s*\/\s*100/,
  'Sales entry should initialize from the selected lot snapshot, not a fixed sale price.',
);

for (const forbidden of [
  '.default(6000)', '.default(900)', '.default(18000)', '.default(8000)', '.default(0.08)', '.default(0.035)',
]) {
  assert.ok(!createLotRoute.includes(forbidden), `Admin lot API must not invent financial defaults: ${forbidden}`);
}
assert.ok(createLotRoute.includes('eligibleCases'), 'Admin lot API must accept explicit fundable capacity.');
assert.ok(createLotRoute.includes('p_total_eligible_units'), 'Admin lot API must persist explicit fundable capacity.');

for (const column of ['production_cost_unit_cents','label_cost_unit_cents','own_point_price_unit_cents','b2b_price_unit_cents','inc_rate','advertising_rate_on_pre_inc']) {
  assert.ok(migration.includes(`alter column ${column} drop default`), `Migration 0020 must remove implicit lot default for ${column}.`);
}
assert.ok(migration.includes('p_production_cost_unit_cents bigint default null'), 'Canonical lot RPC must fail closed when production economics are omitted.');
assert.ok(migration.includes('p_inc_rate numeric default null'), 'Canonical lot RPC must fail closed when tax economics are omitted.');
assert.ok(migration.includes('update_investment_beer_style_economics'), 'Migration 0020 must expose an audited master-data update RPC.');
assert.ok(migration.includes('revoke execute on function public.create_production_lot('), 'Legacy lot creation RPC must no longer be client executable.');
assert.ok(privilegeHardening.includes('from public, anon'), 'Economics master-data RPC must explicitly revoke anonymous execution.');
assert.ok(privilegeHardening.includes('to authenticated'), 'Economics master-data RPC must explicitly grant authenticated execution after revocation.');

assert.ok(partialInventoryMigration.includes('total_eligible_units <= total_cases'), 'Physical production must never be lower than fundable capacity.');
assert.ok(partialInventoryMigration.includes('> v_lot.total_eligible_units'), 'Order/allocation capacity checks must enforce eligible cases.');
assert.ok(partialInventoryMigration.includes('v_allocated <> v_lot.total_eligible_units'), 'FUNDED transition must require only eligible cases to be allocated.');
assert.ok(partialInventoryMigration.includes("'total_eligible_units', v_eligible"), 'Lot creation audit must preserve the eligible-case snapshot.');

console.log('Investment economics invariants: PASS');
