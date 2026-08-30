import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  WalletLegacyEvidenceError,
  parseWalletLegacyEvidence,
  planWalletLegacyEvidenceImport,
} from './lib/wallet-legacy-evidence.mjs';

const fixtureUrl = new URL('./fixtures/wallet-legacy-evidence.synthetic-v1.json', import.meta.url);
const importerUrl = new URL('./import-wallet-legacy-evidence.mjs', import.meta.url);
const fixtureBytes = await readFile(fixtureUrl);
const importer = await readFile(importerUrl, 'utf8');
const document = parseWalletLegacyEvidence(fixtureBytes);

assert.equal(document.schemaVersion, 'ctg-wallet-legacy-evidence-v1');
assert.equal(document.records.length, 2);
assert.match(document.sourceDigestSha256, /^[0-9a-f]{64}$/);
assert.equal(document.records[0].normalizedAddress, '0x1111111111111111111111111111111111111111');

const rawFixture = JSON.parse(fixtureBytes.toString('utf8'));
function parseMutated(mutator) {
  const clone = structuredClone(rawFixture);
  mutator(clone);
  return () => parseWalletLegacyEvidence(Buffer.from(`${JSON.stringify(clone)}\n`));
}
function expectEvidenceCode(fn, code) {
  assert.throws(fn, (error) => error instanceof WalletLegacyEvidenceError && error.code === code);
}

expectEvidenceCode(parseMutated((value) => {
  value.records[1].canonical_user_id = value.records[0].canonical_user_id;
}), 'DUPLICATE_CANONICAL_USER');
expectEvidenceCode(parseMutated((value) => {
  value.records[1].privy_user_id = value.records[0].privy_user_id;
}), 'DUPLICATE_PRIVY_USER');
expectEvidenceCode(parseMutated((value) => {
  value.records[1].wallet_address = value.records[0].wallet_address.toUpperCase().replace('0X', '0x');
}), 'DUPLICATE_EVM_ADDRESS');
expectEvidenceCode(parseMutated((value) => {
  value.records[0].wallet_type = 'external';
}), 'INVALID_WALLET_TYPE');
expectEvidenceCode(parseMutated((value) => {
  value.records[0].unexpected = true;
}), 'INVALID_EVIDENCE_SHAPE');

const profiles = document.records.map((record) => ({ id: record.canonicalUserId }));
const emptyDatabase = {
  profiles,
  evidence: [],
  identityLinks: [],
  externalAccounts: [],
};
const cleanPlan = planWalletLegacyEvidenceImport(document, emptyDatabase);
assert.equal(cleanPlan.inserts.length, 2);
assert.equal(cleanPlan.alreadyPresent.length, 0);
assert.equal(cleanPlan.conflicts.length, 0);
assert.equal(cleanPlan.inserts[0].provider, 'privy');
assert.equal(cleanPlan.inserts[0].chain_family, 'evm');
assert.equal(cleanPlan.inserts[0].source_digest_sha256, document.sourceDigestSha256);

const missingProfilePlan = planWalletLegacyEvidenceImport(document, {
  ...emptyDatabase,
  profiles: profiles.slice(1),
});
assert.equal(missingProfilePlan.conflicts[0].code, 'CANONICAL_PROFILE_NOT_FOUND');

const first = document.records[0];
const exactExistingEvidence = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  user_id: first.canonicalUserId,
  provider: 'privy',
  provider_user_id: first.privyUserId,
  expected_address_normalized: first.normalizedAddress,
  source_digest_sha256: document.sourceDigestSha256,
  evidence_captured_at: document.capturedAt,
  status: 'pending',
};
const idempotentPlan = planWalletLegacyEvidenceImport(document, {
  ...emptyDatabase,
  evidence: [exactExistingEvidence],
});
assert.equal(idempotentPlan.alreadyPresent.length, 1);
assert.equal(idempotentPlan.inserts.length, 1);
assert.equal(idempotentPlan.conflicts.length, 0);

const differentProvenancePlan = planWalletLegacyEvidenceImport(document, {
  ...emptyDatabase,
  evidence: [{ ...exactExistingEvidence, source_digest_sha256: 'f'.repeat(64) }],
});
assert.equal(differentProvenancePlan.conflicts[0].code, 'EXISTING_EVIDENCE_PROVENANCE_DIFFERS');

const privyCollisionPlan = planWalletLegacyEvidenceImport(document, {
  ...emptyDatabase,
  identityLinks: [{
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    user_id: document.records[1].canonicalUserId,
    provider: 'privy',
    provider_user_id: first.privyUserId,
    status: 'verified',
    link_mode: 'legacy_preserve',
  }],
});
assert.equal(privyCollisionPlan.conflicts[0].code, 'PRIVY_IDENTITY_LINK_CONFLICT');

const addressCollisionPlan = planWalletLegacyEvidenceImport(document, {
  ...emptyDatabase,
  externalAccounts: [{
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    user_id: document.records[1].canonicalUserId,
    provider: 'privy',
    chain_family: 'evm',
    address_normalized: first.normalizedAddress,
    status: 'verified',
    is_primary: true,
    legacy_preserved: true,
  }],
});
assert.equal(addressCollisionPlan.conflicts[0].code, 'EVM_ADDRESS_LINK_CONFLICT');

const primaryCollisionPlan = planWalletLegacyEvidenceImport(document, {
  ...emptyDatabase,
  externalAccounts: [{
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    user_id: first.canonicalUserId,
    provider: 'privy',
    chain_family: 'evm',
    address_normalized: '0x3333333333333333333333333333333333333333',
    status: 'verified',
    is_primary: true,
    legacy_preserved: false,
  }],
});
assert.equal(primaryCollisionPlan.conflicts[0].code, 'PRIMARY_EVM_WALLET_CONFLICT');

for (const fragment of [
  '--apply requires --confirm-digest',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  "payload.role !== 'service_role'",
  ".from('wallet_legacy_migration_evidence')",
  '.insert(plan.inserts)',
  'DRY_RUN_OK',
  'APPLY_OK',
]) {
  assert.ok(importer.includes(fragment), `Legacy evidence importer missing safety invariant: ${fragment}`);
}
for (const forbidden of [
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  '.upsert(',
  '.update(',
  '.delete(',
]) {
  assert.ok(!importer.includes(forbidden), `Legacy evidence importer must not contain: ${forbidden}`);
}

console.log('Wallet legacy evidence importer invariants: PASS');
