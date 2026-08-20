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
  accountSurface,
  accountDashboard,
  deposits,
  kyc,
] = await Promise.all([
  read('src/app/inversion/app/page.tsx'),
  read('src/app/inversion/app/layout.tsx'),
  read('src/app/inversion/lotes/[slug]/page.tsx'),
  read('src/components/inversion/InvestmentCheckoutClient.tsx'),
  read('src/app/inversion/app/nueva/[slug]/page.tsx'),
  read('src/components/inversion/InvestmentResumePaymentClient.tsx'),
  read('src/app/dashboard/inversion/page.tsx'),
  read('src/app/dashboard/inversion/nueva/[slug]/page.tsx'),
  read('src/components/dashboard/AccountSurface.tsx'),
  read('src/app/dashboard/page.tsx'),
  read('src/app/dashboard/depositos/page.tsx'),
  read('src/app/dashboard/kyc/page.tsx'),
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

// Personal OS account surface: keep account workflows visually coherent without
// weakening their existing financial or identity boundaries.
assert.match(accountDashboard, /PERSONAL OS/, 'Account dashboard must retain the Personal OS identity.');
assert.match(accountSurface, /Volver al Personal OS/, 'Secondary account workflows must expose a consistent return path.');
assert.match(accountSurface, /prefers-reduced-motion:reduce/, 'Shared account motion must honor reduced-motion preferences.');
assert.match(accountSurface, /accountHero/, 'Shared account workflows must retain the Personal OS command-surface hierarchy.');

for (const [name, source] of [['deposits', deposits], ['kyc', kyc]]) {
  assert.match(source, /AccountSurface/, `${name} must render through the shared Personal OS account surface.`);
  assert.doesNotMatch(source, /style=\{\{/, `${name} must not regress to isolated inline theme styling.`);
  assert.match(source, /type="submit"/, `${name} primary submission must use native form semantics.`);
  assert.match(source, /role="alert"/, `${name} must expose submission errors to assistive technology.`);
}

assert.match(deposits, /next=\/dashboard\/depositos/, 'Deposit auth continuation must return the user to the deposit workflow.');
assert.match(deposits, /PAYMENT_INSTRUCTIONS_CONFIGURED/, 'Deposit UI must retain the payment-rail configuration gate.');
assert.match(deposits, /profile\?\.kyc_status === 'verified'/, 'Deposit submission must remain gated by verified account KYC.');
assert.match(deposits, /\.from\('transactions'\)\.insert/, 'Deposit UI must retain the canonical transaction write path.');
assert.match(deposits, /aria-pressed=\{method === item\.value\}/, 'Deposit rail selection must expose pressed state semantics.');

assert.match(kyc, /next=\/dashboard\/kyc/, 'KYC auth continuation must return the user to the identity workflow.');
assert.match(kyc, /rpc\('begin_kyc_submission'/, 'KYC UI must initialize intake through the retry-safe RPC boundary.');
assert.match(kyc, /\.from\('kyc-documents'\)[\s\S]*?\.upload\(/, 'KYC UI must retain the private document upload boundary.');
assert.match(kyc, /rpc\('register_kyc_document'/, 'KYC document metadata must be registered through the resilient RPC boundary.');
assert.match(kyc, /rpc\('finalize_kyc_submission'/, 'KYC UI must finalize only through the transactional resilience boundary.');
assert.doesNotMatch(kyc, /\.from\('kyc_submissions'\)[\s\S]*?\.insert\(/, 'KYC UI must not regress to direct submission inserts.');
assert.doesNotMatch(kyc, /\.from\('kyc_documents'\)[\s\S]*?\.insert\(/, 'KYC UI must not regress to direct document metadata inserts.');
assert.match(kyc, /MAX_FILE_BYTES = 8 \* 1024 \* 1024/, 'KYC client file-size boundary must remain explicit.');

console.log('Investment participant and Personal OS UX invariants: PASS');
