import 'server-only';

import { createHash, createPublicKey, verify } from 'node:crypto';

const BASE64_SIGNATURE = /^[A-Za-z0-9+/]{80,88}={0,2}$/;

export type RewardsSourceSignatureInput = {
  connectorCode: string;
  timestamp: string;
  nonce: string;
  payloadDigest: string;
};

export function sha256Hex(value: string | Buffer) {
  return createHash('sha256').update(value).digest('hex');
}

export function buildRewardsSourceCanonical(input: RewardsSourceSignatureInput) {
  return [
    'ctg-rewards-source-v1',
    input.connectorCode,
    input.timestamp,
    input.nonce,
    input.payloadDigest,
  ].join('\n');
}

export function inspectEd25519PublicKey(publicKeyPem: string) {
  const key = createPublicKey(publicKeyPem);
  if (key.asymmetricKeyType !== 'ed25519') {
    throw new Error('Rewards source connector public key must be Ed25519');
  }
  const der = key.export({ type: 'spki', format: 'der' });
  return {
    normalizedPem: key.export({ type: 'spki', format: 'pem' }).toString(),
    fingerprintSha256: sha256Hex(der),
  };
}

export function verifyRewardsSourceSignature(args: RewardsSourceSignatureInput & { publicKeyPem: string; signatureBase64: string }) {
  if (!BASE64_SIGNATURE.test(args.signatureBase64)) return false;
  let signature: Buffer;
  try {
    signature = Buffer.from(args.signatureBase64, 'base64');
  } catch {
    return false;
  }
  if (signature.length !== 64) return false;

  try {
    const key = createPublicKey(args.publicKeyPem);
    if (key.asymmetricKeyType !== 'ed25519') return false;
    return verify(
      null,
      Buffer.from(buildRewardsSourceCanonical(args), 'utf8'),
      key,
      signature,
    );
  } catch {
    return false;
  }
}
