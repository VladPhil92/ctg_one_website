import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  topupMigration: path.join(root, 'supabase/migrations/20260830150000_0081_wallet_cop_topup_trust_boundary.sql'),
  rateMigration: path.join(root, 'supabase/migrations/20260830151000_0082_wallet_topup_rate_limit_scope.sql'),
  ledgerMigration: path.join(root, 'supabase/migrations/20260830231000_0086_wallet_canonical_cop_ledger_authority.sql'),
  ledgerHardeningMigration: path.join(root, 'supabase/migrations/20260830232000_0087_wallet_canonical_cop_ledger_balance_hardening.sql'),
  route: path.join(root, 'src/app/api/wallet/deposits/route.ts'),
  qrRoute: path.join(root, 'src/app/api/wallet/payment-qr/route.ts'),
  page: path.join(root, 'src/app/dashboard/depositos/page.tsx'),
  instructions: path.join(root, 'src/lib/payment-instructions.ts'),
  adminPage: path.join(root, 'src/app/admin/depositos/page.tsx'),
  adminQueue: path.join(root, 'src/components/admin/WalletTopupReviewQueue.tsx'),
  adminVerifyRoute: path.join(root, 'src/app/api/admin/wallet-topups/[id]/verify/route.ts'),
  adminReconcileRoute: path.join(root, 'src/app/api/admin/wallet-topups/[id]/reconcile/route.ts'),
  adminRejectRoute: path.join(root, 'src/app/api/admin/wallet-topups/[id]/reject/route.ts'),
  rateLimit: path.join(root, 'src/lib/security/api-rate-limit.ts'),
  schema: path.join(root, 'src/lib/observability/schema-version.ts'),
  smoke: path.join(root, 'scripts/wallet-cop-topup-smoke.sql'),
  securityAllowlist: path.join(root, 'scripts/security-definer-authenticated-allowlist.txt'),
  securityBodies: path.join(root, 'scripts/security-definer-authenticated-body-sha256.txt'),
  securityGuard: path.join(root, 'scripts/security-definer-authorization-guard-smoke.sql'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    throw new Error(`Wallet COP top-up ${label} file missing: ${path.relative(root, file)}`);
  }
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]),
);

function requireFragments(text, label, fragments) {
  for (const fragment of fragments) {
    if (!text.includes(fragment)) throw new Error(`${label} missing invariant fragment: ${fragment}`);
  }
}

// 0081 remains immutable evidence of the two-human trust boundary that existed
// before ledger authority. 0086 replaces only the reconciliation implementation.
requireFragments(source.topupMigration, 'top-up trust-boundary migration', [
  'create table public.wallet_topup_claims',
  "check (state in ('submitted','verified','rejected','reconciled'))",
  'create unique index wallet_topup_claims_rail_reference_unique',
  'drop policy if exists transactions_insert on public.transactions',
  'revoke insert on public.transactions from authenticated',
  'create or replace function public.submit_wallet_topup_claim_server',
  "auth.role(), '') <> 'service_role'",
  'pg_advisory_xact_lock',
  "v_profile.kyc_status <> 'verified'",
  'create or replace function public.verify_wallet_topup_claim',
  'create or replace function public.reconcile_wallet_topup_claim',
  "v_claim.state <> 'verified'",
  'v_claim.verified_by = auth.uid()',
  "raise exception 'WALLET_TOPUP_INDEPENDENT_RECONCILER_REQUIRED'",
  'create or replace function public.approve_deposit',
  "raise exception 'WALLET_TOPUP_CLAIM_REQUIRED'",
]);

for (const unsafe of [
  'grant insert on public.transactions to authenticated',
  'grant update on public.wallets to authenticated',
  'grant execute on function public.submit_wallet_topup_claim_server(uuid,text,bigint,text,text,text,text,text,text)\n  to authenticated',
]) {
  if (source.topupMigration.includes(unsafe)) {
    throw new Error(`top-up migration widens a forbidden client money boundary: ${unsafe}`);
  }
}

// Current reconciliation authority must post the canonical journal before it
// updates the compatibility cache.
requireFragments(source.ledgerMigration, 'canonical top-up ledger reconciliation', [
  'create or replace function public.reconcile_wallet_topup_claim(',
  "'ledger.topup'",
  "'authoritative', true",
  "'wallet_topup_claim'",
  "'COP_EXTERNAL_CLEARING'",
  'perform public._wallet_ledger_assert_balanced(v_entry_id)',
  "raise exception 'WALLET_TOPUP_COMPATIBILITY_CACHE_DRIFT'",
  "raise exception 'WALLET_TOPUP_LEDGER_POSTING_MISMATCH'",
  "'balance_authority', 'ctg_ledger_v2'",
]);
requireFragments(source.ledgerHardeningMigration, 'canonical top-up balance helper', [
  "e.status = 'posted'",
  "e.metadata ->> 'authoritative' = 'true'",
]);

requireFragments(source.route, 'top-up server route', [
  "consumeAuthenticatedRateLimit(participantClient, 'wallet.topup-proof')",
  'MAX_FILE_BYTES = 8 * 1024 * 1024',
  'matchesDeclaredFileType(bytes, mime)',
  "createHash('sha256')",
  'createAdminClient()',
  ".from('payment-proofs')",
  ".rpc('submit_wallet_topup_claim_server'",
  'p_user_id: user.id',
  'status: 202',
]);

requireFragments(source.qrRoute, 'wallet Bre-B QR route', [
  'INVESTMENT_PAYMENT_QR_MATRIX_BASE64',
  'INVESTMENT_PAYMENT_QR_SIZE',
  'QR Bancolombia Bre-B para recarga de Saldo CTG',
  "'Content-Type': 'image/svg+xml; charset=utf-8'",
  "'Cache-Control': 'public, max-age=31536000, immutable'",
]);

