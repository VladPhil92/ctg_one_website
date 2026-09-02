import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const VERTICE_CANONICAL_ORIGIN = 'https://vertice.ctgone.com';
export const VERTICE_FEDERATION_PROVIDER = 'vertice' as const;
export const VERTICE_AUTHORIZATION_CODE_TTL_MS = 60_000;

const BASE64URL_43 = /^[A-Za-z0-9_-]{43}$/;
const STATE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;

export function isValidPkceChallenge(value: string | null): value is string {
  return typeof value === 'string' && BASE64URL_43.test(value);
}

export function isValidFederationState(value: string | null): value is string {
  return typeof value === 'string' && STATE_PATTERN.test(value);
}

export function isValidPkceVerifier(value: unknown): value is string {
  return typeof value === 'string' && VERIFIER_PATTERN.test(value);
}

export function createAuthorizationCode(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function pkceChallengeForVerifier(verifier: string): string {
  return createHash('sha256').update(verifier, 'utf8').digest('base64url');
}

export function federationSecretState(request: Request): 'unconfigured' | 'authorized' | 'unauthorized' {
  const expected = process.env.VERTICE_FEDERATION_SECRET?.trim() ?? '';
  if (expected.length < 32) return 'unconfigured';

  const supplied = request.headers.get('x-ctg-federation-secret')?.trim() ?? '';
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length) return 'unauthorized';
  return timingSafeEqual(expectedBytes, suppliedBytes) ? 'authorized' : 'unauthorized';
}
