import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [component, browserRepository, domain] = await Promise.all([
  readFile('src/components/inversion/InvestmentCheckoutClient.tsx', 'utf8'),
  readFile('src/modules/investment/checkout/browser-repository.ts', 'utf8'),
  readFile('src/modules/investment/checkout/domain.ts', 'utf8'),
]);

assert.ok(
  component.includes("from '@/modules/investment/checkout/browser-repository'"),
  'Checkout UI must delegate browser I/O to the checkout repository',
);
assert.ok(
  component.includes("from '@/modules/investment/checkout/domain'"),
  'Checkout UI must delegate pure calculations to the checkout domain module',
);
for (const helper of [
  'createInvestmentOrder',
  'uploadInvestmentPaymentProof',
  'clampInvestmentCases',
  'getCapitalPerCase',
  'getProjectedLotCapacityPercent',
]) {
  assert.ok(component.includes(helper), `Checkout UI must use ${helper}`);
}

assert.ok(!component.includes("@/lib/supabase/client"), 'Checkout UI must not construct Supabase clients directly');
assert.ok(!component.includes(".rpc('create_investment_order'"), 'Checkout UI must not call the order RPC directly');
assert.ok(!component.includes('/payment-proof`, {'), 'Checkout UI must not perform payment-proof HTTP I/O directly');

assert.ok(browserRepository.includes("@/lib/supabase/client"), 'Browser repository must own the Supabase browser client dependency');
assert.ok(browserRepository.includes(".rpc('create_investment_order'"), 'Browser repository must own order creation RPC I/O');
assert.ok(browserRepository.includes('/payment-proof`'), 'Browser repository must own payment-proof HTTP I/O');

for (const helper of [
  'getCapitalPerCase',
  'clampInvestmentCases',
  'getProjectedLotCapacityPercent',
]) {
  assert.ok(domain.includes(`function ${helper}`), `Domain module must define ${helper}`);
}
assert.ok(!domain.includes('supabase'), 'Checkout domain module must remain independent of Supabase');
assert.ok(!domain.includes('fetch('), 'Checkout domain module must remain free of HTTP I/O');

console.log('Investment checkout boundary invariants: PASS');
