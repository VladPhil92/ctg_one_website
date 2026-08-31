import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

const [
  evidence,
  evidenceRoute,
  clientProvenance,
  clientBindRoute,
  preflightRoute,
  migration0088,
  migration0089,
  runbook,
  cors,
  schemaVersion,
] = await Promise.all([
  read('src/lib/wallet/canary-evidence.ts'),
  read('src/app/api/wallet/intents/[intentId]/evidence/route.ts'),
  read('src/lib/wallet/canary-client-provenance.ts'),
  read('src/app/api/wallet/intents/[intentId]/canary-client/route.ts'),
  read('src/app/api/wallet/canary/preflight/route.ts'),
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
  'clientArtifact',
  'boundAt: string',
  'observations: observations.map',
  "input.intent.status === 'reconciled' || input.intent.status === 'failed'",
]) {
  assert.ok(evidence.includes(fragment), `Canary evidence builder missing invariant: ${fragment}`)
}

for (const fragment of [
  "const CORS_METHODS = ['GET', 'OPTIONS']",
  '/evidence',
  'createAuthenticatedRequestContext(request)',
  ".from('wallet_intents_v2')",
  ".eq('id', intentId)",
  ".eq('user_id', auth.user.id)",
  "'canary_client_commit_sha'",
  "'canary_client_bound_at'",
  "WALLET_CANARY_EVIDENCE_CLIENT_PROVENANCE_MISSING",
  ".from('wallet_chain_reconciliation_observations_v1')",
  ".eq('intent_id', intentId)",
  ".eq('subject_user_id', auth.user.id)",
  ".order('checked_at', { ascending: true })",
  ".order('id', { ascending: true })",
  'normalizeWalletCanaryEvidenceIntent(rawIntent)',
  'normalizeWalletCanaryEvidenceObservation',
  'probeRuntimeSchemaCompatibility()',
  'getDeploymentMetadata()',
  'buildWalletCanaryEvidenceBundleV1({',
  "repository: 'VladPhil92/CTG-Wallet'",
  'commit: clientCommit',
  'boundAt: clientBoundAt',
  'return noStoreJson(request, bundle)',
]) {
  assert.ok(evidenceRoute.includes(fragment), `Canary evidence route missing invariant: ${fragment}`)
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
  assert.ok(evidenceRoute.includes(`'${field}'`), `Evidence route does not select canonical field: ${field}`)
}

for (const fragment of [
  'add column if not exists canary_client_commit_sha text',
  'add column if not exists canary_client_bound_at timestamptz',
  'wallet_intents_v2_canary_client_binding_check',
  'create table if not exists public.wallet_chain_reconciliation_observations_v1',
  'subject_user_id uuid not null references public.profiles(id)',
  'enable row level security',
  'revoke all on table public.wallet_chain_reconciliation_observations_v1',
  'revoke insert, update, delete, truncate on table public.wallet_chain_reconciliation_observations_v1',
  'capture_wallet_chain_reconciliation_observation_v1',
  'new.chain_last_checked_at is not distinct from old.chain_last_checked_at',
  'new.chain_reconciliation_digest_sha256',
  'on conflict on constraint wallet_chain_reconciliation_observations_v1_intent_digest_unique do nothing',
  'create or replace function public.bind_wallet_canary_client_v1_server',
  "v_intent.status <> 'authorized'",
  'v_intent.tx_hash is not null',
  'v_intent.submitted_at is not null',
  "raise exception 'WALLET_CANARY_CLIENT_COMMIT_CONFLICT'",
  "grant execute on function public.bind_wallet_canary_client_v1_server(uuid, uuid, text)",
]) {
  assert.ok(migration0089.includes(fragment), `Migration 0089 missing provenance/journal invariant: ${fragment}`)
}

for (const fragment of [
  "WALLET_CANARY_CLIENT_VERSION = 'ctg-wallet-canary-client-v1'",
  'process.env.WALLET_CANARY_CLIENT_COMMIT_SHA',
  'assertReviewedWalletCanaryClientCommitSha',
  "WALLET_CANARY_CLIENT_COMMIT_NOT_REVIEWED",
]) {
  assert.ok(clientProvenance.includes(fragment), `Reviewed client provenance boundary missing: ${fragment}`)
}

for (const fragment of [
  "const ALLOWED_BODY_KEYS = new Set(['version', 'clientCommitSha'])",
  'createAuthenticatedRequestContext(request)',
  'assertReviewedWalletCanaryClientCommitSha(value.clientCommitSha)',
  'assertWalletCryptoSendExecutionAllowed(auth.user.id)',
  "admin.rpc('bind_wallet_canary_client_v1_server'",
  'p_user_id: auth.user.id',
  'p_intent_id: intentId',
  'p_client_commit_sha: clientCommitSha',
  'data.clientCommitSha !== clientCommitSha',
]) {
  assert.ok(clientBindRoute.includes(fragment), `Canary client binding route missing invariant: ${fragment}`)
}

for (const fragment of [
  "const ALLOWED_BODY_KEYS = new Set(['version', 'clientCommitSha'])",
  'assertReviewedWalletCanaryClientCommitSha(value.clientCommitSha)',
  'reviewedClientCommit: true',
  'const reviewedClientCommit = Boolean(clientCommitSha)',
  '&& reviewedClientCommit',
]) {
  assert.ok(preflightRoute.includes(fragment), `Canary preflight missing reviewed client invariant: ${fragment}`)
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
  assert.ok(!evidenceRoute.includes(forbidden), `Canary evidence route crossed safety boundary: ${forbidden}`)
  assert.ok(!clientBindRoute.includes(forbidden), `Canary client binding route crossed safety boundary: ${forbidden}`)
}

for (const forbidden of ['.insert(', '.update(', '.delete(', '.rpc(']) {
  assert.ok(!evidenceRoute.includes(forbidden), `Canary evidence route crossed read-only persistence boundary: ${forbidden}`)
}

assert.ok(
  !evidence.includes('authorizedWalletAddress'),
  'Sanitized evidence bundle must not expose the stored authorized wallet field.',
)
const selectStart = evidenceRoute.indexOf('const EVIDENCE_SELECT = [')
const selectEnd = evidenceRoute.indexOf('].join', selectStart)
assert.ok(selectStart >= 0 && selectEnd > selectStart, 'Evidence SELECT declaration must remain explicit and auditable.')
const evidenceSelect = evidenceRoute.slice(selectStart, selectEnd)
assert.ok(
  !evidenceSelect.includes("'user_id'"),
  'Evidence SELECT must not fetch canonical user_id into the response payload.',
)
assert.ok(
  evidenceRoute.includes(".eq('user_id', auth.user.id)"),
  'Evidence lookup must remain scoped to the authenticated canonical owner.',
)
assert.ok(
  !cors.includes('X-CTG-Wallet-Build-Commit'),
  'Durable provenance binding makes a client-supplied evidence header unnecessary.',
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
  'Durable client provenance and ordered reconciliation history must both be bound into bundleDigestSha256.',
)
assert.ok(
  runbook.includes('WALLET_CANARY_CLIENT_COMMIT_SHA')
    && runbook.includes('POST /api/wallet/intents/<intentId>/canary-client')
    && runbook.includes('canary_client_commit_sha'),
  'Canary runbook must document server-reviewed durable client binding.',
)
assert.ok(
  runbook.includes('GET /api/wallet/intents/<intentId>/evidence')
    && runbook.includes('append-only')
    && runbook.includes('observation progression'),
  'Canary runbook must document evidence retrieval and durable reconciliation progression.',
)

console.log('CTG One Wallet durable canary client provenance and evidence progression invariants: PASS')
