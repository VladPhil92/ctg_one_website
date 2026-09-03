import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const [
  pagination,
  usersPage,
  kycPage,
  ordersPage,
  ordersRepository,
  returnsPage,
  returnsRepository,
  operationsPage,
  operationsRepository,
  operationsInventoryMigration,
] = await Promise.all([
  read('src/lib/pagination.ts'),
  read('src/app/admin/usuarios/page.tsx'),
  read('src/app/admin/kyc/page.tsx'),
  read('src/app/inversion/admin/orders/page.tsx'),
  read('src/modules/investment/admin-orders/browser-repository.ts'),
  read('src/app/admin/operations/returns/page.tsx'),
  read('src/modules/operations/returns/browser-repository.ts'),
  read('src/app/admin/operations/page.tsx'),
  read('src/modules/operations/infrastructure/browser-repository.ts'),
  read('supabase/migrations/0062_production_os_bounded_inventory_read.sql'),
]);

assert.match(pagination, /ADMIN_PAGE_SIZE\s*=\s*25/, 'Admin queues must use a bounded default page size.');
assert.match(pagination, /SALES_PAGE_SIZE\s*=\s*20/, 'Sales OS must use a bounded default page size.');
assert.match(pagination, /MAX_PAGE_SIZE\s*=\s*100/, 'Shared pagination must enforce a hard upper bound.');
assert.match(pagination, /pageSize > MAX_PAGE_SIZE/, 'Pagination range generation must reject oversized pages.');

