import { getNvetApiUrl } from './session';

export type NvetUserRole = 'SUPERADMIN' | 'ADMIN' | 'VET' | 'CLIENT';

export interface NvetCurrentUser {
  id: string;
  email: string;
  role: NvetUserRole;
  firstName: string;
  lastName: string;
}

export type NvetCurrentUserResult =
  | { ok: true; user: NvetCurrentUser }
  | { ok: false; status: number };

export function isNvetAdminRole(role: NvetUserRole): boolean {
  return role === 'ADMIN' || role === 'SUPERADMIN';
}

/**
 * Calls NestJS GET /api/auth/me server-to-server with the caller's bearer
 * token. Used to decide which role-specific view the dashboard renders —
 * the backend's own guards on each subsequent data call remain the
 * authoritative authorization check, this is only for routing.
 *
 * SUPERADMIN is intentionally projected to ADMIN in this public-facing
 * web shell. The original JWT is preserved for server-to-server requests,
 * so backend authorization remains authoritative while the UI does not
 * expose a separate privileged entry path. Unknown roles fail closed.
 */
export async function fetchNvetCurrentUser(accessToken: string): Promise<NvetCurrentUserResult> {
  let res: Response;
  try {
    res = await fetch(`${getNvetApiUrl()}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 502 };
  }

  if (!res.ok) {
    return { ok: false, status: res.status };
  }

  try {
    const raw = (await res.json()) as Partial<NvetCurrentUser> & { role?: unknown };
    const effectiveRole = raw.role === 'SUPERADMIN' ? 'ADMIN' : raw.role;

    if (effectiveRole !== 'ADMIN' && effectiveRole !== 'VET' && effectiveRole !== 'CLIENT') {
      return { ok: false, status: 403 };
    }
    if (
      typeof raw.id !== 'string' ||
      typeof raw.email !== 'string' ||
      typeof raw.firstName !== 'string' ||
      typeof raw.lastName !== 'string'
    ) {
      return { ok: false, status: 502 };
    }

    return {
      ok: true,
      user: {
        id: raw.id,
        email: raw.email,
        firstName: raw.firstName,
        lastName: raw.lastName,
        role: effectiveRole,
      },
    };
  } catch {
    return { ok: false, status: 502 };
  }
}
