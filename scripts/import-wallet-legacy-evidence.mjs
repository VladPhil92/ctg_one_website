import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

import {
  WalletLegacyEvidenceError,
  parseWalletLegacyEvidence,
  planWalletLegacyEvidenceImport,
} from './lib/wallet-legacy-evidence.mjs';

const SELECTS = Object.freeze({
  profiles: 'id',
  evidence: 'id,user_id,provider,provider_user_id,expected_address_normalized,source_digest_sha256,evidence_captured_at,status',
  identityLinks: 'id,user_id,provider,provider_user_id,status,link_mode',
  externalAccounts: 'id,user_id,provider,chain_family,account_kind,address_normalized,status,is_primary,legacy_preserved',
});

function usage() {
  return [
    'Usage:',
    '  node scripts/import-wallet-legacy-evidence.mjs --input /secure/path/evidence.json',
    '  node scripts/import-wallet-legacy-evidence.mjs --input /secure/path/evidence.json --apply --confirm-digest <sha256>',
    '',
    'Dry-run/preflight is the default. --apply never updates or deletes existing evidence.',
  ].join('\n');
}

function parseArgs(argv) {
  const args = { input: null, apply: false, confirmDigest: null, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input') args.input = argv[++index] ?? null;
    else if (arg === '--confirm-digest') args.confirmDigest = argv[++index] ?? null;
    else if (arg === '--apply') args.apply = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(usage());
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!args.input) throw new Error('--input is required.');
  return args;
}

function decodeJwtPayload(token) {
  const segments = token.split('.');
  if (segments.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function getPrivilegedSupabaseConfig() {
  const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const secretKey = (process.env.SUPABASE_SECRET_KEY ?? '').trim();
  const legacyServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  const key = secretKey || legacyServiceRoleKey;

  if (!url) throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required.');
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
      throw new Error('Supabase URL must use HTTPS outside local development.');
    }
  } catch (error) {
    if (error instanceof TypeError) throw new Error('Supabase URL must be an absolute URL.');
    throw error;
  }

  if (!key) {
    throw new Error('SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required for trusted evidence import.');
  }
  if (key.startsWith('sb_publishable_')) {
    throw new Error('A publishable key cannot import trusted legacy evidence.');
  }

  if (secretKey) {
    if (!secretKey.startsWith('sb_secret_')) {
      throw new Error('SUPABASE_SECRET_KEY must be a Supabase sb_secret_ server key.');
    }
    return { url, key: secretKey, keyKind: 'secret' };
  }

  const payload = decodeJwtPayload(legacyServiceRoleKey);
  if (!payload || payload.role !== 'service_role') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must decode to role=service_role.');
  }
  return { url, key: legacyServiceRoleKey, keyKind: 'service_role' };
}

