import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = await read('supabase/migrations/0037_manual_bancolombia_bank_verification.sql');
const trustBoundary = await read('supabase/migrations/0038_payment_proof_server_trust_boundary.sql');
const referenceNormalization = await read('supabase/migrations/0039_manual_bank_reference_normalization.sql');
const checkout = await read('src/components/inversion/InvestmentCheckoutClient.tsx');
const checkoutRepository = await read('src/modules/investment/checkout/browser-repository.ts');
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
assert.ok(migration.includes("p_received_amount_cents<>v_order.capital_required_cents"), 'Human verification must reject any amount different from the exact investment order.');
assert.ok(migration.includes("'BANKVER:'||v_order.id::text"), 'Human bank verification must have a deterministic receipt idempotency key.');
assert.ok(migration.includes('contract_activated_at=now()'), 'Operational contract activation must occur only after successful human bank reconciliation.');
assert.ok(migration.includes('create or replace function public.get_manual_bank_verification_health'), 'Manual bank verification must expose health counters.');

assert.ok(trustBoundary.includes('revoke all on function public.submit_investment_order_bank_proof') && trustBoundary.includes('from public,anon,authenticated'), 'Browser clients must lose direct proof-persistence RPC execution.');
assert.ok(trustBoundary.includes('submit_investment_order_bank_proof_server') && trustBoundary.includes('to service_role'), 'Only the trusted server role may persist server-computed proof digests.');
assert.ok(trustBoundary.includes('p_participant_user_id') && trustBoundary.includes('v_order.participant_user_id<>p_participant_user_id'), 'Trusted server RPC must still bind the proof to the authenticated participant/order identity.');

assert.ok(referenceNormalization.includes("upper(regexp_replace(coalesce(p_bank_reference,''), '[^A-Za-z0-9]', '', 'g'))"), 'Finance-entered Bancolombia references must be canonicalized before storage.');
assert.ok(referenceNormalization.includes('drop index if exists public.investment_orders_manual_bank_reference_unique') && referenceNormalization.includes('upper(regexp_replace(bank_verified_reference'), 'Bank reference uniqueness must be enforced on the same normalized representation.');
assert.ok(referenceNormalization.includes("'reference_normalization','UPPER_ALPHANUMERIC'"), 'Audit genealogy must record the bank-reference normalization policy.');

assert.ok(uploadRoute.includes("createHash('sha256')"), 'Payment proof digest must be computed server-side.');
assert.ok(uploadRoute.includes("MAX_FILE_BYTES = 8 * 1024 * 1024"), 'Proof uploads must retain the 8 MB limit.');
assert.ok(uploadRoute.includes("'image/jpeg'") && uploadRoute.includes("'application/pdf'"), 'Proof route must allow only explicitly supported evidence formats.');
assert.ok(uploadRoute.includes('createClient') && uploadRoute.includes('auth.getUser()'), 'Participant identity must be verified from the normal user session before privileged work.');
assert.ok(!uploadRoute.includes('request.formData()'), 'Proof route must not buffer multipart bodies before enforcing the request boundary.');
assert.ok(uploadRoute.includes('request.body.getReader()') && uploadRoute.includes('total > MAX_FILE_BYTES') && uploadRoute.includes("reader.cancel('payment proof exceeds 8 MB')"), 'Proof body must be streamed with an enforced hard byte limit.');
assert.ok(uploadRoute.indexOf('auth.getUser()') < uploadRoute.indexOf('readBoundedBody(request)'), 'Authentication must complete before the upload body is consumed.');
assert.ok(uploadRoute.includes('matchesDeclaredFileType(bytes, mime)'), 'Declared MIME must be checked against the actual file signature.');
assert.ok(uploadRoute.includes('createAdminClient'), 'After participant authorization, trusted server code must own the proof hash persistence boundary.');
assert.ok(uploadRoute.includes("rpc('submit_investment_order_bank_proof_server'"), 'Proof upload must persist the server digest through the service-role-only RPC.');
assert.ok(uploadRoute.includes('objectCreatedByThisRequest') && uploadRoute.includes('objectIsAuthoritative') && uploadRoute.includes('payment_proof_storage_path,payment_proof_sha256'), 'Upload cleanup must not delete a deterministic proof object adopted by a concurrent successful submission.');

assert.ok(checkout.includes('INVESTMENT_BANK_TRANSFER_INSTRUCTIONS') && checkout.includes('Ver QR Bancolombia'), 'Checkout must present the approved Bancolombia QR flow.');
assert.ok(checkout.includes('pendiente de verificación bancaria humana'), 'Checkout must clearly state that proof upload does not approve the investment.');
assert.ok(!checkout.includes("'pse'") && !checkout.includes("'bre_b_qr'") && !checkout.includes("'crypto'"), 'Investment checkout must not offer unavailable paid-provider rails.');
assert.ok(checkout.includes('uploadInvestmentPaymentProof'), 'Checkout UI must delegate proof transport through the browser repository boundary.');
assert.ok(checkoutRepository.includes("'Content-Type': input.proof.type") && checkoutRepository.includes("'X-File-Name': encodeURIComponent"), 'Checkout repository must send the proof as a raw bounded upload, not multipart FormData.');
assert.ok(checkoutRepository.includes('/payment-proof'), 'Checkout repository must use the server-hashed proof upload endpoint.');
assert.ok(!checkoutRepository.includes('FormData'), 'Checkout repository must not regress to multipart FormData uploads.');

assert.ok(admin.includes("rpc('verify_investment_bancolombia_transfer'"), 'Finance UI must use the human bank verification RPC.');
assert.ok(admin.includes('No confirmes por apariencia del comprobante'), 'Finance UI must explicitly warn that visual proof appearance is not authoritative.');
assert.ok(admin.includes('createSignedUrl'), 'Finance must be able to inspect the private proof before deciding.');
assert.ok(admin.includes("rpc('reject_investment_bank_proof'"), 'Finance must have an explicit proof-rejection path with no money facts.');

assert.ok(paymentConfig.includes('NEXT_PUBLIC_INVESTMENT_BANCOLOMBIA_QR_URL'), 'Approved QR asset location must be external configuration, not invented source data.');
assert.ok(paymentConfig.includes("bankName: 'Bancolombia'") && paymentConfig.includes("accountType: 'Cuenta de Ahorros'"), 'Investment QR configuration must describe the agreed Bancolombia savings rail.');
const expectedVersion = Number(schemaVersion.match(/'(\d{4})'/)?.[1] ?? '0');
assert.ok(expectedVersion >= 39, 'Runtime expected migration must not regress below manual Bancolombia verification 0039.');

console.log('Manual Bancolombia bank verification invariants: PASS');
