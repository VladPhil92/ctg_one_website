import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/0048_investment_order_idempotency.sql', 'utf8');
const checkout = readFileSync('src/components/inversion/InvestmentCheckoutClient.tsx', 'utf8');
const checkoutRepository = readFileSync('src/modules/investment/checkout/browser-repository.ts', 'utf8');
const checkoutDomain = readFileSync('src/modules/investment/checkout/domain.ts', 'utf8');

assert.match(migration, /client_idempotency_key text/i, 'Orders must persist a client idempotency key');
assert.match(migration, /create unique index[\s\S]*participant_user_id, client_idempotency_key/i, 'Participant idempotency keys must be unique');
assert.match(migration, /pg_advisory_xact_lock/i, 'Concurrent duplicate order attempts must serialize');
assert.match(migration, /idempotency key already used with different order payload/i, 'A reused key with different intent must fail closed');
assert.match(migration, /return v_order;[\s\S]*select kyc_status/i, 'An exact replay must return the previously created order before reserving capacity again');
assert.match(migration, /revoke execute on function public\.create_investment_order\(uuid, integer\) from public, anon, authenticated/i, 'The non-idempotent legacy RPC must not remain browser-callable');
assert.match(migration, /transport_cost_unit_cents/i, 'Authoritative capital must continue to include transport');

assert.match(checkout, /useRef<string \| null>\(null\)/, 'The checkout must preserve one retry key for the intended order');
assert.match(checkout, /crypto\.randomUUID\(\)/, 'The checkout must generate an opaque idempotency key client-side');
assert.match(checkout, /orderIdempotencyKey\.current = idempotencyKey/, 'The checkout must retain the generated key across retries');
assert.match(checkout, /createInvestmentOrder\(\{[\s\S]*idempotencyKey,[\s\S]*\}\)/, 'The checkout must pass the stable retry key through the repository boundary');

assert.match(checkoutRepository, /p_idempotency_key:\s*input\.idempotencyKey/, 'The browser repository must map the client idempotency key to PostgreSQL');
assert.match(checkoutRepository, /rpc\('create_investment_order'/, 'The browser repository must own the idempotent order RPC boundary');

assert.match(checkout, /getCapitalPerCase\(lot\)/, 'The checkout must derive its estimate through the pure domain boundary');
assert.match(checkoutDomain, /transport_cost_unit_cents/, 'The pre-order domain estimate must include transport just like the authoritative database calculation');

console.log('order idempotency invariants: ok');
