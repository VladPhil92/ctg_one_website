import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [migration, rpcExposureMigration, checkoutRepository, checkout, schemaVersion] = await Promise.all([
  readFile('supabase/migrations/0068_investment_agreement_acceptance.sql', 'utf8'),
  readFile('supabase/migrations/20260828112817_0074_revoke_anonymous_sensitive_rpc_execution.sql', 'utf8'),
  readFile('src/modules/investment/checkout/browser-repository.ts', 'utf8'),
  readFile('src/components/inversion/InvestmentCheckoutClient.tsx', 'utf8'),
  readFile('src/lib/observability/schema-version.ts', 'utf8'),
]);

// The RPC exists, is idempotent (never overwrites an existing timestamp),
// audit-logs itself, and is locked down to authenticated callers only.
assert.match(migration, /create or replace function public\.accept_investment_agreement\(\)/, 'accept_investment_agreement() must be defined');
assert.match(migration, /agreement_accepted_at is null/i, 'Acceptance must only be set once — never overwritten');
assert.match(migration, /'accept_investment_agreement'/, 'Acceptance must be audit-logged');
assert.match(rpcExposureMigration, /revoke all on function public\.accept_investment_agreement\(\)\s+from public, anon/, 'accept_investment_agreement() must explicitly deny PUBLIC/anon execution');
assert.match(rpcExposureMigration, /grant execute on function public\.accept_investment_agreement\(\)\s+to authenticated, service_role/, 'accept_investment_agreement() must preserve signed-in/server execution');

// create_investment_order() must actually enforce the gate server-side —
// a client-only checkbox is not authorization.
assert.match(migration, /select kyc_status, agreement_accepted_at into v_kyc, v_agreement_accepted_at/, 'Order creation must read agreement_accepted_at alongside kyc_status');
assert.match(migration, /if v_agreement_accepted_at is null then raise exception 'investment agreement not accepted'/, 'Order creation must fail closed when the agreement has not been accepted');

// The browser repository — not the component — owns the RPC boundary.
assert.match(checkoutRepository, /export async function acceptInvestmentAgreement/, 'Browser repository must own the acceptance RPC call');
assert.match(checkoutRepository, /rpc\('accept_investment_agreement'\)/, 'Browser repository must call the real RPC');

assert.ok(checkout.includes('acceptInvestmentAgreement'), 'Checkout UI must call acceptance through the repository boundary');
assert.ok(!checkout.includes(".rpc('accept_investment_agreement'"), 'Checkout UI must not call the acceptance RPC directly');
assert.ok(checkout.includes('/inversion/legal'), 'Checkout UI must link to the actual legal terms, not just assert understanding');
assert.match(checkout, /profile\?\.agreement_accepted_at/, 'Checkout UI must skip re-accepting when the participant already has an accepted agreement on file');

assert.ok(
  Number(schemaVersion.match(/EXPECTED_DATABASE_MIGRATION_COUNT = (\d+)/)?.[1] ?? 0) >= 74,
  'Runtime expected migration must include anonymous sensitive-RPC hardening through 0074.',
);

// Every clean-database CI fixture that calls create_investment_order
// expecting success must give its participant an accepted agreement —
// otherwise the agreement gate breaks those scripts for an unrelated reason.
const [goldenPathSmoke, operationalJourney, reinvestmentSmoke] = await Promise.all([
  readFile('scripts/golden-path-transactional-smoke.sql', 'utf8'),
  readFile('scripts/investment-operational-golden-journey.sql', 'utf8'),
  readFile('scripts/investment-reinvestment-schema-smoke.sql', 'utf8'),
]);

for (const [name, contents] of [
  ['golden-path-transactional-smoke.sql', goldenPathSmoke],
  ['investment-operational-golden-journey.sql', operationalJourney],
  ['investment-reinvestment-schema-smoke.sql', reinvestmentSmoke],
]) {
  assert.match(
    contents,
    /investment_participant_profiles\([^)]*agreement_accepted_at[^)]*\)/,
    `${name} must set agreement_accepted_at for participants that call create_investment_order`,
  );
}

console.log('Investment agreement acceptance and RPC exposure invariants: PASS');
