import { getNvetApiUrl } from './session';
import { isCanonicalNvetSuperadminSession } from './superadmin';

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

function cleanName(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Calls NestJS GET /api/auth/me server-to-server with the caller's bearer
 * token. Used to decide which role-specific view the dashboard renders —
 * the backend's own guards on each subsequent data call remain the
 * authoritative authorization check.
 *
 * The canonical root identity intentionally reuses the ADMIN view model in
 * this shared router while `dashboard/template.tsx` adds the SUPERADMIN-only
 * control surface. The backend still evaluates that same account as the sole
 * effective SUPERADMIN. Any stray SUPERADMIN value returned for another
 * identity is projected down to ADMIN in the web shell.
 *
 * CTG-provisioned accounts may legitimately have null profile names; missing
 * names therefore no longer turn a valid authenticated session into a 502.
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
    if (typeof raw.id !== 'string' || typeof raw.email !== 'string') {
      return { ok: false, status: 502 };
    }

    const canonicalSuperadmin = await isCanonicalNvetSuperadminSession();
    const upstreamRole = raw.role;
    const effectiveRole: NvetUserRole | undefined = canonicalSuperadmin
      ? 'ADMIN'
      : upstreamRole === 'SUPERADMIN'
        ? 'ADMIN'
        : upstreamRole === 'ADMIN' || upstreamRole === 'VET' || upstreamRole === 'CLIENT'
          ? upstreamRole
          : undefined;

    if (!effectiveRole) {
      return { ok: false, status: 403 };
    }

    const firstName = cleanName(raw.firstName) || (canonicalSuperadmin ? 'Superadmin' : 'Usuario');
    const lastName = cleanName(raw.lastName);

    return {
      ok: true,
      user: {
        id: raw.id,
        email: raw.email,
        firstName,
        lastName,
        role: effectiveRole,
      },
    };
  } catch {
    return { ok: false, status: 502 };
  }
}
