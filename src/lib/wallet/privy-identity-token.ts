import 'server-only';

import { verify as verifySignature } from 'node:crypto';

import {
  getPrivyAppId,
  getPrivyVerificationKey,
  PrivyServerTrustError,
} from '@/lib/wallet/privy-server-trust';

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const PRIVY_USER_ID_RE = /^did:privy:[A-Za-z0-9._:-]+$/;
const MAX_CLOCK_SKEW_SECONDS = 60;
const MAX_TOKEN_AGE_SECONDS = 2 * 60 * 60;

export class PrivyIdentityTokenError extends Error {
  constructor(
    public readonly code:
      | 'PRIVY_IDENTITY_NOT_CONFIGURED'
      | 'INVALID_PRIVY_IDENTITY_TOKEN'
      | 'PRIVY_IDENTITY_EXPIRED'
      | 'PRIVY_IDENTITY_RELATIONSHIP_MISMATCH'
      | 'PRIVY_EMBEDDED_WALLET_NOT_FOUND'
      | 'PRIVY_EMBEDDED_WALLET_AMBIGUOUS'
      | 'LEGACY_WALLET_MISMATCH',
    message: string,
  ) {
    super(message);
    this.name = 'PrivyIdentityTokenError';
  }
}

type JsonObject = Record<string, unknown>;

type PrivyIdentityClaims = {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  linked_accounts: string;
};

export type VerifiedPrivyIdentity = {
  privyUserId: string;
  canonicalCtgUserId: string;
  embeddedEvmAddress: string;
  issuedAt: number;
  expiresAt: number;
};

function decodeBase64UrlJson(segment: string): JsonObject {
  try {
    const decoded = Buffer.from(segment, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('JWT segment is not an object');
    }
    return parsed as JsonObject;
  } catch {
    throw new PrivyIdentityTokenError(
      'INVALID_PRIVY_IDENTITY_TOKEN',
      'Privy identity token contains invalid JSON.',
    );
  }
}

function requireClaims(payload: JsonObject, expectedAppId: string): PrivyIdentityClaims {
  const { sub, iss, aud, iat, exp, linked_accounts: linkedAccounts } = payload;

  if (
    typeof sub !== 'string' || !PRIVY_USER_ID_RE.test(sub) ||
    iss !== 'privy.io' ||
    aud !== expectedAppId ||
    typeof iat !== 'number' || !Number.isFinite(iat) ||
    typeof exp !== 'number' || !Number.isFinite(exp) ||
    typeof linkedAccounts !== 'string'
  ) {
    throw new PrivyIdentityTokenError(
      'INVALID_PRIVY_IDENTITY_TOKEN',
      'Privy identity token claims are invalid.',
    );
  }

  const now = Math.floor(Date.now() / 1000);
  if (exp < now - MAX_CLOCK_SKEW_SECONDS) {
    throw new PrivyIdentityTokenError(
      'PRIVY_IDENTITY_EXPIRED',
      'Privy identity token has expired.',
    );
  }
  if (iat > now + MAX_CLOCK_SKEW_SECONDS || now - iat > MAX_TOKEN_AGE_SECONDS) {
    throw new PrivyIdentityTokenError(
      'INVALID_PRIVY_IDENTITY_TOKEN',
      'Privy identity token issuance time is outside the accepted window.',
    );
  }
  if (exp <= iat || exp - iat > MAX_TOKEN_AGE_SECONDS) {
    throw new PrivyIdentityTokenError(
      'INVALID_PRIVY_IDENTITY_TOKEN',
      'Privy identity token lifetime is invalid.',
    );
  }

  return { sub, iss, aud, iat, exp, linked_accounts: linkedAccounts };
}

function parseLinkedAccounts(value: string): JsonObject[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) throw new Error('linked_accounts is not an array');
    return parsed.filter(
      (account): account is JsonObject => !!account && typeof account === 'object' && !Array.isArray(account),
    );
  } catch {
    throw new PrivyIdentityTokenError(
      'INVALID_PRIVY_IDENTITY_TOKEN',
      'Privy identity token linked_accounts claim is invalid.',
    );
  }
}

function readString(account: JsonObject, snake: string, camel: string): string | null {
  const value = account[snake] ?? account[camel];
  return typeof value === 'string' ? value : null;
}

