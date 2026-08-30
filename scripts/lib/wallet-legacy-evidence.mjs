import { createHash } from 'node:crypto';

export const WALLET_LEGACY_EVIDENCE_SCHEMA_VERSION = 'ctg-wallet-legacy-evidence-v1';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIVY_USER_ID_RE = /^did:privy:\S{1,245}$/;
const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const TOP_LEVEL_KEYS = ['captured_at', 'records', 'schema_version', 'source'];
const RECORD_KEYS = ['canonical_user_id', 'privy_user_id', 'wallet_address', 'wallet_type'];

export class WalletLegacyEvidenceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'WalletLegacyEvidenceError';
    this.code = code;
    this.details = details;
  }
}

function assertExactKeys(value, expectedKeys, label) {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new WalletLegacyEvidenceError(
      'INVALID_EVIDENCE_SHAPE',
      `${label} must contain exactly: ${expected.join(', ')}`,
      { label, actual, expected },
    );
  }
}

function assertNonEmptyString(value, label, maxLength = 255) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new WalletLegacyEvidenceError('INVALID_EVIDENCE_VALUE', `${label} is invalid.`, { label });
  }
  return value.trim();
}

function normalizeTimestamp(value) {
  const capturedAt = assertNonEmptyString(value, 'captured_at', 64);
  const parsed = new Date(capturedAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new WalletLegacyEvidenceError('INVALID_CAPTURE_TIMESTAMP', 'captured_at must be a valid ISO-8601 timestamp.');
  }
  if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(capturedAt)) {
    throw new WalletLegacyEvidenceError('INVALID_CAPTURE_TIMESTAMP', 'captured_at must include an explicit timezone.');
  }
  return parsed.toISOString();
}

export function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function normalizeEvmAddress(address) {
  return address.trim().toLowerCase();
}

export function parseWalletLegacyEvidence(rawBytes) {
  const bytes = Buffer.isBuffer(rawBytes) ? rawBytes : Buffer.from(rawBytes);
  const sourceDigestSha256 = sha256Hex(bytes);
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new WalletLegacyEvidenceError('INVALID_JSON', 'Legacy wallet evidence must be valid UTF-8 JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new WalletLegacyEvidenceError('INVALID_EVIDENCE_SHAPE', 'Legacy wallet evidence must be a JSON object.');
  }
  assertExactKeys(parsed, TOP_LEVEL_KEYS, 'evidence document');
  if (parsed.schema_version !== WALLET_LEGACY_EVIDENCE_SCHEMA_VERSION) {
    throw new WalletLegacyEvidenceError(
      'UNSUPPORTED_SCHEMA_VERSION',
      `schema_version must equal ${WALLET_LEGACY_EVIDENCE_SCHEMA_VERSION}.`,
    );
  }

  const capturedAt = normalizeTimestamp(parsed.captured_at);
  const source = assertNonEmptyString(parsed.source, 'source', 512);
  if (!Array.isArray(parsed.records) || parsed.records.length === 0 || parsed.records.length > 10_000) {
    throw new WalletLegacyEvidenceError('INVALID_RECORD_COUNT', 'records must contain between 1 and 10000 entries.');
  }

  const seenUsers = new Map();
  const seenPrivyUsers = new Map();
  const seenAddresses = new Map();
  const records = parsed.records.map((record, index) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new WalletLegacyEvidenceError('INVALID_RECORD', `records[${index}] must be an object.`, { index });
    }
    assertExactKeys(record, RECORD_KEYS, `records[${index}]`);

    const canonicalUserId = assertNonEmptyString(record.canonical_user_id, `records[${index}].canonical_user_id`);
    const privyUserId = assertNonEmptyString(record.privy_user_id, `records[${index}].privy_user_id`);
    const walletAddress = assertNonEmptyString(record.wallet_address, `records[${index}].wallet_address`);
    const walletType = assertNonEmptyString(record.wallet_type, `records[${index}].wallet_type`, 64);

    if (!UUID_RE.test(canonicalUserId)) {
      throw new WalletLegacyEvidenceError('INVALID_CANONICAL_USER_ID', `records[${index}] has an invalid canonical_user_id.`, { index });
    }
    if (!PRIVY_USER_ID_RE.test(privyUserId)) {
      throw new WalletLegacyEvidenceError('INVALID_PRIVY_USER_ID', `records[${index}] has an invalid privy_user_id.`, { index });
    }
    if (!EVM_ADDRESS_RE.test(walletAddress)) {
      throw new WalletLegacyEvidenceError('INVALID_EVM_ADDRESS', `records[${index}] has an invalid wallet_address.`, { index });
    }
    if (walletType !== 'privy_embedded') {
      throw new WalletLegacyEvidenceError('INVALID_WALLET_TYPE', `records[${index}].wallet_type must be privy_embedded.`, { index });
    }

    const normalizedAddress = normalizeEvmAddress(walletAddress);
    const duplicateChecks = [
      [seenUsers, canonicalUserId.toLowerCase(), 'DUPLICATE_CANONICAL_USER'],
      [seenPrivyUsers, privyUserId, 'DUPLICATE_PRIVY_USER'],
      [seenAddresses, normalizedAddress, 'DUPLICATE_EVM_ADDRESS'],
    ];
    for (const [seen, key, code] of duplicateChecks) {
      if (seen.has(key)) {
        throw new WalletLegacyEvidenceError(code, `records[${index}] conflicts with records[${seen.get(key)}].`, {
          index,
          conflictingIndex: seen.get(key),
        });
      }
      seen.set(key, index);
    }

    return Object.freeze({
      canonicalUserId: canonicalUserId.toLowerCase(),
      privyUserId,
      walletAddress,
      normalizedAddress,
      walletType,
    });
  });

  return Object.freeze({
    schemaVersion: WALLET_LEGACY_EVIDENCE_SCHEMA_VERSION,
    capturedAt,
    source,
    sourceDigestSha256,
    records: Object.freeze(records),
  });
}

function rowsBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows ?? []) {
    const key = keyFn(row);
    if (!key) continue;
    const bucket = map.get(key) ?? [];
    bucket.push(row);
    map.set(key, bucket);
  }
  return map;
}

function sameEvidence(existing, document, record) {
  return String(existing.user_id).toLowerCase() === record.canonicalUserId &&
    existing.provider === 'privy' &&
    existing.provider_user_id === record.privyUserId &&
    existing.expected_address_normalized === record.normalizedAddress &&
    existing.source_digest_sha256 === document.sourceDigestSha256 &&
    new Date(existing.evidence_captured_at).toISOString() === document.capturedAt;
}

export function planWalletLegacyEvidenceImport(document, database) {
  if (!document || !SHA256_RE.test(document.sourceDigestSha256 ?? '')) {
    throw new WalletLegacyEvidenceError('INVALID_DOCUMENT', 'A validated evidence document is required.');
  }

  const profileIds = new Set((database.profiles ?? []).map((row) => String(row.id).toLowerCase()));
  const evidenceByUser = rowsBy(database.evidence, (row) => String(row.user_id ?? '').toLowerCase());
  const evidenceByPrivy = rowsBy(database.evidence, (row) => row.provider_user_id);
  const evidenceByAddress = rowsBy(database.evidence, (row) => row.expected_address_normalized);
  const linksByUser = rowsBy(database.identityLinks, (row) => String(row.user_id ?? '').toLowerCase());
  const linksByPrivy = rowsBy(database.identityLinks, (row) => row.provider_user_id);
  const accountsByAddress = rowsBy(database.externalAccounts, (row) => row.address_normalized);
  const primaryAccountsByUser = rowsBy(
    (database.externalAccounts ?? []).filter((row) => row.chain_family === 'evm' && row.is_primary === true && row.status !== 'revoked'),
    (row) => String(row.user_id ?? '').toLowerCase(),
  );

  const inserts = [];
  const alreadyPresent = [];
  const conflicts = [];

  for (const record of document.records) {
    const conflict = (code, message, details = {}) => conflicts.push({
      code,
      message,
      canonicalUserId: record.canonicalUserId,
      privyUserId: record.privyUserId,
      normalizedAddress: record.normalizedAddress,
      ...details,
    });

    if (!profileIds.has(record.canonicalUserId)) {
      conflict('CANONICAL_PROFILE_NOT_FOUND', 'Canonical CTG profile does not exist.');
      continue;
    }

    let exactExistingEvidence = null;
    const existingEvidence = evidenceByUser.get(record.canonicalUserId) ?? [];
    if (existingEvidence.length > 1) {
      conflict('AMBIGUOUS_EXISTING_EVIDENCE', 'More than one legacy evidence row exists for the canonical user.');
      continue;
    }
    if (existingEvidence.length === 1) {
      const existing = existingEvidence[0];
      if (!sameEvidence(existing, document, record)) {
        conflict('EXISTING_EVIDENCE_PROVENANCE_DIFFERS', 'Existing immutable legacy evidence differs from this source artifact.', {
          evidenceId: existing.id,
          status: existing.status,
        });
        continue;
      }
      if (existing.status === 'rejected') {
        conflict('EXISTING_EVIDENCE_REJECTED', 'Matching immutable legacy evidence is rejected and requires operator review.', {
          evidenceId: existing.id,
        });
        continue;
      }
      exactExistingEvidence = existing;
    }

    const providerEvidence = evidenceByPrivy.get(record.privyUserId) ?? [];
    if (providerEvidence.some((row) => String(row.user_id).toLowerCase() !== record.canonicalUserId)) {
      conflict('PRIVY_EVIDENCE_ALREADY_CLAIMED', 'Privy identity is already present in migration evidence for another CTG user.');
      continue;
    }
    const addressEvidence = evidenceByAddress.get(record.normalizedAddress) ?? [];
    if (addressEvidence.some((row) => String(row.user_id).toLowerCase() !== record.canonicalUserId)) {
      conflict('ADDRESS_EVIDENCE_ALREADY_CLAIMED', 'EVM address is already present in migration evidence for another CTG user.');
      continue;
    }

    const userLinks = linksByUser.get(record.canonicalUserId) ?? [];
    if (userLinks.some((row) => row.provider === 'privy' && row.provider_user_id !== record.privyUserId)) {
      conflict('CANONICAL_USER_LINK_CONFLICT', 'Canonical CTG user is already linked to a different Privy identity.');
      continue;
    }
    const matchingUserLinks = userLinks.filter((row) => row.provider === 'privy' && row.provider_user_id === record.privyUserId);
    if (matchingUserLinks.some((row) => row.status === 'revoked')) {
      conflict('REVOKED_IDENTITY_LINK', 'Matching Privy identity link is revoked and requires operator review.');
      continue;
    }
    if (matchingUserLinks.some((row) => row.link_mode !== 'legacy_preserve')) {
      conflict('IDENTITY_LINK_MODE_CONFLICT', 'Existing Privy identity link was not created in legacy_preserve mode.');
      continue;
    }

    const providerLinks = linksByPrivy.get(record.privyUserId) ?? [];
    if (providerLinks.some((row) => String(row.user_id).toLowerCase() !== record.canonicalUserId)) {
      conflict('PRIVY_IDENTITY_LINK_CONFLICT', 'Privy identity is already linked to another CTG user.');
      continue;
    }

    const addressAccounts = accountsByAddress.get(record.normalizedAddress) ?? [];
    if (addressAccounts.some((row) => String(row.user_id).toLowerCase() !== record.canonicalUserId)) {
      conflict('EVM_ADDRESS_LINK_CONFLICT', 'EVM address is already linked to another CTG user.');
      continue;
    }
    if (addressAccounts.some((row) => row.status === 'revoked')) {
      conflict('REVOKED_EVM_ACCOUNT', 'Matching EVM account is revoked and requires operator review.');
      continue;
    }
    if (addressAccounts.some((row) => row.provider !== 'privy' || row.account_kind !== 'embedded')) {
      conflict('EVM_ACCOUNT_ASSOCIATION_CONFLICT', 'Existing EVM account association conflicts with the expected embedded Privy wallet.');
      continue;
    }

    const primaryAccounts = primaryAccountsByUser.get(record.canonicalUserId) ?? [];
    if (primaryAccounts.some((row) => row.address_normalized !== record.normalizedAddress)) {
      conflict('PRIMARY_EVM_WALLET_CONFLICT', 'Canonical CTG user already has a different active primary EVM wallet.');
      continue;
    }

    if (exactExistingEvidence) {
      alreadyPresent.push({
        record,
        status: exactExistingEvidence.status,
        evidenceId: exactExistingEvidence.id,
      });
      continue;
    }

    inserts.push({
      user_id: record.canonicalUserId,
      provider: 'privy',
      provider_user_id: record.privyUserId,
      chain_family: 'evm',
      expected_address: record.walletAddress,
      source_digest_sha256: document.sourceDigestSha256,
      evidence_captured_at: document.capturedAt,
    });
  }

  return Object.freeze({
    inserts: Object.freeze(inserts),
    alreadyPresent: Object.freeze(alreadyPresent),
    conflicts: Object.freeze(conflicts),
  });
}
