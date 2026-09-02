import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const fail = (message) => {
  throw new Error(`Trusted admin server boundary invariant failed: ${message}`);
};

const restrictedRpcNames = [
  'create_production_lot_from_style',
  'update_investment_beer_style_economics',
  'get_inventory_reconciliation',
  'get_investment_provider_reconciliation_health',
  'get_sales_return_reconciliation',
];

const browserFiles = [
  'src/modules/operations/infrastructure/browser-repository.ts',
  'src/app/admin/operations/inventory/page.tsx',
  'src/modules/operations/returns/browser-repository.ts',
  'src/app/admin/finance/reconciliation/page.tsx',
  'src/lib/investment/trusted-admin-rpc-client.ts',
];

for (const file of browserFiles) {
  const source = read(file);
  for (const rpc of restrictedRpcNames) {
    if (source.includes(rpc)) {
      fail(`${file} must not reference database RPC ${rpc} directly`);
    }
  }
}

const routePath = 'src/app/api/investment/admin/trusted-rpc/route.ts';
const route = read(routePath);
for (const rpc of restrictedRpcNames) {
  if (!route.includes(`'${rpc}'`)) {
    fail(`${routePath} is missing reviewed RPC mapping ${rpc}`);
  }
}

const operations = [
  'production.createLotFromStyle',
  'production.updateStyleEconomics',
  'inventory.reconcile',
  'finance.providerHealth',
  'sales.reconcileReturn',
];
for (const operation of operations) {
  if (!route.includes(`z.literal('${operation}')`) || !route.includes(`'${operation}'`)) {
    fail(`${routePath} is missing closed operation ${operation}`);
  }
}

if (!route.includes('createAuthenticatedRequestContext(request)')) {
  fail('trusted route must authenticate each request through createAuthenticatedRequestContext');
}
if (route.includes('createAdminClient') || route.includes('SUPABASE_SERVICE_ROLE_KEY')) {
  fail('trusted route must preserve user identity and must not use service-role execution');
}
if (!route.includes("return NextResponse.json({ error: 'authentication required' }, { status: 401 })")) {
  fail('trusted route must fail closed when no authenticated user is resolved');
}
if (!route.includes("normalized.includes('not authorized')") || !route.includes('status =')) {
  fail('trusted route must preserve explicit authorization failure handling');
}

const clientPath = 'src/lib/investment/trusted-admin-rpc-client.ts';
const client = read(clientPath);
if (!client.includes("fetch('/api/investment/admin/trusted-rpc'")) {
  fail('browser helper must use the canonical trusted admin endpoint');
}
for (const operation of operations) {
  if (!client.includes(`'${operation}'`)) {
    fail(`${clientPath} is missing symbolic operation ${operation}`);
  }
}

console.log('Trusted admin server boundary invariants: PASS');
