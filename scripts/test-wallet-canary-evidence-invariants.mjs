import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

const [evidence, route, migration, runbook] = await Promise.all([
  read('src/lib/wallet/canary-evidence.ts'),
  read('src/app/api/wallet/intents/[intentId]/evidence/route.ts'),
  read('supabase/migrations/20260830235000_0088_wallet_chain_reconciliation_v1.sql'),
  read('docs/WALLET_CANARY_RUNBOOK.md'),
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
  'normalizeWalletCanaryEvidenceIntent(rawIntent)',
  'probeRuntimeSchemaCompatibility()',
  'getDeploymentMetadata()',
  'buildWalletCanaryEvidenceBundleV1({',
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
  assert.ok(migration.includes(field), `Migration 0088 missing evidence field: ${field}`)
  assert.ok(route.includes(`'${field}'`), `Evidence route does not select canonical field: ${field}`)
}

const combined = `${evidence}\n${route}`
for (const forbidden of [
  'privateKey',
  'seedPhrase',
  'mnemonic',
  'sendTransaction(',
  'eth_sendTransaction',
  'wallet_journal_entries_v2',
  'wallet_journal_postings_v2',
  '.insert(',
  '.update(',
  '.delete(',
  '.rpc(',
]) {
  assert.ok(!combined.includes(forbidden), `Canary evidence path crossed read-only boundary: ${forbidden}`)
}

assert.ok(
  !evidence.includes('authorizedWalletAddress'),
  'Sanitized evidence bundle must not expose the stored authorized wallet field.',
)
assert.ok(
  !route.includes("'user_id',"),
  'Evidence SELECT must not fetch canonical user_id into the response payload.',
)
assert.ok(
  evidence.indexOf('const canonical = {') < evidence.indexOf("createHash('sha256')")
    && evidence.indexOf("createHash('sha256')") < evidence.indexOf('generatedAt: new Date().toISOString()'),
  'Bundle digest must cover canonical evidence before the non-deterministic generatedAt timestamp is added.',
)
assert.ok(
  runbook.includes('GET /api/wallet/intents/<intentId>/evidence'),
  'Canary runbook must document the canonical evidence bundle endpoint.',
)

console.log('CTG One Wallet Canary Evidence Bundle V1 invariants: PASS')
