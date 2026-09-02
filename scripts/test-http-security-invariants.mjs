import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [nextConfig, migration, knowledgeRoute, paymentProofRoute] = await Promise.all([
  readFile('next.config.js', 'utf8'),
  readFile('supabase/migrations/0049_api_rate_limits.sql', 'utf8'),
  readFile('src/app/api/knowledge/query/route.ts', 'utf8'),
  readFile('src/app/api/investment/orders/[orderId]/payment-proof/route.ts', 'utf8'),
]);

for (const directive of [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  'Content-Security-Policy',
]) {
  assert.ok(nextConfig.includes(directive), `CSP must include ${directive}`);
}

assert.ok(
  nextConfig.includes("isProduction ? '' : \" 'unsafe-eval'\""),
  'unsafe-eval must remain development-only',
);
assert.ok(nextConfig.includes('NEXT_PUBLIC_SUPABASE_URL'), 'CSP must consider the configured Supabase origin');
assert.ok(nextConfig.includes("url.protocol === 'https:' ? 'wss:' : 'ws:'"), 'CSP must derive the matching Supabase websocket origin');

assert.match(migration, /alter table public\.api_rate_limit_windows enable row level security;/i);
assert.match(migration, /revoke all on table public\.api_rate_limit_windows from public, anon, authenticated;/i);
assert.match(migration, /when 'knowledge\.query' then/i);
assert.match(migration, /when 'investment\.payment-proof' then/i);
assert.match(migration, /raise exception 'unsupported rate-limit scope';/i);
assert.match(migration, /on conflict \(user_id, scope\) do nothing;/i);
assert.match(migration, /select \* into v_row[\s\S]*for update;/i);
assert.match(migration, /grant execute on function public\.consume_api_rate_limit\(text\) to authenticated, service_role;/i);

assert.ok(knowledgeRoute.includes("consumeAuthenticatedRateLimit(supabase, 'knowledge.query')"));
assert.ok(knowledgeRoute.includes("status: 429"));
assert.ok(knowledgeRoute.includes("'Retry-After'"));

assert.ok(paymentProofRoute.includes("consumeAuthenticatedRateLimit(participantClient, 'investment.payment-proof')"));
assert.ok(paymentProofRoute.includes("status: 429"));
assert.ok(paymentProofRoute.indexOf('consumeAuthenticatedRateLimit') < paymentProofRoute.indexOf('readBoundedBody(request)'),
  'Payment proof rate limiting must happen before reading the upload body');

console.log('HTTP security invariants: PASS');

await import('./test-trusted-admin-server-boundary-invariants.mjs');
