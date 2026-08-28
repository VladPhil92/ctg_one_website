import { readFile } from 'node:fs/promises';

const [
  intakeMigration,
  identitySyncMigration,
  rpcExposureMigration,
  participantPage,
  adminPage,
  investmentPage,
  investmentProfileHook,
] = await Promise.all([
  readFile('supabase/migrations/0064_kyc_transactional_resilience.sql', 'utf8'),
  readFile('supabase/migrations/0072_unify_investment_kyc_source_of_truth.sql', 'utf8'),
  readFile('supabase/migrations/0074_revoke_anonymous_sensitive_rpc_execution.sql', 'utf8'),
  readFile('src/app/dashboard/kyc/page.tsx', 'utf8'),
  readFile('src/app/admin/kyc/page.tsx', 'utf8'),
  readFile('src/app/inversion/app/page.tsx', 'utf8'),
  readFile('src/hooks/useInvestmentProfile.ts', 'utf8'),
]);

const requiredMigrationTokens = [
  'begin_kyc_submission',
  'register_kyc_document',
  'finalize_kyc_submission',
  "intake_state = 'uploading'",
  "intake_state = 'submitted'",
  'kyc_submissions_one_uploading_per_user',
  "where intake_state = 'uploading'",
  'when unique_violation then',
  'unable to initialize kyc intake',
  'kyc_documents_submission_type_key',
  'storage.objects',
  'kyc_documents_storage_delete_incomplete',
];
for (const token of requiredMigrationTokens) {
  if (!intakeMigration.includes(token)) throw new Error(`KYC resilience migration missing token: ${token}`);
}

for (const forbidden of [
  ".from('kyc_submissions')\n        .insert",
  ".from('kyc_documents')\n          .insert",
]) {
  if (participantPage.includes(forbidden)) {
    throw new Error(`Participant KYC page still performs legacy direct insert: ${forbidden}`);
  }
}

for (const rpc of ['begin_kyc_submission', 'register_kyc_document', 'finalize_kyc_submission']) {
  if (!participantPage.includes(`rpc('${rpc}'`)) throw new Error(`Participant KYC page missing ${rpc} RPC`);
}

for (const signature of [
  'public.begin_kyc_submission()',
  'public.register_kyc_document(uuid, text, text)',
  'public.finalize_kyc_submission(uuid)',
]) {
  if (!rpcExposureMigration.includes(`revoke all on function ${signature}`)) {
    throw new Error(`Sensitive KYC RPC is not explicitly revoked from anonymous/public execution: ${signature}`);
  }
  if (!rpcExposureMigration.includes(`grant execute on function ${signature}`)) {
    throw new Error(`Sensitive KYC RPC no longer has an explicit authenticated execution grant: ${signature}`);
  }
}
if (!rpcExposureMigration.includes('from public, anon')) {
  throw new Error('Sensitive KYC RPC hardening must explicitly revoke both PUBLIC and anon privileges.');
}
if (!rpcExposureMigration.includes('to authenticated, service_role')) {
  throw new Error('Sensitive KYC RPC hardening must explicitly preserve authenticated/server execution.');
}

if (!participantPage.includes('`${userId}/${submissionId}/${documentType}`')) {
  throw new Error('KYC Storage path is not deterministic by user/submission/document type.');
}
if (!participantPage.includes('already exists|duplicate')) {
  throw new Error('KYC retry path does not tolerate already-durable Storage objects.');
}
if (!adminPage.includes(".eq('intake_state', 'submitted')")) {
  throw new Error('Admin KYC queue does not exclude incomplete intake rows.');
}

const identitySyncTokens = [
  '_investment_kyc_from_profile_status',
  "when 'verified' then 'VERIFIED'",
  'sync_investment_kyc_after_profile_change',
  'backfill_investment_kyc',
  'ensure_investment_participant_profile',
  'select kyc_status',
  'from public.profiles',
  'Synchronized investment-domain projection of authoritative public.profiles.kyc_status',
];
for (const token of identitySyncTokens) {
  if (!identitySyncMigration.includes(token)) {
    throw new Error(`Investment KYC source-of-truth migration missing token: ${token}`);
  }
}

if (identitySyncMigration.match(/drop\s+(table|column)/i) || identitySyncMigration.match(/truncate\s+/i)) {
  throw new Error('Investment KYC synchronization migration contains a destructive schema/data operation.');
}

if (!investmentProfileHook.includes("const { data, error: rpcError } = await supabase.rpc('ensure_investment_participant_profile')")) {
  throw new Error('Investment profile hook does not explicitly capture participant-profile RPC failures.');
}
if (!investmentProfileHook.includes('return { profile, isLoading, error, refresh: load }')) {
  throw new Error('Investment profile hook does not expose synchronization errors to the UI.');
}
if (!investmentPage.includes('error: profileError') || !investmentPage.includes('refresh: refreshProfile')) {
  throw new Error('Investment dashboard does not consume the KYC synchronization error/retry contract.');
}
if (!investmentPage.includes('Identidad CTG One')) {
  throw new Error('Investment dashboard does not identify CTG One as the KYC identity surface.');
}
if (!investmentPage.includes('no necesitas realizar un segundo KYC')) {
  throw new Error('Investment dashboard still communicates a separate investment KYC requirement.');
}
if (!investmentPage.includes("identityUnavailable ? 'No disponible'")) {
  throw new Error('Investment dashboard can still render an identity synchronization failure as a KYC status.');
}
if (investmentPage.includes('KYC específico de inversión')) {
  throw new Error('Investment dashboard still references a contradictory investment-specific KYC.');
}

console.log('KYC transactional resilience, identity source-of-truth and RPC exposure invariants: PASS');
