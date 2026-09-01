import 'server-only';

import { createPublicKey, type KeyObject } from 'node:crypto';
import type { JsonWebKey as NodeJsonWebKey } from 'node:crypto';

export const CANONICAL_PRIVY_APP_ID = 'cmlw949vu00yi0cl1kkpbhh30';

const JWKS_TIMEOUT_MS = 4_000;
const JWKS_CACHE_TTL_MS = 5 * 60 * 1_000;

type PrivyServerTrustCode =
  | 'PRIVY_APP_ID_MISMATCH'
  | 'PRIVY_JWKS_UNAVAILABLE'
  | 'PRIVY_JWKS_INVALID'
  | 'PRIVY_VERIFICATION_KEY_MISSING'
  | 'PRIVY_VERIFICATION_KEY_INVALID'
  | 'PRIVY_VERIFICATION_KEY_INCOMPATIBLE'
  | 'PRIVY_VERIFICATION_KEY_NOT_FOUND';

export class PrivyServerTrustError extends Error {
  constructor(public readonly code: PrivyServerTrustCode, message: string) {
    super(message);
    this.name = 'PrivyServerTrustError';
  }
}

type ParsedPrivyJwk = {
  kid: string | null;
  key: KeyObject;
};

type JwksCache = {
  expiresAt: number;
  keys: ParsedPrivyJwk[];
};

let jwksCache: JwksCache | null = null;

function isEcP256Key(key: KeyObject): boolean {
  if (key.asymmetricKeyType !== 'ec') return false;
  const curve = key.asymmetricKeyDetails?.namedCurve;
  return curve === 'prime256v1' || curve === 'P-256';
}

function parseVerificationKey(rawKey: string): KeyObject {
  try {
    let key: KeyObject;
    if (rawKey.startsWith('{')) {
      const jwk = JSON.parse(rawKey) as NodeJsonWebKey;
      if (jwk.kty !== 'EC' || jwk.crv !== 'P-256') {
        throw new PrivyServerTrustError(
          'PRIVY_VERIFICATION_KEY_INCOMPATIBLE',
          'Configured Privy verification key is not EC P-256.',
        );
      }
      key = createPublicKey({ key: jwk, format: 'jwk' });
    } else {
      key = createPublicKey(rawKey.replace(/\\n/g, '\n'));
    }

    if (!isEcP256Key(key)) {
      throw new PrivyServerTrustError(
        'PRIVY_VERIFICATION_KEY_INCOMPATIBLE',
        'Configured Privy verification key is not EC P-256.',
      );
    }

    return key;
  } catch (error) {
    if (error instanceof PrivyServerTrustError) throw error;
    throw new PrivyServerTrustError(
      'PRIVY_VERIFICATION_KEY_INVALID',
      'Configured Privy verification key is malformed.',
    );
  }
}

function parseJwk(raw: unknown): ParsedPrivyJwk | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const jwk = raw as NodeJsonWebKey & {
    alg?: unknown;
    kid?: unknown;
    use?: unknown;
    key_ops?: unknown;
  };

  if (jwk.kty !== 'EC' || jwk.crv !== 'P-256') return null;
  if (jwk.alg !== undefined && jwk.alg !== 'ES256') return null;
  if (jwk.use !== undefined && jwk.use !== 'sig') return null;
  if (
    jwk.key_ops !== undefined &&
    (!Array.isArray(jwk.key_ops) || !jwk.key_ops.includes('verify'))
  ) {
    return null;
  }

  try {
    const key = createPublicKey({ key: jwk, format: 'jwk' });
    if (!isEcP256Key(key)) return null;
    return {
      kid: typeof jwk.kid === 'string' && jwk.kid.trim() ? jwk.kid.trim() : null,
      key,
    };
  } catch {
    return null;
  }
}