function chunks(values, size = 100) {
  const result = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

async function selectInChunks(supabase, table, select, column, values) {
  if (values.length === 0) return [];
  const deduped = [...new Set(values)];
  const rows = [];
  for (const batch of chunks(deduped)) {
    const { data, error } = await supabase.from(table).select(select).in(column, batch);
    if (error) throw new Error(`${table} preflight failed: ${error.message}`);
    rows.push(...(data ?? []));
  }
  const byId = new Map();
  for (const row of rows) byId.set(row.id ?? JSON.stringify(row), row);
  return [...byId.values()];
}

async function loadDatabaseSnapshot(supabase, document) {
  const userIds = document.records.map((record) => record.canonicalUserId);
  const privyUserIds = document.records.map((record) => record.privyUserId);
  const addresses = document.records.map((record) => record.normalizedAddress);

  const [profiles, evidenceByUser, evidenceByPrivy, evidenceByAddress, linksByUser, linksByPrivy, accountsByUser, accountsByAddress] = await Promise.all([
    selectInChunks(supabase, 'profiles', SELECTS.profiles, 'id', userIds),
    selectInChunks(supabase, 'wallet_legacy_migration_evidence', SELECTS.evidence, 'user_id', userIds),
    selectInChunks(supabase, 'wallet_legacy_migration_evidence', SELECTS.evidence, 'provider_user_id', privyUserIds),
    selectInChunks(supabase, 'wallet_legacy_migration_evidence', SELECTS.evidence, 'expected_address_normalized', addresses),
    selectInChunks(supabase, 'wallet_identity_links', SELECTS.identityLinks, 'user_id', userIds),
    selectInChunks(supabase, 'wallet_identity_links', SELECTS.identityLinks, 'provider_user_id', privyUserIds),
    selectInChunks(supabase, 'wallet_external_accounts', SELECTS.externalAccounts, 'user_id', userIds),
    selectInChunks(supabase, 'wallet_external_accounts', SELECTS.externalAccounts, 'address_normalized', addresses),
  ]);

  const mergeById = (...groups) => {
    const merged = new Map();
    for (const group of groups) for (const row of group) merged.set(row.id, row);
    return [...merged.values()];
  };

  return {
    profiles,
    evidence: mergeById(evidenceByUser, evidenceByPrivy, evidenceByAddress),
    identityLinks: mergeById(linksByUser, linksByPrivy),
    externalAccounts: mergeById(accountsByUser, accountsByAddress),
  };
}

function summarize(document, plan, mode, keyKind) {
  return {
    mode,
    schemaVersion: document.schemaVersion,
    capturedAt: document.capturedAt,
    source: document.source,
    sourceDigestSha256: document.sourceDigestSha256,
    privilegedKeyKind: keyKind,
    records: document.records.length,
    inserts: plan.inserts.length,
    alreadyPresent: plan.alreadyPresent.length,
    conflicts: plan.conflicts.length,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rawBytes = await readFile(args.input);
  const document = parseWalletLegacyEvidence(rawBytes);

  if (args.apply && /^synthetic(?:-|$)/i.test(document.source)) {
    throw new Error('Synthetic legacy evidence artifacts cannot be applied to a database.');
  }

  const config = getPrivilegedSupabaseConfig();
  const supabase = createClient(config.url, config.key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const database = await loadDatabaseSnapshot(supabase, document);
  const plan = planWalletLegacyEvidenceImport(document, database);
  const mode = args.apply ? 'apply' : 'dry-run';
  const summary = summarize(document, plan, mode, config.keyKind);

  if (args.json) console.log(JSON.stringify({ summary, conflicts: plan.conflicts }, null, 2));
  else {
    console.log(`Legacy wallet evidence ${mode}:`);
    console.log(`  digest: ${document.sourceDigestSha256}`);
    console.log(`  records: ${summary.records}`);
    console.log(`  inserts: ${summary.inserts}`);
    console.log(`  already present: ${summary.alreadyPresent}`);
    console.log(`  conflicts: ${summary.conflicts}`);
    for (const conflict of plan.conflicts) {
      console.error(`  CONFLICT ${conflict.code}: ${conflict.canonicalUserId} / ${conflict.privyUserId} / ${conflict.normalizedAddress}`);
    }
  }

  if (plan.conflicts.length > 0) {
    throw new WalletLegacyEvidenceError('PREFLIGHT_CONFLICT', 'Legacy evidence preflight found conflicts. No writes were attempted.', {
      conflicts: plan.conflicts,
    });
  }

  if (!args.apply) {
    console.log('DRY_RUN_OK — no database writes were attempted.');
    return;
  }

  const confirmed = (args.confirmDigest ?? '').trim().toLowerCase();
  if (!confirmed || confirmed !== document.sourceDigestSha256) {
    throw new Error('--apply requires --confirm-digest matching the exact SHA-256 printed by the dry-run.');
  }

  if (plan.inserts.length === 0) {
    console.log('APPLY_NOOP — every record is already present with identical immutable provenance.');
    return;
  }

  const { data, error } = await supabase
    .from('wallet_legacy_migration_evidence')
    .insert(plan.inserts)
    .select('id,user_id,provider,provider_user_id,expected_address_normalized,source_digest_sha256,evidence_captured_at,status');

  if (error) {
    throw new Error(`Legacy evidence insert failed: ${error.message}`);
  }
  if ((data ?? []).length !== plan.inserts.length) {
    throw new Error('Legacy evidence insert returned an unexpected row count. Stop and review database state.');
  }

  console.log(`APPLY_OK — inserted ${data.length} immutable legacy migration evidence row(s).`);
}

main().catch((error) => {
  const code = error instanceof WalletLegacyEvidenceError ? error.code : 'IMPORT_FAILED';
  console.error(`${code}: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
