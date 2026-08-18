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

const [page, lotConfig, beerStyleType, files] = await Promise.all([
  readFile('src/app/admin/operations/page.tsx', 'utf8'),
  readFile('src/lib/production/lot-config.ts', 'utf8'),
  readFile('src/types/beer-style.ts', 'utf8'),
  sourceFiles('src'),
]);

assert.ok(
  page.includes('standard_transport_cost_unit_cents'),
  'Operations admin must load transport economics from Beer Style Master Data.',
);
assert.ok(
  page.includes('p_transport_cost_unit_cents'),
  'Operations admin must call the transport-aware economics RPC signature.',
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

for (const file of files) {
  const source = await readFile(file, 'utf8');
  if (source.includes("rpc('create_production_lot_from_style'")) {
    assert.ok(
      source.includes('p_transport_cost_unit_cents'),
      `${file} calls create_production_lot_from_style without explicit transport economics.`,
    );
    assert.ok(
      source.includes('p_total_eligible_units'),
      `${file} calls create_production_lot_from_style without an explicit eligible perimeter.`,
    );
  }
  if (source.includes("rpc('update_investment_beer_style_economics'")) {
    assert.ok(
      source.includes('p_transport_cost_unit_cents'),
      `${file} calls update_investment_beer_style_economics without explicit transport economics.`,
    );
  }
}

console.log('Operations economics invariants: PASS');
