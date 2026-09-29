import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = await read('supabase/migrations/0069_investment_manual_crypto_verification.sql');
const financialBoundary = await read('supabase/migrations/20260906173817_0113_investment_financial_server_boundaries.sql');
const checkout = await read('src/components/inversion/InvestmentCheckoutClient.tsx');
const railChoice = await read('src/components/inversion/InvestmentPaymentRailChoice.tsx');
const checkoutRepository = await read('src/modules/investment/checkout/browser-repository.ts');
const uploadRoute = await read('src/app/api/investment/orders/[orderId]/payment-proof/route.ts');
const financialControl = await read('src/app/api/investment/admin/financial-control/route.ts');
const financialControlClient = await read('src/lib/security/financial-control-client.ts');
const admin = await read('src/app/inversion/admin/orders/page.tsx');
const adminRepository = await read('src/modules/investment/admin-orders/browser-repository.ts');
const paymentConfig = await read('src/lib/payment-instructions.ts');

// The crypto rail is manual, exactly like the Bancolombia one. Nothing here may
// become an automated provider integration without revisiting ADR-010.
assert.ok(
  !migration.includes('http') && !migration.includes('webhook'),
  'Manual crypto verification must not introduce an automated provider callback.',
);
assert.ok(
  !migration.includes("'PENDING_CRYPTO_VERIFICATION'"),
  'Crypto must reuse the shared pending-verification stage instead of forking the order state machine.',
);

assert.ok(
  migration.includes("bank_verified_provider_code = 'CRYPTO_MANUAL' and crypto_network is not null"),
  'A crypto verification must always record the independently observed network.',
);
assert.ok(
  migration.includes("if not public.has_investment_permission('finance.manage')"),
  'Human crypto approval must require finance.manage.',
);
assert.ok(
  migration.includes('v_order.bank_verified_by is distinct from auth.uid()'),
  'Receipt guard must still require the same current Finance actor that performed the verification.',
);
assert.ok(
  migration.includes("raise exception 'current inbound policy requires manual Bancolombia or manual crypto verification'"),
  'The receipt guard must stay fail-closed for any provider other than the two approved manual rails.',
);
assert.ok(
  migration.includes("new.payment_rail<>'bank_transfer' or new.provider_code<>'BANCOLOMBIA_MANUAL'"),
  'Adding the crypto rail must not weaken the existing Bancolombia receipt branch.',
);
assert.ok(
  migration.includes('p_received_amount_cents<>v_order.capital_required_cents'),
  'Human crypto verification must reject any amount different from the exact investment order.',
);
assert.ok(
  migration.includes("'CRYPTOVER:'||v_order.id::text"),
  'Human crypto verification must have a deterministic receipt idempotency key.',
);
assert.ok(
  migration.includes("upper(regexp_replace(coalesce(p_transaction_hash,''), '[^A-Za-z0-9]', '', 'g'))"),
  'Finance-entered transaction hashes must be canonicalized before storage.',
);
assert.ok(
  migration.includes("raise exception 'transaction hash has already been used'"),
  'The same on-chain movement must not be able to fund two orders.',
);
assert.ok(
  migration.includes('create or replace function public.get_manual_crypto_verification_health'),
  'Manual crypto verification must expose health counters.',
);
assert.ok(
  migration.includes('to service_role')
    && migration.includes('revoke all on function public.submit_investment_order_crypto_proof_server(uuid,uuid,text,text,text,text)\n  from public,anon,authenticated;'),
  'Only the trusted server role may persist server-computed crypto proof digests.',
);