for (const [name, source] of [
  ['users', usersPage],
  ['kyc', kycPage],
]) {
  assert.match(source, /count:\s*'exact'/, `${name} server query must expose exact total count.`);
  assert.match(source, /\.range\(from, to\)/, `${name} server query must use a bounded PostgREST range.`);
  assert.match(source, /\.order\('created_at'/, `${name} query must define a primary stable order.`);
  assert.match(source, /\.order\('id'/, `${name} query must add a deterministic tie-breaker.`);
  assert.match(source, /ServerPagination/, `${name} page must expose navigable pagination.`);
}

assert.match(kycPage, /\.in\('id', userIds\)/, 'KYC profiles must be loaded only for the visible page actors.');
assert.match(kycPage, /\.in\('submission_id', submissionIds\)/, 'KYC documents must be loaded only for visible submissions.');
assert.doesNotMatch(kycPage, /\.from\('kyc_documents'\)[\s\S]*?\.order\(/, 'KYC must not scan the global document collection.');

assert.doesNotMatch(ordersPage, /createClient\(/, 'Investment order admin UI must not regain direct Supabase I/O.');
assert.match(ordersPage, /createInvestmentAdminOrdersRepository/, 'Investment order admin UI must use its repository boundary.');
assert.match(ordersPage, /ClientPagination/, 'Investment verification queue must expose client pagination.');
assert.match(ordersRepository, /count:\s*'exact'/, 'Investment order repository must return an exact queue count.');
assert.match(ordersRepository, /\.range\(from, to\)/, 'Investment order repository must issue a bounded range query.');
assert.match(ordersRepository, /\.order\('created_at',[\s\S]*?\.order\('id'/, 'Investment order pagination must have deterministic ordering.');
assert.doesNotMatch(
  ordersRepository,
  /createInvestmentAdminOrdersRepository\(\)\s*\{\s*const supabase = createClient\(\)/,
  'Investment admin repository construction must remain build-safe and defer Supabase client creation until a browser operation executes.',
);
assert.match(
  ordersRepository,
  /async listPending[\s\S]*?const supabase = createClient\(\)/,
  'Investment admin repository must create its browser client lazily inside operations.',
);

assert.doesNotMatch(returnsPage, /createClient\(/, 'Sales Returns UI must not execute direct Supabase queries.');
assert.match(returnsPage, /createSalesReturnsBrowserRepository/, 'Sales Returns UI must use the bounded repository boundary.');
assert.match(returnsPage, /ClientPagination/, 'Sales Returns confirmed-sale selector must be paginated.');
assert.match(returnsRepository, /from\('investment_sales'\)[\s\S]*?count:\s*'exact'[\s\S]*?\.range\(from, to\)/, 'Confirmed sales must be queried with total count and a bounded range.');
assert.match(returnsRepository, /\.order\('sold_at',[\s\S]*?\.order\('id'/, 'Sales pagination must be deterministic.');
assert.match(returnsRepository, /\.eq\('sale_id', saleId\)/, 'Sale child records must be scoped to the selected sale.');
assert.doesNotMatch(returnsRepository, /p_sale_id:\s*null/, 'Returns reconciliation must never scan every sale from the control panel.');
assert.match(returnsRepository, /MAX_ITEMS_PER_SALE_FOR_RETURN_UI/, 'Per-sale item hydration must have an explicit safety perimeter.');
assert.match(returnsRepository, /se niega a truncar silenciosamente/, 'Oversized sale detail must fail closed rather than silently lose returnable items.');
assert.doesNotMatch(
  returnsRepository,
  /createSalesReturnsBrowserRepository\(\)\s*\{\s*const supabase = createClient\(\)/,
  'Sales Returns repository construction must not require Supabase credentials during prerender/build.',
);
assert.match(
  returnsRepository,
  /async listConfirmedSales[\s\S]*?const supabase = createClient\(\)/,
  'Sales Returns repository must lazily create its browser client when data is requested.',
);
assert.match(
  returnsRepository,
  /let detailController:\s*AbortController \| null = null[\s\S]*?detailController\?\.abort\(\)/,
  'Selecting a new sale must abort any older detail request before it can overwrite the current selection.',
);
assert.ok(
  (returnsRepository.match(/\.abortSignal\(controller\.signal\)/g) ?? []).length >= 3
    && returnsRepository.includes("callTrustedAdminRpc<unknown>('sales.reconcileReturn', { p_sale_id: saleId }, controller.signal)"),
  'All selected-sale detail queries, including trusted reconciliation and credited items, must share the supersession AbortSignal.',
);
assert.match(
  returnsRepository,
  /if \(controller\.signal\.aborted\)[\s\S]*?AbortError/,
  'A superseded detail request must never return a stale payload to the UI.',
);

assert.doesNotMatch(operationsPage, /createClient\(/, 'Production OS UI must remain behind its browser repository.');
assert.match(operationsPage, /ClientPagination/, 'Production OS must expose bounded navigation for lot and serial registries.');
assert.ok(
  (operationsPage.match(/<ClientPagination/g) ?? []).length >= 2,
  'Production OS must paginate both the lot registry and the selected-lot serial registry.',
);
assert.match(operationsRepository, /async listLots\(page: number, pageSize: number\)[\s\S]*?count:\s*'exact'[\s\S]*?\.range\(from, to\)/, 'Production lot registry must use exact count plus bounded range.');
assert.match(operationsRepository, /\.order\('created_at',[\s\S]*?\.order\('id'/, 'Production lot pagination must use a deterministic tie-breaker.');
assert.doesNotMatch(operationsRepository, /\.limit\(250\)/, 'Production OS must never approximate lot-wide metrics from a 250-unit sample.');
assert.match(operationsRepository, /rpc\('get_production_lot_inventory_snapshot'/, 'Selected-lot inventory must use the exact bounded PostgreSQL read model.');
assert.match(operationsRepository, /p_unit_limit:\s*pageSize[\s\S]*?p_unit_offset:\s*from/, 'Unit registry must send a bounded page limit and offset to PostgreSQL.');
assert.doesNotMatch(
  operationsRepository,
  /createOperationsBrowserRepository\(\)\s*\{\s*const supabase = createClient\(\)/,
  'Production repository construction must remain build-safe and defer browser Supabase client creation.',
);
assert.match(operationsPage, /label="Serializadas" value=\{String\(bottleTotalCount\)\}/, 'Serialized metric must use the exact aggregate count, not visible rows.');
assert.match(operationsPage, /bottleCounts\.IN_MARKET/, 'In-market metric must use exact status aggregates.');
assert.match(operationsPage, /bottleCounts\.SOLD/, 'Sold metric must use exact status aggregates.');
assert.doesNotMatch(operationsPage, /label="Serializadas" value=\{String\(bottles\.length\)\}/, 'Visible unit rows must never define the serialized metric.');
assert.match(operationsPage, /inventoryRequestGeneration/, 'Production OS must guard selected-lot inventory from stale async responses.');

assert.match(operationsInventoryMigration, /create or replace function public\.get_production_lot_inventory_snapshot/, 'Migration 0062 must define the Production OS inventory read model.');
assert.match(operationsInventoryMigration, /has_investment_permission\('ops\.read'\)/, 'Production inventory snapshot must require ops.read.');
assert.match(operationsInventoryMigration, /p_unit_limit < 1 or p_unit_limit > 100/, 'Production inventory snapshot must enforce a hard row limit.');
assert.match(operationsInventoryMigration, /select b\.status, count\(\*\)::bigint as status_count[\s\S]*?group by b\.status/, 'Production inventory snapshot must count units per status before aggregation.');
assert.match(operationsInventoryMigration, /coalesce\(sum\(status_count\), 0\)::bigint as total_units/, 'Production inventory snapshot total must sum unit counts, not status groups.');
assert.match(operationsInventoryMigration, /jsonb_object_agg\(status, status_count order by status\)/, 'Production inventory snapshot must aggregate exact counts by physical state.');
assert.match(operationsInventoryMigration, /limit p_unit_limit[\s\S]*?offset p_unit_offset/, 'Production inventory snapshot must return only the requested unit page.');
assert.match(operationsInventoryMigration, /revoke all on function public\.get_production_lot_inventory_snapshot[\s\S]*?from public, anon/, 'Production inventory snapshot must not be callable by public or anon.');

console.log('Admin, Sales OS and Production OS pagination invariants: PASS');
