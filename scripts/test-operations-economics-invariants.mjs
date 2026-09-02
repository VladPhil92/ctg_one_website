import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function sourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (/\.(?:ts|tsx|js|mjs)$/.test(entry.name)) files.push(path);
  }
  return files;
}

const repositoryPath = 'src/modules/operations/infrastructure/browser-repository.ts';
const trustedRoutePath = 'src/app/api/investment/admin/trusted-rpc/route.ts';
const [page, repository, trustedRoute, lotConfig, beerStyleType, files] = await Promise.all([
  readFile('src/app/admin/operations/page.tsx', 'utf8'),
  readFile(repositoryPath, 'utf8'),
  readFile(trustedRoutePath, 'utf8'),
  readFile('src/lib/production/lot-config.ts', 'utf8'),
  readFile('src/types/beer-style.ts', 'utf8'),
  sourceFiles('src'),
]);

assert.ok(
  repository.includes('standard_transport_cost_unit_cents'),
  'Operations repository must load transport economics from Beer Style Master Data.',
);
assert.ok(
  page.includes('p_transport_cost_unit_cents'),
  'Operations admin must compose transport-aware economics commands.',
);
assert.ok(
  page.includes('transportCostCop: transport ?? 0'),
  'Operations admin projections must include transport cost.',
);
assert.ok(
  page.includes('p_total_eligible_units: cases'),
  'New fully-funded lots must explicitly declare their eligible investment perimeter.',
);
assert.ok(
  page.includes('production + label + transport > 0'),
  'Operations economics validation must include transport in capital cost.',
);
assert.ok(
  lotConfig.includes('transportCostCop') && beerStyleType.includes('standard_transport_cost_unit_cents'),
  'Shared economics helpers and Beer Style types must retain transport as a first-class field.',
);

assert.ok(page.includes('createOperationsBrowserRepository'), 'Operations page must consume the repository boundary.');
assert.ok(!page.includes("from('@/lib/supabase/client')") && !page.includes("@/lib/supabase/client"),
  'Operations page must not instantiate the Supabase browser client directly.');
assert.ok(!page.includes('.from('), 'Operations page must not issue table queries directly.');
assert.ok(!page.includes('.rpc('), 'Operations page must not invoke RPCs directly.');

for (const file of files) {
  const source = await readFile(file, 'utf8');
  if (file !== trustedRoutePath && source.includes("rpc('create_production_lot_from_style'")) {
    assert.fail(`${file} bypasses the trusted admin server boundary for lot creation.`);
  }
  if (file !== trustedRoutePath && source.includes("rpc('update_investment_beer_style_economics'")) {
    assert.fail(`${file} bypasses the trusted admin server boundary for beer-style economics.`);
  }
}

assert.ok(
  repository.includes("callTrustedAdminRpc('production.createLotFromStyle'"),
  'Operations repository must route lot creation through the trusted server boundary.',
);
assert.ok(
  repository.includes("callTrustedAdminRpc('production.updateStyleEconomics'"),
  'Operations repository must route economics updates through the trusted server boundary.',
);
assert.ok(trustedRoute.includes("'create_production_lot_from_style'"), 'Trusted server boundary must own the authoritative lot RPC mapping.');
assert.ok(trustedRoute.includes("'update_investment_beer_style_economics'"), 'Trusted server boundary must own the authoritative economics RPC mapping.');

for (const rpc of [
  'transition_lot_status',
  'generate_bottle_units',
  'update_bottle_units_status',
  'record_bottle_sale_document',
  'record_lot_financial_entry',
]) {
  assert.ok(repository.includes(`rpc('${rpc}'`), `Operations repository must own RPC ${rpc}.`);
}

console.log('Operations economics and infrastructure invariants: PASS');