// Operator-approved Binance deposit destinations are public payment-routing
// data. The source allowlist is intentional and tests pin both asset/network
// pairings and exact addresses to prevent silent payment-route substitution.
assert.ok(
  paymentConfig.includes('INVESTMENT_CRYPTO_DESTINATIONS'),
  'Investment crypto checkout must use an explicit destination allowlist.',
);
assert.match(
  paymentConfig,
  /asset: 'USDT'[\s\S]*?network: 'BNB Smart Chain \(BEP20\)'/,
  'USDT must be accepted only through BNB Smart Chain (BEP20).',
);
assert.match(
  paymentConfig,
  /asset: 'BNB'[\s\S]*?network: 'BNB Smart Chain \(BEP20\)'/,
  'BNB must be accepted only through BNB Smart Chain (BEP20).',
);
assert.match(
  paymentConfig,
  /asset: 'ETH'[\s\S]*?network: 'Ethereum \(ERC20\)'/,
  'ETH must be accepted only through Ethereum (ERC20).',
);
assert.match(
  paymentConfig,
  /asset: 'BTC'[\s\S]*?network: 'Bitcoin'/,
  'BTC must be accepted only through the Bitcoin network.',
);
assert.ok(
  paymentConfig.includes("0xf27f2ab291cb3fee22298b3169b119c6b854b21c")
    && paymentConfig.includes("13Kg9rf5C4mNQG9A21G655q7dARrbJmatF"),
  'Approved Binance deposit addresses changed unexpectedly.',
);
assert.ok(
  paymentConfig.includes('INVESTMENT_PSE_ENABLED = false'),
  'PSE must remain explicitly disabled until its backend provider integration exists.',
);

assert.ok(
  railChoice.includes('QR PISAO')
    && railChoice.includes('PSE')
    && railChoice.includes('Criptomonedas'),
  'Checkout must expose the three intended payment choices: QR, PSE placeholder and crypto.',
);
assert.ok(
  railChoice.includes('disabled={disabled || !INVESTMENT_PSE_ENABLED}'),
  'PSE choice must stay non-interactive while the service is unavailable.',
);
assert.ok(
  railChoice.includes('INVESTMENT_CRYPTO_DESTINATIONS')
    && railChoice.includes("encodeQR(destination.address, 'svg')"),
  'Crypto checkout must render a QR directly from the pinned approved destination.',
);
assert.ok(
  checkout.includes('uploadInvestmentPaymentProof') && checkout.includes('rail'),
  'Checkout must send the chosen rail through the browser repository boundary.',
);
assert.ok(
  !checkout.includes('createClient') && !checkout.includes('.rpc('),
  'Checkout must not reach past the repository boundary.',
);
assert.ok(
  checkoutRepository.includes("'X-Payment-Rail': input.rail"),
  'The proof upload must declare its rail to the trusted server.',
);
assert.ok(
  uploadRoute.includes("rail !== 'bank_transfer' && rail !== 'crypto'"),
  'The proof route must reject any rail outside the two approved manual ones.',
);
assert.ok(
  uploadRoute.includes("'submit_investment_order_crypto_proof_server'"),
  'The proof route must dispatch crypto evidence to the crypto persistence RPC.',
);

assert.ok(
  adminRepository.includes("import { runFinancialControl } from '@/lib/security/financial-control-client'")
    && financialControlClient.includes('/api/investment/admin/financial-control')
    && adminRepository.includes("operation: 'funding.verifyCryptoTransfer'")
    && !adminRepository.includes("rpc('verify_investment_crypto_transfer'"),
  'Finance repository must route human crypto verification through the shared server-only financial control boundary.',
);
assert.ok(
  financialBoundary.includes('verify_investment_crypto_transfer_server')
    && financialBoundary.includes("'finance.manage'")
    && financialControl.includes("'verify_investment_crypto_transfer_server'")
    && financialControl.includes('p_actor_user_id: context.user.id'),
  'Crypto verification must retain finance.manage and canonical actor binding behind service_role.',
);
assert.ok(
  admin.includes('explorador público de la red'),
  'Finance UI must direct the operator to an independent public explorer.',
);
assert.ok(
  admin.includes('cryptoNetwork'),
  'Finance UI must capture the independently observed network.',
);

console.log('Manual crypto verification invariants: PASS');
