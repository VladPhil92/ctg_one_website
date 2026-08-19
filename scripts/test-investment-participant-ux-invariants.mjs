import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [
  app,
  appLayout,
  lotDetail,
  checkout,
  canonicalCheckout,
  resumePayment,
  legacyDashboard,
  legacyCheckout,
] = await Promise.all([
  read('src/app/inversion/app/page.tsx'),
  read('src/app/inversion/app/layout.tsx'),
  read('src/app/inversion/lotes/[slug]/page.tsx'),
  read('src/components/inversion/InvestmentCheckoutClient.tsx'),
  read('src/app/inversion/app/nueva/[slug]/page.tsx'),
  read('src/components/inversion/InvestmentResumePaymentClient.tsx'),
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
assert.match(
  app,
  /\?order=\$\{encodeURIComponent\(order\.id\)\}/,
  'Continue-payment CTA must bind the canonical checkout to the existing order ID.',
);

assert.match(lotDetail, /href={`\/inversion\/app\/nueva\//, 'Investable lot CTA must enter the canonical participant checkout.');
assert.match(lotDetail, /href="\/inversion\/app"/, 'Closed/non-investable lot CTA must return to the canonical participant app.');
assert.match(canonicalCheckout, /InvestmentCheckoutClient/, 'Canonical participant checkout must retain new-order composition.');
assert.match(canonicalCheckout, /InvestmentResumePaymentClient/, 'Canonical participant checkout must have a separate existing-order resume surface.');
assert.match(canonicalCheckout, /auth\.getUser\(\)/, 'Existing-order resume must authenticate on the server before reading the order.');
assert.match(canonicalCheckout, /\.eq\('participant_user_id', authData\.user\.id\)/, 'Existing-order resume must bind the order to the current participant in addition to RLS.');
assert.match(canonicalCheckout, /\.eq\('lot_id', lot\.id\)/, 'Existing-order resume must bind the resumed order to the selected lot.');
assert.match(canonicalCheckout, /existingOrder\.status !== 'AWAITING_PAYMENT'/, 'Only a payment-pending reservation may enter the proof-resume surface.');
assert.match(resumePayment, /uploadInvestmentPaymentProof/, 'Resume surface must upload evidence through the hardened payment-proof boundary.');
assert.doesNotMatch(resumePayment, /createInvestmentOrder/, 'Resume surface must never create a second investment order.');
assert.match(resumePayment, /No se creará una nueva reserva/, 'Resume UI must tell the participant that the existing reservation is reused.');

assert.match(checkout, /next=\/inversion\/app\/nueva\//, 'New-order checkout login continuation must remain inside the canonical investment app.');
assert.match(checkout, /href="\/inversion\/app"/, 'Post-proof continuation must return to the canonical participant app.');
assert.doesNotMatch(checkout, /\/dashboard\/inversion/, 'Checkout client must not route new participant flows through the legacy dashboard namespace.');

assert.match(legacyDashboard, /redirect\('\/inversion\/app'\)/, 'Legacy participant dashboard must remain a compatibility redirect.');
assert.match(legacyCheckout, /redirect\(`\/inversion\/app\/nueva\//, 'Legacy checkout URLs must redirect to the canonical checkout.');
assert.match(appLayout, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false/, 'Authenticated participant surfaces must be noindex/nofollow.');

console.log('Investment participant UX invariants: PASS');
