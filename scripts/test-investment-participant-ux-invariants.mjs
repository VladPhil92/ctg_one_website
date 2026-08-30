import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
  paymentInstructions,
  paymentQrData,
  paymentQrRoute,
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
  read('src/lib/payment-instructions.ts'),
  read('src/lib/investment/payment-qr.ts'),
  read('src/app/api/investment/payment-qr/route.ts'),
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

assert.match(
  paymentInstructions,
  /\/api\/investment\/payment-qr/,
  'Investment checkout must use the approved first-party Bancolombia/Bre-B QR route.',
);
assert.doesNotMatch(
  paymentInstructions,
  /NEXT_PUBLIC_INVESTMENT_BANCOLOMBIA_QR_URL/,
  'Approved investment QR must not depend on an external runtime image URL.',
);
const matrixBase64 = paymentQrData.match(/INVESTMENT_PAYMENT_QR_MATRIX_BASE64\s*=\s*\n\s*'([^']+)'/)?.[1];
assert.ok(matrixBase64, 'Approved payment QR matrix data must remain present.');
const packedQrMatrix = Buffer.from(matrixBase64, 'base64');
assert.equal(packedQrMatrix.length, 742, 'Approved payment QR matrix must remain the reviewed 77x77 packed symbol.');
assert.equal(
  createHash('sha256').update(packedQrMatrix).digest('hex'),
  '447f15c1e5ef09a32f34fc4b1a7ed948d071037868fc299514f03b64dda4857f',
  'Approved Bancolombia/Bre-B QR module matrix changed unexpectedly.',
);
assert.match(paymentQrData, /INVESTMENT_PAYMENT_QR_SIZE = 77/, 'Approved payment QR must remain QR version 15.');
assert.match(paymentQrRoute, /INVESTMENT_PAYMENT_QR_MATRIX_BASE64/, 'Payment QR route must render from the reviewed matrix data.');
assert.match(paymentQrRoute, /image\/svg\+xml/, 'Payment QR route must serve a crisp scanner-safe SVG.');
assert.match(paymentQrRoute, /max-age=31536000, immutable/, 'Approved payment QR should be immutably cacheable.');
assert.match(checkout, /INVESTMENT_BANK_TRANSFER_INSTRUCTIONS\.qrImageUrl/, 'New-order checkout must render the approved payment QR.');
assert.match(resumePayment, /INVESTMENT_BANK_TRANSFER_INSTRUCTIONS\.qrImageUrl/, 'Resume-payment checkout must render the approved payment QR.');

assert.match(legacyDashboard, /redirect\('\/inversion\/app'\)/, 'Legacy participant dashboard must remain a compatibility redirect.');
assert.match(legacyCheckout, /redirect\(`\/inversion\/app\/nueva\//, 'Legacy checkout URLs must redirect to the canonical checkout.');
assert.match(appLayout, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false/, 'Authenticated participant surfaces must be noindex/nofollow.');

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
assert.match(deposits, /WALLET_MANUAL_COP_TOPUP_CONFIGURED/, 'Deposit UI must retain the dedicated manual COP rail configuration gate.');
assert.match(deposits, /profile\?\.kyc_status === 'verified'/, 'Deposit submission must remain gated by verified account KYC.');
assert.match(deposits, /fetch\('\/api\/wallet\/deposits'/, 'Deposit UI must submit evidence through the canonical server trust boundary.');
assert.doesNotMatch(deposits, /\.from\('transactions'\)[\s\S]*?\.insert\(/, 'Deposit UI must never regain a browser-authoritative transaction insert path.');
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