requireFragments(source.page, 'deposit dashboard', [
  "fetch('/api/wallet/deposits'",
  "'X-Payment-Reference'",
  'BRE_B_INSTRUCTIONS.qrImageUrl',
  'Recargar Saldo CTG',
  'Enviar comprobante de recarga',
  'Subir un comprobante, recargar la página o modificar el cliente nunca cambia por sí solo el saldo financiero.',
  'cuando Finanzas verifique el pago y un segundo control lo concilie',
]);
for (const unsafe of [".from('transactions')", ".storage.from('payment-proofs')", 'createClient()']) {
  if (source.page.includes(unsafe)) {
    throw new Error(`deposit dashboard still contains browser-authoritative money mutation: ${unsafe}`);
  }
}

requireFragments(source.instructions, 'payment rail configuration', [
  'BANK_TRANSFER_CONFIGURED',
  'BRE_B_CONFIGURED',
  'WALLET_MANUAL_COP_TOPUP_CONFIGURED',
  'BANK_TRANSFER_CONFIGURED || BRE_B_CONFIGURED',
  'isWalletManualCopRailConfigured',
  "WALLET_BRE_B_KEY = '@grupopisaofood'",
  "WALLET_BRE_B_QR_ASSET = '/api/wallet/payment-qr'",
  'recipientLabel',
]);

requireFragments(source.adminPage, 'wallet top-up admin page', [
  ".from('wallet_topup_claims')",
  ".in('state', ['submitted', 'verified'])",
  ".from('payment-proofs')",
  '.createSignedUrl(',
  'WalletTopupReviewQueue',
  'currentAdminId={user.id}',
]);

requireFragments(source.adminQueue, 'wallet top-up admin queue', [
  '/api/admin/wallet-topups/${claimId}/${action}',
  "action: 'verify' | 'reconcile' | 'reject'",
  "claim.verified_by === currentAdminId",
  'Verificar pago en banco',
  'Conciliar y acreditar Saldo CTG',
  'Se requiere un segundo administrador',
]);
if (source.adminQueue.includes('/api/admin/deposits/')) {
  throw new Error('wallet top-up admin queue regressed to the legacy deposit approval route');
}

requireFragments(source.adminVerifyRoute, 'wallet top-up verification route', [
  ".rpc('verify_wallet_topup_claim'",
  'p_claim_id: id',
  'p_verification_notes:',
]);
requireFragments(source.adminReconcileRoute, 'wallet top-up reconciliation route', [
  ".rpc('reconcile_wallet_topup_claim'",
  'p_claim_id: id',
  'p_admin_notes:',
]);
requireFragments(source.adminRejectRoute, 'wallet top-up rejection route', [
  ".rpc('reject_wallet_topup_claim'",
  'p_claim_id: id',
  'p_reason:',
]);

requireFragments(source.rateLimit, 'rate-limit TypeScript contract', ["'wallet.topup-proof'"]);
requireFragments(source.rateMigration, 'rate-limit SQL contract', [
  "when 'wallet.topup-proof' then",
  'v_limit := 8',
  'v_window_seconds := 600',
]);

const privilegedTopupSignatures = [
  'public.approve_deposit(p_transaction_id uuid, p_admin_notes text)',
  'public.reconcile_wallet_topup_claim(p_claim_id uuid, p_admin_notes text)',
  'public.reject_wallet_topup_claim(p_claim_id uuid, p_reason text)',
  'public.verify_wallet_topup_claim(p_claim_id uuid, p_verification_notes text)',
];
for (const signature of privilegedTopupSignatures) {
  if (!source.securityAllowlist.split(/\r?\n/).includes(signature)) {
    throw new Error(`reviewed SECURITY DEFINER allowlist missing wallet top-up RPC: ${signature}`);
  }
  if (!source.securityBodies.includes(`${signature}\t`)) {
    throw new Error(`reviewed SECURITY DEFINER body registry missing wallet top-up RPC: ${signature}`);
  }
  if (!source.securityGuard.includes(`'${signature}'`)) {
    throw new Error(`SECURITY DEFINER config guard missing hardened wallet top-up RPC: ${signature}`);
  }
}
requireFragments(source.securityBodies, 'reviewed SECURITY DEFINER body registry', [
  'public.consume_api_rate_limit(p_scope text)\t',
]);
requireFragments(source.securityGuard, 'SECURITY DEFINER config guard', [
  "ARRAY['search_path=\"\"']::text[]",
]);

const schemaMigration = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(source.schema);
const schemaCount = /EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(source.schema);
if (!schemaMigration || Number(schemaMigration[1]) < 87 || !schemaCount || Number(schemaCount[1]) < 87) {
  throw new Error('runtime schema contract must include canonical Saldo CTG ledger hardening through 0087');
}

requireFragments(source.smoke, 'PostgreSQL smoke contract', [
  'proof submission credited money before reconciliation',
  'proof submission posted canonical ledger money before reconciliation',
  'same verifier was allowed to reconcile',
  'independent reconciliation did not credit canonical ledger exactly once',
  'reconciled top-up created duplicate canonical journal entries',
  'wallet ledger did not expose reconciled COP credit',
  'wallet ledger/cache reconciliation failed after COP credit',
  'legacy approve_deposit accepted a transaction without a verified claim',
  'authenticated regained INSERT on public.transactions',
  'authenticated can execute server-only Saldo CTG consumption RPC',
]);

console.log('Wallet COP top-up trust invariants: PASS');
