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

type ProviderReadiness = {
  version: typeof READINESS_VERSION;
  ready: boolean;
  check: {
    ready: boolean;
    code: string;
  };
};

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

/**
 * Public, non-mutating infrastructure probe for the Privy user registry.
 *
 * This endpoint deliberately exposes only a bounded readiness code. It never
 * returns an App ID, App Secret, Privy DID, wallet address, custom user id,
 * access token or linked-account data. A 404/no user for the synthetic lookup
 * is a healthy result because it proves that the configured server credential
 * can reach the read-only Privy User Management endpoint.
 *
 * User-specific ownership remains behind the authenticated
 * /api/wallet/identity/provider-ownership boundary.
 */
export async function GET() {
  if (!isPrivyUserRegistryConfigured()) {
    return json(
      {
        version: READINESS_VERSION,
        ready: false,
        check: {
          ready: false,
          code: 'PRIVY_USER_REGISTRY_NOT_CONFIGURED',
        },
      },
      503,
    );
  }

  try {
    await getPrivyUserByCustomAuthId(READINESS_PROBE_CUSTOM_USER_ID);
    return json(
      {
        version: READINESS_VERSION,
        ready: true,
        check: {
          ready: true,
          code: 'PRIVY_USER_REGISTRY_READY',
        },
      },
      200,
    );
  } catch (error) {
    const code = error instanceof PrivyUserRegistryError
      ? error.code
      : 'PRIVY_USER_REGISTRY_UNAVAILABLE';

    return json(
      {
        version: READINESS_VERSION,
        ready: false,
        check: {
          ready: false,
          code,
        },
      },
      503,
    );
  }
}
