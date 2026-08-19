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
] = await Promise.all([
  read('src/lib/pagination.ts'),
  read('src/app/admin/usuarios/page.tsx'),
  read('src/app/admin/kyc/page.tsx'),
  read('src/app/inversion/admin/orders/page.tsx'),
  read('src/modules/investment/admin-orders/browser-repository.ts'),
  read('src/app/admin/operations/returns/page.tsx'),
  read('src/modules/operations/returns/browser-repository.ts'),
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

assert.doesNotMatch(returnsPage, /createClient\(/, 'Sales Returns UI must not execute direct Supabase queries.');
assert.match(returnsPage, /createSalesReturnsBrowserRepository/, 'Sales Returns UI must use the bounded repository boundary.');
assert.match(returnsPage, /ClientPagination/, 'Sales Returns confirmed-sale selector must be paginated.');
assert.match(returnsRepository, /from\('investment_sales'\)[\s\S]*?count:\s*'exact'[\s\S]*?\.range\(from, to\)/, 'Confirmed sales must be queried with total count and a bounded range.');
assert.match(returnsRepository, /\.order\('sold_at',[\s\S]*?\.order\('id'/, 'Sales pagination must be deterministic.');
assert.match(returnsRepository, /\.eq\('sale_id', saleId\)/, 'Sale child records must be scoped to the selected sale.');
assert.doesNotMatch(returnsRepository, /p_sale_id:\s*null/, 'Returns reconciliation must never scan every sale from the control panel.');
assert.match(returnsRepository, /MAX_ITEMS_PER_SALE_FOR_RETURN_UI/, 'Per-sale item hydration must have an explicit safety perimeter.');
assert.match(returnsRepository, /se niega a truncar silenciosamente/, 'Oversized sale detail must fail closed rather than silently lose returnable items.');

console.log('Admin and Sales OS pagination invariants: PASS');
