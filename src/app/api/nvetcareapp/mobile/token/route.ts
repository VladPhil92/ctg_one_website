import { NextResponse, type NextRequest } from 'next/server';
import { getNvetApiUrl } from '@/lib/nvetcareapp/session';
import {
  isAllowedMobileRedirect,
  isValidPkceVerifier,
  NVET_MOBILE_FEDERATION_PROVIDER,
  readMobileFederationCode,
  sha256Hex,
  verifyPkce,
  type NvetMobileFederationCode,
} from '@/lib/nvetcareapp/mobile-federation';
import {
  createAdminClient,
  isSupabaseConfigured,
} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const JSON_MIME = 'application/json';
const MAX_BODY_BYTES = 12 * 1024;
const RATE_SCOPE = 'federation.nvet.mobile.exchange';
const RATE_ACTOR = 'nvet';
const REQUEST_KEYS = new Set([
  'code',
  'codeVerifier',
  'redirectUri',
  'twoFactorCode',
]);

type TokenRequest = {
  code?: unknown;
  codeVerifier?: unknown;
  redirectUri?: unknown;
  twoFactorCode?: unknown;
};

type ServiceRateLimitRow = {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
};

function securityHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  };
}

function json(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    status,
    headers: { ...securityHeaders(), ...extraHeaders },
  });
}

function requestMime(request: NextRequest): string {
  return (request.headers.get('content-type') ?? '')
    .split(';', 1)[0]
    .trim()
    .toLowerCase();
}

async function readBoundedJson(request: NextRequest): Promise<TokenRequest | null> {
  const lengthHeader = request.headers.get('content-length');
  if (lengthHeader) {
    const length = Number(lengthHeader);
    if (!Number.isFinite(length) || length < 0) return null;
    if (length > MAX_BODY_BYTES) throw new Error('PAYLOAD_TOO_LARGE');
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    throw new Error('PAYLOAD_TOO_LARGE');
  }

  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  if (Object.keys(record).some((key) => !REQUEST_KEYS.has(key))) return null;
  return record;
}

async function releaseTwoFactorReservation(
  admin: ReturnType<typeof createAdminClient>,
  codeHash: string,
  consumedAt: string,
): Promise<void> {
  await admin
    .from('identity_federation_authorization_codes')
    .update({ consumed_at: null })
    .eq('provider', NVET_MOBILE_FEDERATION_PROVIDER)
    .eq('code_hash', codeHash)
    .eq('consumed_at', consumedAt);
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'FEDERATION_UNAVAILABLE' }, 503);
  }

  const admin = createAdminClient();
  const { data: rateData, error: rateError } = await admin.rpc(
    'consume_service_api_rate_limit',
    { p_scope: RATE_SCOPE, p_actor_key: RATE_ACTOR },
  );
  if (rateError) {
    return json({ error: 'FEDERATION_RATE_LIMIT_UNAVAILABLE' }, 503);
  }

  const rateRow = (
    Array.isArray(rateData) ? rateData[0] : rateData
  ) as ServiceRateLimitRow | null;
  if (!rateRow) {
    return json({ error: 'FEDERATION_RATE_LIMIT_UNAVAILABLE' }, 503);
  }
  if (rateRow.allowed !== true) {
    const retryAfterSeconds = Math.max(
      1,
      Number(rateRow.retry_after_seconds ?? 1),
    );
    return json(
      { error: 'RATE_LIMITED', retryAfterSeconds },
      429,
      { 'Retry-After': String(retryAfterSeconds) },
    );
  }

  if (requestMime(request) !== JSON_MIME) {
    return json({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415);
  }

  let body: TokenRequest | null;
  try {
    body = await readBoundedJson(request);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'INVALID_JSON' },
      error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE' ? 413 : 400,
    );
  }

  if (
    !body ||
    typeof body.code !== 'string' ||
    body.code.length < 64 ||
    body.code.length > 10_000 ||
    !isValidPkceVerifier(body.codeVerifier) ||
    typeof body.redirectUri !== 'string' ||
    !isAllowedMobileRedirect(body.redirectUri) ||
    (body.twoFactorCode !== undefined && typeof body.twoFactorCode !== 'string')
  ) {
    return json({ error: 'INVALID_EXCHANGE_REQUEST' }, 400);
  }

  let sealed: NvetMobileFederationCode;
  try {
    sealed = readMobileFederationCode(body.code);
  } catch {
    return json({ error: 'INVALID_OR_EXPIRED_CODE' }, 401);
  }

  if (
    sealed.redirectUri !== body.redirectUri ||
    !verifyPkce(sealed, body.codeVerifier)
  ) {
    return json({ error: 'PKCE_VERIFICATION_FAILED' }, 401);
  }

  const codeHash = sha256Hex(body.code);
  const consumedAt = new Date().toISOString();
  const { data: reservation, error: reserveError } = await admin
    .from('identity_federation_authorization_codes')
    .update({ consumed_at: consumedAt })
    .eq('provider', NVET_MOBILE_FEDERATION_PROVIDER)
    .eq('code_hash', codeHash)
    .eq('code_challenge', sealed.codeChallenge)
    .is('consumed_at', null)
    .gt('expires_at', consumedAt)
    .select('subject_user_id, subject_email_verified')
    .maybeSingle();

  if (reserveError) {
    return json({ error: 'FEDERATION_EXCHANGE_FAILED' }, 503);
  }
  if (
    !reservation ||
    reservation.subject_email_verified !== true ||
    reservation.subject_user_id !== sealed.subject
  ) {
    return json({ error: 'INVALID_OR_REPLAYED_CODE' }, 401);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${getNvetApiUrl()}/api/auth/ctg-identity-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: JSON.stringify({
        supabaseAccessToken: sealed.supabaseAccessToken,
        twoFactorCode:
          typeof body.twoFactorCode === 'string' && body.twoFactorCode.trim()
            ? body.twoFactorCode.trim()
            : undefined,
      }),
      cache: 'no-store',
    });
  } catch {
    return json({ error: 'NVET_UPSTREAM_UNAVAILABLE' }, 502);
  }

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok) {
    if (data?.error === 'TWO_FACTOR_REQUIRED') {
      await releaseTwoFactorReservation(admin, codeHash, consumedAt);
    }
    return json(
      data ?? { error: 'NVET_IDENTITY_EXCHANGE_FAILED' },
      upstream.status || 401,
    );
  }

  if (!data?.accessToken || !data?.refreshToken || !data?.user?.id) {
    return json({ error: 'INCOMPLETE_FEDERATED_SESSION' }, 502);
  }

  return json({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user,
    requiresEmailVerification: data.requiresEmailVerification,
    remainingRecoveryCodes: data.remainingRecoveryCodes,
    warning: data.warning ?? null,
  });
}
