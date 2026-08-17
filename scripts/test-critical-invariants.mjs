import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const flags = await read('src/lib/investment/flags.ts');
const payments = await read('src/lib/payment-instructions.ts');
const nextConfig = await read('next.config.js');
const health = await read('src/app/api/health/route.ts');
const render = await read('render.yaml');
const ci = await read('.github/workflows/ci.yml');
const packageJson = JSON.parse(await read('package.json'));
const knowledgeProvider = await read('src/lib/ai/openai.ts');
const knowledgeQuery = await read('src/app/api/knowledge/query/route.ts');
const knowledgeIngest = await read('src/app/api/knowledge/admin/ingest/route.ts');
const knowledgeMigration = await read('supabase/migrations/0007_ctg_knowledge_v01.sql');
const supabaseMiddleware = await read('src/lib/supabase/middleware.ts');
const adminNav = await read('src/components/admin/AdminNav.tsx');
const labelsPage = await read('src/app/admin/operations/labels/page.tsx');
const operationsPage = await read('src/app/admin/operations/page.tsx');
const beerMasterMigration = await read('supabase/migrations/0013_beer_style_master_and_lot_codes.sql');
const salesMigration = await read('supabase/migrations/0014_sales_os_foundation.sql');
const securityDefinerMigration = await read('supabase/migrations/0015_security_definer_execution_hardening.sql');
const systemHealthMigration = await read('supabase/migrations/0018_system_health_trigger_name_fix.sql');
const clientPrivilegeMigration = await read('supabase/migrations/0019_client_table_privilege_hardening.sql');
const investmentLotRoute = await read('src/app/inversion/lotes/[slug]/page.tsx');
const investmentCheckoutRoute = await read('src/app/dashboard/inversion/nueva/[slug]/page.tsx');
const bottleTraceRoute = await read('src/app/beer/[serial]/page.tsx');

const expectedFlags = [
  'CTG_INVESTMENT_PUBLIC_REGISTRATION_ENABLED',
  'CTG_INVESTMENT_PUBLIC_FUNDING_ENABLED',
  'CTG_INVESTMENT_PAYMENT_GATEWAY_ENABLED',
  'CTG_INVESTMENT_AUTOMATIC_SETTLEMENT_ENABLED',
  'CTG_INVESTMENT_AUTOMATIC_WITHDRAWALS_ENABLED',
  'CTG_INVESTMENT_KYC_PROVIDER_ENABLED',
  'CTG_INVESTMENT_WHATSAPP_NOTIFICATIONS_ENABLED',
];

