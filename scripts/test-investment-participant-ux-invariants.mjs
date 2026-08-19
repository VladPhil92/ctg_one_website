import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [
  app,
  appLayout,
  lotDetail,
  checkout,
  canonicalCheckout,
  legacyDashboard,
  legacyCheckout,
] = await Promise.all([
  read('src/app/inversion/app/page.tsx'),
  read('src/app/inversion/app/layout.tsx'),
  read('src/app/inversion/lotes/[slug]/page.tsx'),
  read('src/components/inversion/InvestmentCheckoutClient.tsx'),
  read('src/app/inversion/app/nueva/[slug]/page.tsx'),
  read('src/app/dashboard/inversion/page.tsx'),
  read('src/app/dashboard/inversion/nueva/[slug]/page.tsx'),
]);

assert.match(app, /useInvestmentOrders/, 'Canonical participant app must own order/tracking visibility.');
assert.match(app, /InvestmentTrackingChart/, 'Canonical participant app must expose allocated-lot tracking.');
assert.match(app, /InvestmentLiquidityPanel/, 'Canonical participant app must retain participant liquidity controls.');
assert.match(app, /useInvestmentProfile/, 'Canonical participant app must expose investment KYC state.');
assert.match(app, /case 'PENDING_BANK_VERIFICATION'/, 'Current human bank-verification state must have explicit participant guidance.');
for (const status of ['AWAITING_PAYMENT','PENDING_BANK_VERIFICATION','PAYMENT_SUBMITTED','PAYMENT_VERIFIED','ALLOCATED','REJECTED','CANCELLED','EXPIRED']) {
  assert.ok(app.includes(`case '${status}'`), `Participant order UX must explicitly explain ${status}.`);
}

assert.match(lotDetail, /href={`\/inversion\/app\/nueva\//, 'Investable lot CTA must enter the canonical participant checkout.');
assert.match(lotDetail, /href="\/inversion\/app"/, 'Closed/non-investable lot CTA must return to the canonical participant app.');
assert.match(canonicalCheckout, /InvestmentCheckoutClient/, 'Canonical participant checkout must use the hardened checkout client.');
assert.match(checkout, /next=\/inversion\/app\/nueva\//, 'Checkout login continuation must remain inside the canonical investment app.');
assert.match(checkout, /href="\/inversion\/app"/, 'Post-proof continuation must return to the canonical participant app.');
assert.doesNotMatch(checkout, /\/dashboard\/inversion/, 'Checkout client must not route new participant flows through the legacy dashboard namespace.');

assert.match(legacyDashboard, /redirect\('\/inversion\/app'\)/, 'Legacy participant dashboard must remain a compatibility redirect.');
assert.match(legacyCheckout, /redirect\(`\/inversion\/app\/nueva\//, 'Legacy checkout URLs must redirect to the canonical checkout.');
assert.match(appLayout, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false/, 'Authenticated participant surfaces must be noindex/nofollow.');

console.log('Investment participant UX invariants: PASS');
