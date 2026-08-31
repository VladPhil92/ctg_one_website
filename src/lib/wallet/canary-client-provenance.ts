import 'server-only';

export const WALLET_CANARY_CLIENT_VERSION = 'ctg-wallet-canary-client-v1' as const;

const COMMIT_SHA_RE = /^[0-9a-f]{40}$/;

export class WalletCanaryClientProvenanceError extends Error {
  constructor(
    public readonly code:
      | 'WALLET_CANARY_CLIENT_CONFIG_MISSING'
      | 'WALLET_CANARY_CLIENT_CONFIG_INVALID'
      | 'WALLET_CANARY_CLIENT_COMMIT_INVALID'
      | 'WALLET_CANARY_CLIENT_COMMIT_NOT_REVIEWED',
  ) {
    super(code);
    this.name = 'WalletCanaryClientProvenanceError';
  }
}

export function normalizeWalletCanaryClientCommitSha(value: unknown): string {
  const commit = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!COMMIT_SHA_RE.test(commit)) {
    throw new WalletCanaryClientProvenanceError('WALLET_CANARY_CLIENT_COMMIT_INVALID');
  }
  return commit;
}

export function getReviewedWalletCanaryClientCommitSha(): string {
  const configured = process.env.WALLET_CANARY_CLIENT_COMMIT_SHA;
  if (!configured?.trim()) {
    throw new WalletCanaryClientProvenanceError('WALLET_CANARY_CLIENT_CONFIG_MISSING');
  }

  const commit = configured.trim().toLowerCase();
  if (!COMMIT_SHA_RE.test(commit)) {
    throw new WalletCanaryClientProvenanceError('WALLET_CANARY_CLIENT_CONFIG_INVALID');
  }
  return commit;
}

export function assertReviewedWalletCanaryClientCommitSha(value: unknown): string {
  const supplied = normalizeWalletCanaryClientCommitSha(value);
  const reviewed = getReviewedWalletCanaryClientCommitSha();
  if (supplied !== reviewed) {
    throw new WalletCanaryClientProvenanceError('WALLET_CANARY_CLIENT_COMMIT_NOT_REVIEWED');
  }
  return supplied;
}
