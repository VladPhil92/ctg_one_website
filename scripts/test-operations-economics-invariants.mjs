import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [page, lotConfig, beerStyleType] = await Promise.all([
  readFile('src/app/admin/operations/page.tsx', 'utf8'),
  readFile('src/lib/production/lot-config.ts', 'utf8'),
  readFile('src/types/beer-style.ts', 'utf8'),
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

console.log('Operations economics invariants: PASS');
