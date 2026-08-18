import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/0048_investment_order_idempotency.sql', 'utf8');
const checkout = readFileSync('src/components/inversion/InvestmentCheckoutClient.tsx', 'utf8');

assert.match(migration, /client_idempotency_key text/i, 'Orders must persist a client idempotency key');
assert.match(migration, /create unique index[\s\S]*participant_user_id, client_idempotency_key/i, 'Participant idempotency keys must be unique');
assert.match(migration, /pg_advisory_xact_lock/i, 'Concurrent duplicate order attempts must serialize');
assert.match(migration, /idempotency key already used with different order payload/i, 'A reused key with different intent must fail closed');
assert.match(migration, /return v_order;[\s\S]*select kyc_status/i, 'An exact replay must return the previously created order before reserving capacity again');
assert.match(migration, /revoke execute on function public\.create_investment_order\(uuid, integer\) from public, anon, authenticated/i, 'The non-idempotent legacy RPC must not remain browser-callable');
assert.match(migration, /transport_cost_unit_cents/i, 'Authoritative capital must continue to include transport');

assert.match(checkout, /useRef<string \| null>\(null\)/, 'The checkout must preserve one retry key for the intended order');
assert.match(checkout, /crypto\.randomUUID\(\)/, 'The checkout must generate an opaque idempotency key client-side');
assert.match(checkout, /p_idempotency_key:\s*idempotencyKey/, 'The checkout must send the idempotency key to PostgreSQL');
assert.match(checkout, /lot\.transport_cost_unit_cents/, 'The pre-order estimate must include transport just like the authoritative database calculation');

console.log('order idempotency invariants: ok');
