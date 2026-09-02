import 'server-only';

import { NextResponse } from 'next/server';

import {
  getPrivyUserByCustomAuthId,
  isPrivyUserRegistryConfigured,
  PrivyUserRegistryError,
} from '@/lib/wallet/privy-user-registry';

export const dynamic = 'force-dynamic';

const READINESS_VERSION = 'ctg-wallet-provider-readiness-v1' as const;
const READINESS_PROBE_CUSTOM_USER_ID = 'ctg-one-provider-readiness-probe-v1';
const PROVIDER_PROBE_CACHE_TTL_MS = 30_000;

type ReadinessCheck = {
  ready: boolean;
  code: string;
};

type ProviderReadiness = {
  version: typeof READINESS_VERSION;
  ready: boolean;
  check: ReadinessCheck;
};

type CachedProbe = {
  expiresAt: number;
  check: ReadinessCheck;
};

let cachedProbe: CachedProbe | null = null;
let inFlightProbe: Promise<ReadinessCheck> | null = null;

function json(body: ProviderReadiness, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

async function executeProviderProbe(): Promise<ReadinessCheck> {
  if (!isPrivyUserRegistryConfigured()) {
    return {
      ready: false,
      code: 'PRIVY_USER_REGISTRY_NOT_CONFIGURED',
    };
  }

  try {
    await getPrivyUserByCustomAuthId(READINESS_PROBE_CUSTOM_USER_ID);
    return {
      ready: true,
      code: 'PRIVY_USER_REGISTRY_READY',
    };
  } catch (error) {
    return {
      ready: false,
      code: error instanceof PrivyUserRegistryError
        ? error.code
        : 'PRIVY_USER_REGISTRY_UNAVAILABLE',
    };
  }
}

async function readProviderProbe(): Promise<ReadinessCheck> {
  const now = Date.now();
  if (cachedProbe && cachedProbe.expiresAt > now) {
    return cachedProbe.check;
  }

  if (!inFlightProbe) {
    inFlightProbe = executeProviderProbe();
  }

  try {
    const check = await inFlightProbe;
    cachedProbe = {
      expiresAt: Date.now() + PROVIDER_PROBE_CACHE_TTL_MS,
      check,
    };
    return check;
  } finally {
    inFlightProbe = null;
  }
}

/**
 * Public, non-mutating infrastructure probe for the Privy user registry.
 *
 * The provider-backed lookup is globally deduplicated per runtime and cached
 * briefly so anonymous traffic cannot amplify directly into Privy User
 * Management calls. Client responses remain no-store; only the bounded
 * server-side readiness decision is reused for 30 seconds.
 *
 * This endpoint deliberately exposes only a bounded readiness code. It never
 * returns an App ID, App Secret, Privy DID, wallet address, custom user id,
 * access token or linked-account data. User-specific ownership remains behind
 * the authenticated /api/wallet/identity/provider-ownership boundary.
 */
export async function GET() {
  const check = await readProviderProbe();
  return json(
    {
      version: READINESS_VERSION,
      ready: check.ready,
      check,
    },
    check.ready ? 200 : 503,
  );
}