assert.match(flags,/process\.env\[name\]\s*===\s*['"]true['"]/, 'Investment feature flags must fail closed unless explicitly set to true.');
for (const name of expectedFlags) assert.ok(flags.includes(name), `Missing required investment safety flag: ${name}`);

assert.ok(payments.includes("const PENDING = 'PENDING_CONFIGURATION'"), 'Payment instructions must retain an explicit pending sentinel.');
assert.ok(payments.includes('PAYMENT_INSTRUCTIONS_CONFIGURED'), 'Payment instructions must expose a derived fail-closed safety switch.');
assert.ok(payments.includes('.every(configured)'), 'Payment channels must require every displayed value to be configured.');

for (const header of ['X-Content-Type-Options','X-Frame-Options','Referrer-Policy','Permissions-Policy','Cross-Origin-Opener-Policy']) assert.ok(nextConfig.includes(header), `Missing baseline security header: ${header}`);

assert.ok(health.includes("'Cache-Control': 'no-store, max-age=0'"), 'Health responses must not be cached.');
assert.ok(!health.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Health endpoint must never expose or inspect the Supabase service-role secret.');
assert.ok(render.includes('healthCheckPath: /api/health'), 'Render must use the application health endpoint.');
assert.ok(render.includes('autoDeployTrigger: checksPass'), 'Render must wait for repository checks before deployment.');
assert.ok(render.includes('buildCommand: npm ci && npm run build'), 'Render must perform a clean production build.');
assert.ok(render.includes('NEXT_PUBLIC_SITE_URL'), 'Render blueprint must define the canonical site URL.');
assert.ok(render.includes('https://ctgone.com'), 'Render blueprint must use ctgone.com as the canonical production URL.');
assert.ok(render.includes('SUPABASE_SERVICE_ROLE_KEY\n        sync: false'), 'Service-role secret must never be committed into the Render blueprint.');
assert.ok(render.includes('value: "22.22.0"'), 'Render must pin the approved production Node runtime.');
assert.ok(ci.includes('node-version: 22.22.0'), 'CI must use the same Node runtime as production.');
assert.equal(packageJson.engines?.node, '>=22.22.0 <23.0.0', 'package.json must constrain Node to the approved production major.');

// Next.js 16 removed synchronous access to dynamic route params. These three
// business-critical dynamic pages must keep params promise-based and awaited.
for (const [name, source] of [
  ['investment lot detail', investmentLotRoute],
  ['investment checkout', investmentCheckoutRoute],
  ['public bottle trace', bottleTraceRoute],
]) {
  assert.ok(source.includes('Promise<{'), `${name} must type dynamic params as a Promise in Next.js 16.`);
  assert.ok(source.includes('await params'), `${name} must await dynamic params before accessing route values.`);
  assert.ok(!/params\.(slug|serial)/.test(source), `${name} must not access params synchronously in Next.js 16.`);
}
assert.ok(investmentLotRoute.includes('generateMetadata'), 'Investment lot detail must retain dynamic metadata generation.');
assert.ok(investmentLotRoute.match(/generateMetadata[\s\S]*await params/), 'generateMetadata must await params in Next.js 16.');

assert.ok(render.includes('OPENAI_API_KEY\n        sync: false'), 'OpenAI API key must remain an external Render secret.');
assert.ok(!render.includes('NEXT_PUBLIC_OPENAI'), 'OpenAI credentials must never be exposed through NEXT_PUBLIC variables.');
assert.ok(knowledgeProvider.includes("import 'server-only'"), 'AI provider must be server-only.');
assert.ok(knowledgeProvider.includes('store: false'), 'Responses API calls must disable response storage for CTG Knowledge.');
assert.ok(!knowledgeProvider.includes('NEXT_PUBLIC_OPENAI'), 'AI provider must not read browser-exposed OpenAI variables.');
assert.ok(knowledgeQuery.includes('supabase.auth.getUser()'), 'Knowledge retrieval must authenticate the caller server-side.');
assert.ok(knowledgeQuery.includes("rpc('match_knowledge_chunks'"), 'Knowledge retrieval must use the permission-aware similarity RPC.');
assert.ok(knowledgeIngest.includes("rpc('is_admin'"), 'Knowledge ingestion must independently verify admin authorization.');
assert.ok(knowledgeMigration.includes('enable row level security'), 'Knowledge tables must have RLS enabled.');
assert.ok(knowledgeMigration.includes('security invoker'), 'Knowledge similarity search must retain caller RLS through SECURITY INVOKER.');
assert.ok(knowledgeMigration.includes("classification in ('internal')"), 'v0.1 corpus classification must remain deliberately narrow.');
assert.ok(supabaseMiddleware.includes("pathname.startsWith('/knowledge')"), 'Knowledge UI must be gated by the authenticated middleware path.');

for (const role of ['SUPER_ADMIN','FINANCE_ADMIN','PRODUCTION_MANAGER','INVENTORY_MANAGER','SALES_MANAGER','AUDITOR']) {
  assert.ok(supabaseMiddleware.includes(role), `Middleware must recognize investment role ${role}.`);
  assert.ok(adminNav.includes(role), `Admin navigation must recognize investment role ${role}.`);
}
assert.ok(supabaseMiddleware.includes("prefix:'/admin/operations/settlement'"), 'Settlement route must have a dedicated role gate.');
assert.ok(supabaseMiddleware.includes("roles:['SUPER_ADMIN','FINANCE_ADMIN']"), 'Settlement must remain restricted to finance authority.');
assert.ok(labelsPage.includes('/beer/'), 'Label factory QR payload must point only to public bottle trace routes.');
assert.ok(!labelsPage.includes('participant_user_id'), 'Printed labels must never contain participant identity.');
assert.ok(!labelsPage.includes('capital_committed'), 'Printed labels must never contain participant financial data.');

for (const code of ['GOLD','IRA','POR','HEF']) assert.ok(beerMasterMigration.includes(`('${code}'`), `Beer master migration must retain canonical style ${code}.`);
assert.ok(beerMasterMigration.includes('pg_advisory_xact_lock'), 'Lot-code allocation must retain transaction-level serialization.');
assert.ok(beerMasterMigration.includes("has_investment_permission('production.manage')"), 'Authoritative lot creation must revalidate production authorization.');
assert.ok(operationsPage.includes("from('investment_beer_styles')"), 'Production OS must read beer styles from master data.');
assert.ok(operationsPage.includes("rpc('create_production_lot_from_style'"), 'Production OS must create lots through the database-authoritative RPC.');
assert.ok(!operationsPage.includes('const BEER_STYLES = ['), 'Production OS must not reintroduce a hard-coded beer-style catalog.');
assert.ok(!operationsPage.includes("rpc('create_production_lot', payload)"), 'Production OS must not use the legacy frontend-code lot creation path.');

// Sales OS must preserve one commercial document per idempotency key and one sale item per bottle.
for (const table of ['investment_sales_channels','investment_sales','investment_sale_items']) assert.ok(salesMigration.includes(`public.${table}`), `Sales OS migration must include ${table}.`);
assert.ok(salesMigration.includes('idempotency_key text not null unique'), 'Sales OS must prevent duplicate commercial operations through an idempotency key.');
assert.ok(salesMigration.includes('bottle_unit_id uuid not null unique'), 'A physical bottle must not be attached to multiple sale items.');
assert.ok(salesMigration.includes("has_investment_permission('sales.manage')"), 'Sales write path must revalidate sales.manage in PostgreSQL.');
assert.ok(salesMigration.includes("values (p_lot_id, 'SOLD', v_count, auth.uid())"), 'Confirmed sales must generate an inventory SOLD movement in the same transaction.');
assert.ok(salesMigration.includes("'REVENUE', v_gross"), 'Confirmed sales must recognize gross revenue in the lot financial facts.');
assert.ok(salesMigration.includes('p_tax_cents bigint default 0'), 'Tax recognition must remain explicit until a tax-inclusion policy is formally configured.');

// Privilege hardening must remain explicit and fail closed.
assert.ok(securityDefinerMigration.includes("REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon"), 'Privileged SECURITY DEFINER functions must not inherit anonymous execute access.');
assert.ok(securityDefinerMigration.includes("p.proname <> 'get_public_bottle_trace'"), 'The public bottle trace must remain the only intentional anonymous SECURITY DEFINER exception.');
assert.ok(securityDefinerMigration.includes('FROM authenticated'), 'Internal privileged helpers must explicitly revoke authenticated execution.');
assert.ok(systemHealthMigration.includes("'investment_allocation_permission_guard'"), 'System Health must verify the real allocation guard trigger name.');
assert.ok(systemHealthMigration.includes("'investment_settlement_permission_guard'"), 'System Health must verify the real settlement guard trigger name.');
assert.ok(clientPrivilegeMigration.includes('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'), 'Anonymous clients must not retain sensitive-table DML or DDL-adjacent privileges.');
assert.ok(clientPrivilegeMigration.includes('ALTER DEFAULT PRIVILEGES FOR ROLE postgres'), 'Future public tables must inherit the hardened client privilege baseline.');

console.log('Critical invariants: PASS');
