import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

const [evidence, route, migration0088, migration0089, runbook, cors, schemaVersion] = await Promise.all([
  read('src/lib/wallet/canary-evidence.ts'),
  read('src/app/api/wallet/intents/[intentId]/evidence/route.ts'),
  read('supabase/migrations/20260830235000_0088_wallet_chain_reconciliation_v1.sql'),
  read('supabase/migrations/20260831021500_0089_wallet_canary_evidence_provenance.sql'),
  read('docs/WALLET_CANARY_RUNBOOK.md'),
  read('src/lib/wallet/cors.ts'),
  read('src/lib/observability/schema-version.ts'),
])

for (const fragment of [
  "import 'server-only'",
  "WALLET_CANARY_EVIDENCE_VERSION = 'ctg-wallet-canary-evidence-v1'",
  "createHash('sha256')",
  'bundleDigestSha256',
  "kind: 'crypto_send'",
  "rail: 'polygon'",
  'chainId: 137',
  'simulationDigestSha256',
  'chainReconciliationDigestSha256',
  'clientArtifact',
  "repository: 'VladPhil92/CTG-Wallet'",
  'observations: observations.map',
  "input.intent.status === 'reconciled' || input.intent.status === 'failed'",
]) {
  assert.ok(evidence.includes(fragment), `Canary evidence builder missing invariant: ${fragment}`)
}

for (const fragment of [
  "const CORS_METHODS = ['GET', 'OPTIONS']",
  '/evidence',
  "createAuthenticatedRequestContext(request)",
  ".from('wallet_intents_v2')",
  ".eq('id', intentId)",
  ".eq('user_id', auth.user.id)",
  ".from('wallet_chain_reconciliation_observations_v1')",
  ".eq('intent_id', intentId)",
  ".order('id', { ascending: true })",
  'normalizeWalletCanaryEvidenceIntent(rawIntent)',
  'normalizeWalletCanaryEvidenceObservation',
  'probeRuntimeSchemaCompatibility()',
  'getDeploymentMetadata()',
  'buildWalletCanaryEvidenceBundleV1({',
  "process.env.WALLET_CANARY_CLIENT_COMMIT",
  "request.headers.get(CLIENT_COMMIT_HEADER)",
  "WALLET_CANARY_EVIDENCE_CLIENT_COMMIT_MISMATCH",
  "repository: 'VladPhil92/CTG-Wallet'",
]) {
  assert.ok(route.includes(fragment), `Canary evidence route missing invariant: ${fragment}`)
}

for (const field of [
  'submitted_at',
  'chain_last_checked_at',
  'chain_observed_at',
  'chain_confirmed_at',
  'chain_block_number',
  'chain_confirmations',
  'chain_reconciliation_digest_sha256',
  'chain_failure_code',
]) {
  assert.ok(migration0088.includes(field), `Migration 0088 missing evidence field: ${field}`)
  assert.ok(route.includes(`'${field}'`), `Evidence route does not select canonical field: ${field}`)
}

for (const fragment of [
  'create table if not exists public.wallet_chain_reconciliation_observations_v1',
  'enable row level security',
  'revoke all on table public.wallet_chain_reconciliation_observations_v1',
  'revoke insert, update, delete, truncate on table public.wallet_chain_reconciliation_observations_v1',
  'capture_wallet_chain_reconciliation_observation_v1',
  'new.chain_last_checked_at is distinct from old.chain_last_checked_at',
  'new.chain_reconciliation_digest_sha256',
  'new.chain_confirmations',
  'new.chain_block_number',
  'after update of',
]) {
  assert.ok(migration0089.includes(fragment), `Migration 0089 missing append-only evidence invariant: ${fragment}`)
}

for (const forbidden of [
  'privateKey',
  'seedPhrase',
  'mnemonic',
  'sendTransaction(',
  'eth_sendTransaction',
  'wallet_journal_entries_v2',
  'wallet_journal_postings_v2',
]) {
  assert.ok(!evidence.includes(forbidden), `Canary evidence builder crossed safety boundary: ${forbidden}`)
  assert.ok(!route.includes(forbidden), `Canary evidence route crossed safety boundary: ${forbidden}`)
}

for (const forbidden of ['.insert(', '.update(', '.delete(', '.rpc(']) {
  assert.ok(!route.includes(forbidden), `Canary evidence route crossed read-only persistence boundary: ${forbidden}`)
}

assert.ok(
  !evidence.includes('authorizedWalletAddress'),
  'Sanitized evidence bundle must not expose the stored authorized wallet field.',
)
const selectStart = route.indexOf('const EVIDENCE_SELECT = [')
const selectEnd = route.indexOf('].join', selectStart)
assert.ok(selectStart >= 0 && selectEnd > selectStart, 'Evidence SELECT declaration must remain explicit and auditable.')
const evidenceSelect = route.slice(selectStart, selectEnd)
assert.ok(
  !evidenceSelect.includes("'user_id'"),
  'Evidence SELECT must not fetch canonical user_id into the response payload.',
)
const observationSelectStart = route.indexOf('const OBSERVATION_SELECT = [')
const observationSelectEnd = route.indexOf('].join', observationSelectStart)
assert.ok(observationSelectStart >= 0 && observationSelectEnd > observationSelectStart, 'Observation SELECT must remain explicit and auditable.')
const observationSelect = route.slice(observationSelectStart, observationSelectEnd)
assert.ok(
  !observationSelect.includes("'user_id'"),
  'Observation SELECT must not fetch canonical user_id into the response payload.',
)
assert.ok(
  route.includes(".eq('user_id', auth.user.id)"),
  'Evidence lookup must remain scoped to the authenticated canonical owner.',
)
assert.ok(
  cors.includes('X-CTG-Wallet-Build-Commit'),
  'Wallet CORS must explicitly permit the public client-build provenance header.',
)
assert.ok(
  schemaVersion.includes("EXPECTED_DATABASE_MIGRATION = '0089'")
    && schemaVersion.includes("EXPECTED_DATABASE_MIGRATION_NAME = 'wallet_canary_evidence_provenance'")
    && schemaVersion.includes('EXPECTED_DATABASE_MIGRATION_COUNT = 89'),
  'Runtime schema contract must advance atomically to migration 0089.',
)
assert.ok(
  evidence.indexOf('const canonical = {') < evidence.indexOf("createHash('sha256')")
    && evidence.indexOf("createHash('sha256')") < evidence.indexOf('generatedAt: new Date().toISOString()'),
  'Bundle digest must cover canonical evidence before the non-deterministic generatedAt timestamp is added.',
)
assert.ok(
  evidence.indexOf('clientArtifact,') < evidence.indexOf("createHash('sha256')")
    && evidence.indexOf('observations: observations.map') < evidence.indexOf("createHash('sha256')"),
  'Client provenance and ordered reconciliation history must both be bound into bundleDigestSha256.',
)
assert.ok(
  runbook.includes('GET /api/wallet/intents/<intentId>/evidence'),
  'Canary runbook must document the canonical evidence bundle endpoint.',
)
assert.ok(
  runbook.includes('WALLET_CANARY_CLIENT_COMMIT') && runbook.includes('X-CTG-Wallet-Build-Commit'),
  'Canary runbook must document independent client-build provenance verification.',
)
assert.ok(
  runbook.includes('append-only') && runbook.includes('observation progression'),
  'Canary runbook must document durable reconciliation progression evidence.',
)

console.log('CTG One Wallet Canary Evidence Bundle V1 provenance and progression invariants: PASS')