function readNumber(account: JsonObject, snake: string, camel: string): number | null {
  const value = account[snake] ?? account[camel];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function selectEmbeddedEvmWallet(
  accounts: JsonObject[],
  expectedLegacyAddress?: string | null,
): string {
  const candidates = accounts
    .filter((account) => account.type === 'wallet')
    .map((account) => ({
      address: readString(account, 'address', 'address'),
      chainType: readString(account, 'chain_type', 'chainType'),
      walletClientType: readString(account, 'wallet_client_type', 'walletClientType'),
      walletIndex: readNumber(account, 'wallet_index', 'walletIndex'),
    }))
    .filter(
      (account): account is { address: string; chainType: string; walletClientType: string; walletIndex: number | null } =>
        account.address !== null &&
        account.chainType === 'ethereum' &&
        account.walletClientType === 'privy' &&
        EVM_ADDRESS_RE.test(account.address),
    );

  if (candidates.length === 0) {
    throw new PrivyIdentityTokenError(
      'PRIVY_EMBEDDED_WALLET_NOT_FOUND',
      'No verified Privy embedded EVM wallet is present in the identity token.',
    );
  }

  const expected = expectedLegacyAddress?.trim().toLowerCase() || null;
  if (expected) {
    if (!EVM_ADDRESS_RE.test(expected)) {
      throw new PrivyIdentityTokenError(
        'LEGACY_WALLET_MISMATCH',
        'Expected legacy wallet address is invalid.',
      );
    }
    const match = candidates.find((candidate) => candidate.address.toLowerCase() === expected);
    if (!match) {
      throw new PrivyIdentityTokenError(
        'LEGACY_WALLET_MISMATCH',
        'Signed Privy identity does not contain the expected legacy EVM wallet.',
      );
    }
    return match.address.toLowerCase();
  }

  if (candidates.length === 1) return candidates[0].address.toLowerCase();

  const indexZero = candidates.filter((candidate) => candidate.walletIndex === 0);
  if (indexZero.length === 1) return indexZero[0].address.toLowerCase();

  throw new PrivyIdentityTokenError(
    'PRIVY_EMBEDDED_WALLET_AMBIGUOUS',
    'Privy identity contains multiple embedded EVM wallets without a unique primary candidate.',
  );
}

export async function verifyPrivyIdentityToken(params: {
  token: string;
  canonicalCtgUserId: string;
  expectedLegacyAddress?: string | null;
}): Promise<VerifiedPrivyIdentity> {
  let appId: string;
  try {
    appId = getPrivyAppId();
  } catch (error) {
    if (error instanceof PrivyServerTrustError) {
      throw new PrivyIdentityTokenError(
        'PRIVY_IDENTITY_NOT_CONFIGURED',
        `Privy server trust is not configured: ${error.code}.`,
      );
    }
    throw error;
  }

  const segments = params.token.trim().split('.');
  if (segments.length !== 3 || segments.some((segment) => segment.length === 0)) {
    throw new PrivyIdentityTokenError(
      'INVALID_PRIVY_IDENTITY_TOKEN',
      'Privy identity token must be a three-segment JWT.',
    );
  }

  const [encodedHeader, encodedPayload, encodedSignature] = segments;
  const header = decodeBase64UrlJson(encodedHeader);
  if (header.alg !== 'ES256') {
    throw new PrivyIdentityTokenError(
      'INVALID_PRIVY_IDENTITY_TOKEN',
      'Privy identity token must use ES256.',
    );
  }
  const kid = typeof header.kid === 'string' && header.kid.trim() ? header.kid.trim() : null;

  let signature: Buffer;
  try {
    signature = Buffer.from(encodedSignature, 'base64url');
  } catch {
    throw new PrivyIdentityTokenError(
      'INVALID_PRIVY_IDENTITY_TOKEN',
      'Privy identity token signature is malformed.',
    );
  }
  if (signature.length !== 64) {
    throw new PrivyIdentityTokenError(
      'INVALID_PRIVY_IDENTITY_TOKEN',
      'Privy ES256 identity-token signature has an invalid length.',
    );
  }

  let verificationKey;
  try {
    verificationKey = await getPrivyVerificationKey(kid);
  } catch (error) {
    if (error instanceof PrivyServerTrustError) {
      if (error.code === 'PRIVY_VERIFICATION_KEY_NOT_FOUND') {
        throw new PrivyIdentityTokenError(
          'INVALID_PRIVY_IDENTITY_TOKEN',
          'Privy identity token references an unknown verification key.',
        );
      }
      throw new PrivyIdentityTokenError(
        'PRIVY_IDENTITY_NOT_CONFIGURED',
        `Privy identity verifier is unavailable: ${error.code}.`,
      );
    }
    throw error;
  }

  const signingInput = Buffer.from(`${encodedHeader}.${encodedPayload}`, 'ascii');
  const valid = verifySignature(
    'sha256',
    signingInput,
    { key: verificationKey, dsaEncoding: 'ieee-p1363' },
    signature,
  );
  if (!valid) {
    throw new PrivyIdentityTokenError(
      'INVALID_PRIVY_IDENTITY_TOKEN',
      'Privy identity token signature verification failed.',
    );
  }

  const claims = requireClaims(decodeBase64UrlJson(encodedPayload), appId);
  const accounts = parseLinkedAccounts(claims.linked_accounts);

  const customAuthAccounts = accounts
    .filter((account) => account.type === 'custom_auth')
    .map((account) => readString(account, 'custom_user_id', 'customUserId'));

  if (
    customAuthAccounts.length !== 1 ||
    customAuthAccounts[0] !== params.canonicalCtgUserId
  ) {
    throw new PrivyIdentityTokenError(
      'PRIVY_IDENTITY_RELATIONSHIP_MISMATCH',
      'Signed Privy identity is not uniquely linked to the authenticated CTG user.',
    );
  }

  return {
    privyUserId: claims.sub,
    canonicalCtgUserId: params.canonicalCtgUserId,
    embeddedEvmAddress: selectEmbeddedEvmWallet(accounts, params.expectedLegacyAddress),
    issuedAt: claims.iat,
    expiresAt: claims.exp,
  };
}
