import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const migration = await read('supabase/migrations/0024_inventory_reconciliation.sql');
const hardening = await read('supabase/migrations/0025_inventory_reconciliation_hardening.sql');
const scanner = await read('src/app/admin/operations/scanner/page.tsx');
const inventoryPage = await read('src/app/admin/operations/inventory/page.tsx');
const adminNav = await read('src/components/admin/AdminNav.tsx');

assert.ok(
  migration.includes('create table if not exists public.investment_inventory_locations'),
  'Inventory must use a canonical location registry.',
);
assert.ok(
  migration.includes('current_location_id uuid'),
  'Bottle projection must retain a canonical location foreign key.',
);
assert.ok(
  migration.includes('from_location_id uuid') && migration.includes('to_location_id uuid'),
  'Inventory movements must retain canonical origin and destination locations.',
);
assert.ok(
  migration.includes('create table if not exists public.investment_inventory_movement_units'),
  'Every authoritative inventory movement must be linkable to physical bottle units.',
);
assert.ok(
  migration.includes('m.quantity_units <> coalesce(mu.linked_units,0)'),
  'Reconciliation must verify movement quantity equals linked physical units.',
);
assert.ok(
  migration.includes('inventory movement history is append-only'),
  'Physical inventory history must be immutable.',
);

assert.ok(
  migration.includes('drop policy if exists investment_inventory_movements_select'),
  'Legacy public inventory movement policy must be removed.',
);
assert.ok(
  migration.includes('revoke all on public.investment_inventory_movements from anon'),
  'Anonymous users must not retain direct inventory movement access.',
);
assert.ok(
  migration.includes('revoke insert, update, delete, truncate, references, trigger')
    && migration.includes('on public.investment_bottle_units from authenticated'),
  'Authenticated clients must not mutate bottle projection directly.',
);

assert.ok(
  migration.includes('illegal bottle state transition'),
  'Bottle status changes must enforce an explicit transition matrix.',
);
assert.ok(
  migration.includes('one or more requested bottle units do not belong to the lot'),
  'Physical updates must fail atomically instead of partially updating a serial batch.',
);
assert.ok(
  migration.includes('IN_MARKET requires a registered sales/partner location'),
  'Market receipt must require a registered destination.',
);

assert.ok(
  migration.includes('source_sale_id uuid'),
  'SOLD inventory movements must retain Sales OS genealogy.',
);
assert.ok(
  migration.includes("p_lot_id,'SOLD',v_location_id,v_location_id,v_bottle_ids,v_sale_id"),
  'Sales OS must write a unit-linked SOLD movement in the same transaction.',
);
assert.ok(
  migration.includes('sale location does not match the physical location of the bottle units'),
  'Sales must not silently relocate inventory.',
);
assert.ok(
  migration.includes('a sale document cannot span multiple physical inventory locations'),
  'One sale document must represent one physical source location.',
);

assert.ok(
  migration.includes('revoke execute on function public.record_inventory_movement'),
  'Legacy coarse inventory writer must not remain client executable.',
);
assert.ok(
  migration.includes('revoke execute on function public.record_bottle_sales'),
  'Legacy bottle sale writer must remain closed.',
);
assert.ok(
  scanner.includes("rpc('record_bottle_sale_document'"),
  'Bottle Scanner must use authoritative Sales OS.',
);
assert.ok(
  !scanner.includes("rpc('record_bottle_sales'"),
  'Bottle Scanner must never call the legacy sale RPC.',
);
assert.ok(
  scanner.includes('investment_inventory_locations'),
  'Bottle Scanner must select canonical registered locations.',
);

assert.ok(
  hardening.includes('from unnest(p_bottle_ids) as u(id)'),
  'Inventory helper must normalize UUID arrays using an explicit scalar alias.',
);
assert.ok(
  hardening.includes('system inventory location type cannot be changed'),
  'System inventory locations must preserve their semantic type.',
);
assert.ok(
  hardening.includes("v_type := upper(trim(p_location_type))"),
  'Location administration must normalize location type input.',
);

assert.ok(
  migration.includes('create or replace function public.get_inventory_location_stock'),
  'Inventory OS must expose a stock-by-location read model.',
);
assert.ok(
  migration.includes('create or replace function public.get_inventory_reconciliation'),
  'Inventory OS must expose a reconciliation read model.',
);
assert.ok(
  inventoryPage.includes("rpc('get_inventory_reconciliation'"),
  'Admin Inventory page must surface reconciliation results.',
);
assert.ok(
  inventoryPage.includes("rpc('upsert_inventory_location'"),
  'Inventory managers must have a governed location-management path.',
);
assert.ok(
  adminNav.includes("href: '/admin/operations/inventory'"),
  'Inventory Reconciliation must be reachable from Admin OS.',
);

console.log('Inventory reconciliation invariants: PASS');
