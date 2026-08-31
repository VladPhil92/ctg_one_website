import 'server-only';

import { cookies } from 'next/headers';
import { NVET_ROLE_MODE_COOKIE } from './session';

/**
 * Builds the server-to-server authorization headers for Nvet Care.
 *
 * `X-Nvet-Acting-Role` is deliberately emitted only from the server and only
 * for CLIENT mode. It is not an authority claim: Nvet's JwtStrategy ignores
 * it for every identity except the canonical SUPERADMIN verified from the
 * database + CTG One link.
 */
export async function getNvetAuthorizationHeaders(
  accessToken: string,
  extra: Record<string, string> = {},
): Promise<Record<string, string>> {
  const roleMode = (await cookies()).get(NVET_ROLE_MODE_COOKIE)?.value;

  return {
    Authorization: `Bearer ${accessToken}`,
    ...(roleMode === 'CLIENT' ? { 'X-Nvet-Acting-Role': 'CLIENT' } : {}),
    ...extra,
  };
}
