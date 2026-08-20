import { readFile } from 'node:fs/promises';

const [migration, participantPage, adminPage] = await Promise.all([
  readFile('supabase/migrations/0064_kyc_transactional_resilience.sql', 'utf8'),
  readFile('src/app/dashboard/kyc/page.tsx', 'utf8'),
  readFile('src/app/admin/kyc/page.tsx', 'utf8'),
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
  if (!migration.includes(token)) throw new Error(`KYC resilience migration missing token: ${token}`);
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

if (!participantPage.includes('`${userId}/${submissionId}/${documentType}`')) {
  throw new Error('KYC Storage path is not deterministic by user/submission/document type.');
}
if (!participantPage.includes('already exists|duplicate')) {
  throw new Error('KYC retry path does not tolerate already-durable Storage objects.');
}
if (!adminPage.includes(".eq('intake_state', 'submitted')")) {
  throw new Error('Admin KYC queue does not exclude incomplete intake rows.');
}

console.log('KYC transactional resilience invariants: PASS');