export function getPrivyAppId(): string {
  const configured = (
    process.env.PRIVY_APP_ID?.trim() ||
    process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() ||
    ''
  );

  if (configured && configured !== CANONICAL_PRIVY_APP_ID) {
    throw new PrivyServerTrustError(
      'PRIVY_APP_ID_MISMATCH',
      'Configured Privy app id does not match the canonical CTG Wallet application.',
    );
  }

  return CANONICAL_PRIVY_APP_ID;
}

function getPrivyJwksUrls(appId: string): string[] {
  const explicit = process.env.PRIVY_JWKS_URL?.trim();
  if (explicit) return [explicit];

  const encoded = encodeURIComponent(appId);
  return [
    `https://auth.privy.io/api/v1/apps/${encoded}/jwks.json`,
    `https://auth.privy.io/api/v1/apps/${encoded}/.well-known/jwks.json`,
  ];
}

async function fetchPrivyJwks(appId: string, forceRefresh = false): Promise<ParsedPrivyJwk[]> {
  const now = Date.now();
  if (!forceRefresh && jwksCache && jwksCache.expiresAt > now) {
    return jwksCache.keys;
  }

  let sawInvalidPayload = false;

  for (const url of getPrivyJwksUrls(appId)) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(JWKS_TIMEOUT_MS),
      });
    } catch {
      continue;
    }

    if (!response.ok) continue;

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      sawInvalidPayload = true;
      continue;
    }

    const keys =
      payload && typeof payload === 'object' && !Array.isArray(payload) && 'keys' in payload
        ? (payload as { keys?: unknown }).keys
        : null;

    if (!Array.isArray(keys)) {
      sawInvalidPayload = true;
      continue;
    }

    const parsed = keys.map(parseJwk).filter((key): key is ParsedPrivyJwk => key !== null);
    if (parsed.length === 0) {
      sawInvalidPayload = true;
      continue;
    }

    jwksCache = {
      expiresAt: now + JWKS_CACHE_TTL_MS,
      keys: parsed,
    };
    return parsed;
  }

  throw new PrivyServerTrustError(
    sawInvalidPayload ? 'PRIVY_JWKS_INVALID' : 'PRIVY_JWKS_UNAVAILABLE',
    sawInvalidPayload
      ? 'Privy JWKS did not contain a usable ES256 P-256 verification key.'
      : 'Privy JWKS could not be reached.',
  );
}

function selectJwksKey(keys: ParsedPrivyJwk[], kid: string | null): KeyObject | null {
  if (kid) {
    const matches = keys.filter((entry) => entry.kid === kid);
    return matches.length === 1 ? matches[0].key : null;
  }

  return keys.length === 1 ? keys[0].key : null;
}

export async function getPrivyVerificationKey(kid: string | null): Promise<KeyObject> {
  const configuredKey = process.env.PRIVY_JWT_VERIFICATION_KEY?.trim();
  if (configuredKey) return parseVerificationKey(configuredKey);

  const appId = getPrivyAppId();
  let keys = await fetchPrivyJwks(appId);
  let selected = selectJwksKey(keys, kid);
  if (selected) return selected;

  // Unknown kid may indicate key rotation. Refresh once before failing closed.
  keys = await fetchPrivyJwks(appId, true);
  selected = selectJwksKey(keys, kid);
  if (selected) return selected;

  throw new PrivyServerTrustError(
    'PRIVY_VERIFICATION_KEY_NOT_FOUND',
    'No unique Privy ES256 verification key matches the identity-token header.',
  );
}

export async function inspectPrivyServerTrust(): Promise<{ ready: boolean; code: string }> {
  try {
    const appId = getPrivyAppId();
    const configuredKey = process.env.PRIVY_JWT_VERIFICATION_KEY?.trim();
    if (configuredKey) {
      parseVerificationKey(configuredKey);
    } else {
      await fetchPrivyJwks(appId);
    }
    return { ready: true, code: 'PRIVY_IDENTITY_VERIFIER_READY' };
  } catch (error) {
    if (error instanceof PrivyServerTrustError) {
      return { ready: false, code: error.code };
    }
    return { ready: false, code: 'PRIVY_VERIFICATION_KEY_INVALID' };
  }
}
