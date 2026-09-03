import { NextResponse } from 'next/server';

import {
  federationSecretState,
  isValidPkceVerifier,
  pkceChallengeForVerifier,
  sha256Hex,
  VERTICE_FEDERATION_PROVIDER,
} from '@/lib/federation/vertice';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ExchangeBody = {
  code?: unknown;
  code_verifier?: unknown;
};

function noStoreJson(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson({ error: 'FEDERATION_UNAVAILABLE' }, 503);
  }

  const secretState = federationSecretState(request);
  if (secretState === 'unconfigured') {
    return noStoreJson({ error: 'FEDERATION_SECRET_NOT_CONFIGURED' }, 503);
  }
  if (secretState !== 'authorized') {
    return noStoreJson({ error: 'UNAUTHORIZED' }, 401);
  }

  let body: ExchangeBody;
  try {
    body = await request.json() as ExchangeBody;
  } catch {
    return noStoreJson({ error: 'INVALID_JSON' }, 400);
  }

  const code = typeof body.code === 'string' ? body.code : '';
  if (!/^[A-Za-z0-9_-]{43}$/.test(code) || !isValidPkceVerifier(body.code_verifier)) {
    return noStoreJson({ error: 'INVALID_EXCHANGE_REQUEST' }, 400);
  }

  const codeHash = sha256Hex(code);
  const challenge = pkceChallengeForVerifier(body.code_verifier);
  const consumedAt = new Date().toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('identity_federation_authorization_codes')
    .update({ consumed_at: consumedAt })
    .eq('provider', VERTICE_FEDERATION_PROVIDER)
    .eq('code_hash', codeHash)
    .eq('code_challenge', challenge)
    .is('consumed_at', null)
    .gt('expires_at', consumedAt)
    .select('subject_user_id, subject_email, subject_email_verified')
    .maybeSingle();

  if (error) {
    return noStoreJson({ error: 'FEDERATION_EXCHANGE_FAILED' }, 503);
  }
  if (!data || !data.subject_email_verified) {
    return noStoreJson({ error: 'INVALID_OR_EXPIRED_CODE' }, 401);
  }

  // Authorities are server-managed attestations. They are never derived from
  // user_metadata or other user-editable claims. VERTICE uses the bootstrap
  // authority only to establish its first superadmin; ongoing grants are
  // managed inside VERTICE itself.
  const { data: authorityRows, error: authorityError } = await admin
    .from('identity_federation_authorities')
    .select('authority')
    .eq('provider', VERTICE_FEDERATION_PROVIDER)
    .eq('subject_user_id', data.subject_user_id)
    .is('revoked_at', null);

  if (authorityError) {
    return noStoreJson({ error: 'FEDERATION_AUTHORITY_LOOKUP_FAILED' }, 503);
  }

  return noStoreJson({
    provider: VERTICE_FEDERATION_PROVIDER,
    subject: data.subject_user_id,
    email: data.subject_email,
    email_verified: true,
    authorities: (authorityRows ?? []).map((row) => row.authority),
  }, 200);
}
