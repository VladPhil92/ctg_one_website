import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  topupMigration: path.join(root, 'supabase/migrations/20260830150000_0081_wallet_cop_topup_trust_boundary.sql'),
  rateMigration: path.join(root, 'supabase/migrations/20260830151000_0082_wallet_topup_rate_limit_scope.sql'),
  route: path.join(root, 'src/app/api/wallet/deposits/route.ts'),
  page: path.join(root, 'src/app/dashboard/depositos/page.tsx'),
  instructions: path.join(root, 'src/lib/payment-instructions.ts'),
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

requireFragments(source.topupMigration, 'top-up migration', [
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
  'update public.wallets',
  'balance_cents = balance_cents + v_claim.amount_cents',
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

requireFragments(source.route, 'top-up server route', [
  "consumeAuthenticatedRateLimit(participantClient, 'wallet.topup-proof')",
  'MAX_FILE_BYTES = 8 * 1024 * 1024',
  'matchesDeclaredFileType(bytes, mime)',
  "createHash('sha256')",
  'createAdminClient()',
  ".from('payment-proofs')",
  ".rpc('submit_wallet_topup_claim_server'",
  "status: 202",
]);

requireFragments(source.page, 'deposit dashboard', [
  "fetch('/api/wallet/deposits'",
  "'X-Payment-Reference'",
  'Enviar claim de recarga',
  'no acredita saldo por sí mismo',
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
if (!schemaMigration || Number(schemaMigration[1]) < 82 || !schemaCount || Number(schemaCount[1]) < 82) {
  throw new Error('runtime schema contract must include wallet COP top-up migrations 0081/0082');
}

requireFragments(source.smoke, 'PostgreSQL smoke contract', [
  'proof submission credited money before reconciliation',
  'same verifier was allowed to reconcile',
  'independent reconciliation did not credit exactly once',
  'legacy approve_deposit accepted a transaction without a verified claim',
  'authenticated regained INSERT on public.transactions',
  'wallet shadow did not mirror reconciled COP credit',
]);

console.log('Wallet COP top-up trust invariants: PASS');