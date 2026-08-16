import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const flags = await read('src/lib/investment/flags.ts');
const payments = await read('src/lib/payment-instructions.ts');
const nextConfig = await read('next.config.js');
const health = await read('src/app/api/health/route.ts');
const render = await read('render.yaml');
const knowledgeProvider = await read('src/lib/ai/openai.ts');
const knowledgeQuery = await read('src/app/api/knowledge/query/route.ts');
const knowledgeIngest = await read('src/app/api/knowledge/admin/ingest/route.ts');
const knowledgeMigration = await read('supabase/migrations/0007_ctg_knowledge_v01.sql');
const supabaseMiddleware = await read('src/lib/supabase/middleware.ts');

const expectedFlags = [
  'CTG_INVESTMENT_PUBLIC_REGISTRATION_ENABLED',
  'CTG_INVESTMENT_PUBLIC_FUNDING_ENABLED',
  'CTG_INVESTMENT_PAYMENT_GATEWAY_ENABLED',
  'CTG_INVESTMENT_AUTOMATIC_SETTLEMENT_ENABLED',
  'CTG_INVESTMENT_AUTOMATIC_WITHDRAWALS_ENABLED',
  'CTG_INVESTMENT_KYC_PROVIDER_ENABLED',
  'CTG_INVESTMENT_WHATSAPP_NOTIFICATIONS_ENABLED',
];

assert.match(
  flags,
  /process\.env\[name\]\s*===\s*['"]true['"]/,
  'Investment feature flags must fail closed unless explicitly set to true.'
);

for (const name of expectedFlags) {
  assert.ok(flags.includes(name), `Missing required investment safety flag: ${name}`);
}

assert.ok(
  payments.includes("const PENDING = 'PENDING_CONFIGURATION'"),
  'Payment instructions must retain an explicit pending sentinel.'
);
assert.ok(
  payments.includes('PAYMENT_INSTRUCTIONS_CONFIGURED'),
  'Payment instructions must expose a derived fail-closed safety switch.'
);
assert.ok(
  payments.includes('.every(configured)'),
  'Payment channels must require every displayed value to be configured.'
);

for (const header of [
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
  'Permissions-Policy',
  'Cross-Origin-Opener-Policy',
]) {
  assert.ok(nextConfig.includes(header), `Missing baseline security header: ${header}`);
}

assert.ok(
  health.includes("'Cache-Control': 'no-store, max-age=0'"),
  'Health responses must not be cached.'
);
assert.ok(
  !health.includes('SUPABASE_SERVICE_ROLE_KEY'),
  'Health endpoint must never expose or inspect the Supabase service-role secret.'
);

assert.ok(render.includes('healthCheckPath: /api/health'), 'Render must use the application health endpoint.');
assert.ok(render.includes('autoDeployTrigger: checksPass'), 'Render must wait for repository checks before deployment.');
assert.ok(render.includes('buildCommand: npm ci && npm run build'), 'Render must perform a clean production build.');
assert.ok(render.includes('NEXT_PUBLIC_SITE_URL'), 'Render blueprint must define the canonical site URL.');
assert.ok(render.includes('https://ctgone.com'), 'Render blueprint must use ctgone.com as the canonical production URL.');
assert.ok(render.includes('SUPABASE_SERVICE_ROLE_KEY\n        sync: false'), 'Service-role secret must never be committed into the Render blueprint.');

// CTG Knowledge v0.1 safety contract.
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

console.log('Critical invariants: PASS');
