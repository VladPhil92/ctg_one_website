import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = await read('supabase/migrations/0037_manual_bancolombia_bank_verification.sql');
const checkout = await read('src/components/inversion/InvestmentCheckoutClient.tsx');
const uploadRoute = await read('src/app/api/investment/orders/[orderId]/payment-proof/route.ts');
const admin = await read('src/app/inversion/admin/orders/page.tsx');
const paymentConfig = await read('src/lib/payment-instructions.ts');
const schemaVersion = await read('src/lib/observability/schema-version.ts');

assert.ok(migration.includes("'PENDING_BANK_VERIFICATION'"), 'Investment orders need an explicit human bank verification state.');
assert.ok(migration.includes("raise exception 'legacy investment payment submission disabled; use submit_investment_order_bank_proof()'"), 'Legacy multi-rail evidence submission must be fail-closed.');
assert.ok(migration.includes("bank_verified_provider_code='BANCOLOMBIA_MANUAL'"), 'Only the manual Bancolombia verification provider may create the current inbound receipt.');
assert.ok(migration.includes("if not public.has_investment_permission('finance.manage')"), 'Human bank approval must require finance.manage.');
assert.ok(migration.includes("v_order.bank_verified_by is distinct from auth.uid()"), 'Receipt guard must require the same current Finance actor that performed human verification.');
assert.ok(migration.includes("v_order.payment_proof_storage_path is null or v_order.payment_proof_sha256 is null"), 'Funding receipt must require participant proof evidence.');
assert.ok(migration.includes('investment_orders_payment_proof_sha256_unique'), 'Exact proof file hashes must be globally unique.');
assert.ok(migration.includes('investment_orders_manual_bank_reference_unique'), 'Verified Bancolombia references must be unique.');
assert.ok(migration.includes("p_received_amount_cents<>v_order.capital_required_cents"), 'Human verification must reject any amount different from the exact investment order.');
assert.ok(migration.includes("'BANKVER:'||v_order.id::text"), 'Human bank verification must have a deterministic receipt idempotency key.');
assert.ok(migration.includes('contract_activated_at=now()'), 'Operational contract activation must occur only after successful human bank reconciliation.');
assert.ok(migration.includes('create or replace function public.get_manual_bank_verification_health'), 'Manual bank verification must expose health counters.');

assert.ok(uploadRoute.includes("createHash('sha256')"), 'Payment proof digest must be computed server-side.');
assert.ok(uploadRoute.includes("MAX_FILE_BYTES = 8 * 1024 * 1024"), 'Proof uploads must retain the 8 MB limit.');
assert.ok(uploadRoute.includes("'image/jpeg'") && uploadRoute.includes("'application/pdf'"), 'Proof route must allow only explicitly supported evidence formats.');
assert.ok(uploadRoute.includes("rpc('submit_investment_order_bank_proof'"), 'Proof upload must enter the domain through the new bank-proof RPC.');
assert.ok(!uploadRoute.includes('createAdminClient'), 'Participant proof upload must use the participant session, never service-role bypass.');

assert.ok(checkout.includes('INVESTMENT_BANK_TRANSFER_INSTRUCTIONS') && checkout.includes('Ver QR Bancolombia'), 'Checkout must present the approved Bancolombia QR flow.');
assert.ok(checkout.includes('pendiente de verificación bancaria humana'), 'Checkout must clearly state that proof upload does not approve the investment.');
assert.ok(!checkout.includes("'pse'") && !checkout.includes("'bre_b_qr'") && !checkout.includes("'crypto'"), 'Investment checkout must not offer unavailable paid-provider rails.');
assert.ok(checkout.includes('/payment-proof'), 'Checkout must use the server-hashed proof upload endpoint.');

assert.ok(admin.includes("rpc('verify_investment_bancolombia_transfer'"), 'Finance UI must use the human bank verification RPC.');
assert.ok(admin.includes('No confirmes por apariencia del comprobante'), 'Finance UI must explicitly warn that visual proof appearance is not authoritative.');
assert.ok(admin.includes('createSignedUrl'), 'Finance must be able to inspect the private proof before deciding.');
assert.ok(admin.includes("rpc('reject_investment_bank_proof'"), 'Finance must have an explicit proof-rejection path with no money facts.');

assert.ok(paymentConfig.includes('NEXT_PUBLIC_INVESTMENT_BANCOLOMBIA_QR_URL'), 'Approved QR asset location must be external configuration, not invented source data.');
assert.ok(paymentConfig.includes("bankName: 'Bancolombia'") && paymentConfig.includes("accountType: 'Cuenta de Ahorros'"), 'Investment QR configuration must describe the agreed Bancolombia savings rail.');
assert.ok(schemaVersion.includes("'0037'"), 'Runtime expected migration must advance to 0037.');

console.log('Manual Bancolombia bank verification invariants: PASS');
