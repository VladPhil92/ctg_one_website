import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

export const EXPECTED_PRODUCTION_SUPABASE_URL = 'https://mdscwjvlihdiflcvghhk.supabase.co';

const decodeJwtPayload = (value) => {
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
};

export function classifyRecoveryAdminKey(rawValue) {
  const value = rawValue?.trim();
  if (!value) throw new Error('RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY is missing.');

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    throw new Error('RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY is wrapped in quotes. Store only the raw Supabase server key in the GitHub secret, without quotes.');
  }

  if (/^[A-Z][A-Z0-9_]*\s*=/.test(value)) {
    throw new Error('RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY looks like an environment assignment. Store only the raw key value, without KEY= or variable-name prefixes.');
  }

  if (value.startsWith('sb_secret_')) return 'modern-secret';
  if (value.startsWith('sb_publishable_')) {
    throw new Error('RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY contains a publishable key; use a server-only Supabase Secret key (sb_secret_...).');
  }

  const payload = decodeJwtPayload(value);
  if (payload?.role === 'service_role') return 'legacy-service-role';
  if (payload) {
    throw new Error(`RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY contains a JWT for role '${String(payload.role ?? 'unknown')}'; recovery requires service_role privileges.`);
  }

  if (value.startsWith('eyJ')) {
    throw new Error('RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY looks like a malformed or truncated JWT. Copy the complete legacy service_role key, or preferably use a modern sb_secret_... key.');
  }

  throw new Error('RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY is an unrecognized opaque value. Do not use the project JWT Secret, database password, personal access token, anon key, or publishable key. In Supabase Dashboard open Settings > API Keys and copy a server-only Secret key beginning sb_secret_... (preferred), or the complete legacy service_role JWT. Store only the key value in GitHub Actions.');
}

export function storageCredentialFailureMessage(providerMessage = '') {
  if (/invalid compact jws/i.test(providerMessage)) {
    return 'Production Storage rejected RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY as an invalid JWT/JWS. The configured value is not a usable Storage admin credential. Replace it with a current Supabase Secret key from Settings > API Keys (sb_secret_... preferred), or a complete legacy service_role JWT.';
  }
  if (/invalid.*(?:api )?key|unauthori[sz]ed|jwt|forbidden|permission/i.test(providerMessage)) {
    return 'Production Storage rejected RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY. Verify that GitHub Actions contains a current server-only Secret key for the reviewed production project, not the JWT Secret, anon key, publishable key, database password, or PAT.';
  }
  return 'Production Storage credential preflight failed. Verify RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY in GitHub Actions against Supabase Settings > API Keys before retrying the recovery drill.';
}

export async function validateRecoveryStorageSource({
  sourceUrl,
  sourceKey,
  clientFactory = createClient,
} = {}) {
  const parsed = new URL(sourceUrl);
  if (parsed.origin !== EXPECTED_PRODUCTION_SUPABASE_URL) {
    throw new Error('Production Storage credential preflight refused an unexpected Supabase project origin.');
  }

  const credentialKind = classifyRecoveryAdminKey(sourceKey);
  const client = clientFactory(sourceUrl, sourceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.storage.listBuckets();
  if (error) throw new Error(storageCredentialFailureMessage(error.message));

  return {
    credentialKind,
    bucketCount: (data ?? []).length,
  };
}

async function main() {
  const sourceUrl = process.env.SOURCE_SUPABASE_URL?.trim();
  const sourceKey = process.env.SOURCE_SUPABASE_SECRET_KEY?.trim();
  if (!sourceUrl) throw new Error('SOURCE_SUPABASE_URL is missing.');
  if (!sourceKey) throw new Error('SOURCE_SUPABASE_SECRET_KEY is missing.');

  const result = await validateRecoveryStorageSource({ sourceUrl, sourceKey });
  if (result.credentialKind === 'legacy-service-role') {
    console.warn('::warning::Recovery accepted a legacy service_role JWT. Migrate RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY to a modern sb_secret_... key before legacy keys are retired.');
  }
  console.log(`Production Storage credential preflight PASS (${result.bucketCount} bucket(s) accessible).`);
}

const invokedPath = process.argv[1];
if (invokedPath && pathToFileURL(invokedPath).href === import.meta.url) {
  await main();
}
