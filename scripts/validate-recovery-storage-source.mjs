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

  if (value.startsWith('sb_secret_')) return 'modern-secret';
  if (value.startsWith('sb_publishable_')) {
    throw new Error('RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY contains a publishable key; use a server-only Supabase Secret key (sb_secret_...).');
  }

  const payload = decodeJwtPayload(value);
  if (payload?.role === 'service_role') return 'legacy-service-role';
  if (payload) {
    throw new Error(`RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY contains a JWT for role '${String(payload.role ?? 'unknown')}'; recovery requires service_role privileges.`);
  }

  throw new Error('RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY is not a recognized Supabase server credential. Use Settings > API Keys > Secret keys and copy an sb_secret_... key (preferred), or a valid legacy service_role JWT.');
}

export function storageCredentialFailureMessage(providerMessage = '') {
  if (/invalid compact jws/i.test(providerMessage)) {
    return 'Production Storage rejected RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY as an invalid JWT/JWS. Replace the GitHub secret with a current Supabase Secret key from Settings > API Keys > Secret keys (sb_secret_... preferred).';
  }
  if (/invalid.*(?:api )?key|unauthori[sz]ed|jwt|forbidden|permission/i.test(providerMessage)) {
    return 'Production Storage rejected RECOVERY_PRODUCTION_SUPABASE_SECRET_KEY. Verify that the GitHub secret contains a current server-only Secret key for the reviewed production project.';
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
