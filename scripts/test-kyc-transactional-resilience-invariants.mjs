import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [migration, page, domainTypes] = await Promise.all([
  readFile('supabase/migrations/0064_kyc_transactional_resilience.sql', 'utf8'),
  readFile('src/app/dashboard/kyc/page.tsx', 'utf8'),
  readFile('src/types/domain.ts', 'utf8'),
]);

assert.match(migration, /status in \('draft', 'pending', 'verified', 'rejected'\)/, 'KYC submissions must have an explicit draft state.');
assert.ok(migration.includes('client_request_id uuid'), 'KYC drafts must carry a client idempotency key.');
assert.ok(migration.includes('kyc_submissions_one_draft_per_user'), 'Only one active KYC draft per user is allowed.');
assert.ok(migration.includes('kyc_documents_submission_document_type_key'), 'Required KYC document metadata must be idempotent by submission/type.');
assert.ok(migration.includes('drop trigger if exists on_kyc_submission_created'), 'Legacy eager pending trigger must be retired.');
assert.ok(migration.includes('kyc_submissions_finalize_draft'), 'RLS must gate DRAFT -> PENDING finalization.');
assert.ok(migration.includes("d.document_type in ('cedula_front', 'cedula_back')"), 'Finalization must require both identity document sides.');
assert.ok(migration.includes("o.bucket_id = 'kyc-documents'"), 'Finalization must prove Storage object durability.');
assert.ok(migration.includes('security invoker'), 'Participant KYC RPCs must prefer invoker rights instead of new authenticated SECURITY DEFINER exposure.');
assert.ok(migration.includes('handle_kyc_submission_finalized'), 'Profile pending state must move only after durable finalization.');
assert.ok(migration.includes('kyc_documents_storage_update'), 'Storage UPDATE policy is required for retry-safe upsert.');
assert.ok(migration.includes("array_length(string_to_array(name, '/'), 1) = 3"), 'KYC Storage policy must enforce the deterministic three-segment key.');

assert.ok(page.includes("rpc('begin_kyc_submission'"), 'KYC UI must initialize/reuse a durable draft.');
assert.ok(page.includes('crypto.randomUUID()'), 'KYC begin requests must carry a client idempotency key.');
assert.ok(page.includes('`${userId}/${draft.id}/${documentType}`'), 'KYC Storage keys must be deterministic across retries.');
assert.ok(page.includes('upsert: true'), 'KYC Storage upload must be retry-safe.');
assert.ok(page.includes("rpc('register_kyc_document'"), 'KYC UI must register durable Storage objects through the database contract.');
assert.ok(page.includes("rpc('finalize_kyc_submission'"), 'KYC UI must finalize only after both required documents are registered.');
assert.doesNotMatch(page, /\.from\('kyc_submissions'\)[\s\S]{0,120}\.insert\(/, 'KYC UI must not recreate the legacy eager-pending insert path.');
assert.doesNotMatch(page, /\.from\('kyc_documents'\)[\s\S]{0,120}\.insert\(/, 'KYC UI must use the retry-safe registration contract.');
assert.ok(page.includes('sin duplicar tu presentación'), 'Retry guidance must be explicit to the participant.');

assert.ok(domainTypes.includes("'draft' | 'pending' | 'verified' | 'rejected'"), 'Hand-written KYC type must mirror the draft-aware schema.');
assert.ok(domainTypes.includes('client_request_id: string | null'), 'KYC type must expose the idempotency key.');
assert.ok(domainTypes.includes('submitted_at: string | null'), 'KYC type must expose finalization time.');

console.log('KYC transactional resilience invariants: PASS');
