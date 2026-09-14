import 'server-only';

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export const NVET_MOBILE_FEDERATION_PROVIDER = 'nvet';
export const NVET_MOBILE_FEDERATION_CODE_TTL_SECONDS = 90;
export const NVET_MOBILE_FEDERATION_CODE_TTL_MS =
  NVET_MOBILE_FEDERATION_CODE_TTL_SECONDS * 1000;
export const NVET_MOBILE_REDIRECT_URI = 'nvetcare://auth/ctgone/callback';

export type NvetMobileFederationCode = {
  version: 1;
  subject: string;
  supabaseAccessToken: string;
  codeChallenge: string;
  redirectUri: typeof NVET_MOBILE_REDIRECT_URI;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

function federationKey(): Buffer {
  const secret = process.env.CTG_NVET_MOBILE_FEDERATION_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error(
      'CTG_NVET_MOBILE_FEDERATION_SECRET must be configured with at least 32 bytes',
    );
  }
  return createHash('sha256').update(secret, 'utf8').digest();
}

function toBase64Url(value: Buffer): string {
  return value.toString('base64url');
}

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function isValidPkceChallenge(value: string | null): value is string {
  return Boolean(value && /^[A-Za-z0-9_-]{43}$/.test(value));
}

export function isValidPkceVerifier(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9._~-]{43,128}$/.test(value);
}

export function isValidFederationState(value: string | null): value is string {
  return Boolean(value && /^[A-Za-z0-9._~-]{32,160}$/.test(value));
}

export function isAllowedMobileRedirect(
  value: string | null,
): value is typeof NVET_MOBILE_REDIRECT_URI {
  return value === NVET_MOBILE_REDIRECT_URI;
}

export function createMobileFederationCode(input: {
  subject: string;
  supabaseAccessToken: string;
  codeChallenge: string;
  redirectUri: typeof NVET_MOBILE_REDIRECT_URI;
}): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: NvetMobileFederationCode = {
    version: 1,
    subject: input.subject,
    supabaseAccessToken: input.supabaseAccessToken,
    codeChallenge: input.codeChallenge,
    redirectUri: input.redirectUri,
    issuedAt: now,
    expiresAt: now + NVET_MOBILE_FEDERATION_CODE_TTL_SECONDS,
    nonce: randomBytes(18).toString('base64url'),
  };

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', federationKey(), iv);
  cipher.setAAD(Buffer.from('ctgone:nvet-mobile-federation:v1', 'utf8'));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `v1.${toBase64Url(iv)}.${toBase64Url(ciphertext)}.${toBase64Url(tag)}`;
}

export function readMobileFederationCode(code: string): NvetMobileFederationCode {
  const [version, ivValue, ciphertextValue, tagValue, extra] = code.split('.');
  if (version !== 'v1' || !ivValue || !ciphertextValue || !tagValue || extra) {
    throw new Error('INVALID_FEDERATION_CODE');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    federationKey(),
    fromBase64Url(ivValue),
  );
  decipher.setAAD(Buffer.from('ctgone:nvet-mobile-federation:v1', 'utf8'));
  decipher.setAuthTag(fromBase64Url(tagValue));
  const plaintext = Buffer.concat([
    decipher.update(fromBase64Url(ciphertextValue)),
    decipher.final(),
  ]).toString('utf8');
  const payload = JSON.parse(plaintext) as NvetMobileFederationCode;

  const now = Math.floor(Date.now() / 1000);
  if (
    payload.version !== 1 ||
    !payload.subject ||
    !payload.supabaseAccessToken ||
    !isValidPkceChallenge(payload.codeChallenge) ||
    !isAllowedMobileRedirect(payload.redirectUri) ||
    !Number.isFinite(payload.issuedAt) ||
    !Number.isFinite(payload.expiresAt) ||
    payload.expiresAt <= now ||
    payload.expiresAt - payload.issuedAt !==
      NVET_MOBILE_FEDERATION_CODE_TTL_SECONDS
  ) {
    throw new Error('EXPIRED_OR_INVALID_FEDERATION_CODE');
  }

  return payload;
}

export function verifyPkce(
  payload: NvetMobileFederationCode,
  verifier: string,
): boolean {
  if (!isValidPkceVerifier(verifier)) return false;
  const actual = createHash('sha256').update(verifier, 'ascii').digest();
  const expected = Buffer.from(payload.codeChallenge, 'base64url');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
