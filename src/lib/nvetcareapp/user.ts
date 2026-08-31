import { getNvetApiUrl } from './session';
import { getNvetAuthorizationHeaders } from './request';
import {
  isCanonicalNvetSuperadminSession,
  isCanonicalNvetSuperadminSubject,
} from './superadmin';

export type NvetUserRole = 'SUPERADMIN' | 'ADMIN' | 'VET' | 'CLIENT';

export interface NvetCurrentUser {
  id: string;
  email: string;
  role: NvetUserRole;
  firstName: string;
  lastName: string;
  isSuperadmin: boolean;
  isClientMode: boolean;
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
 * The root projection is dual-bound to both sides of the identity bridge:
 * (1) the current CTG One cookie session must validate as the canonical
 * Supabase subject and (2) the authenticated Nvet user returned by /auth/me
 * must be linked to that same canonical subject through `ctgUserId`. This
 * prevents a stale/mismatched Nvet cookie from inheriting root UI merely
 * because the browser also holds the canonical CTG One session.
 *
 * The canonical root normally reuses the ADMIN read-model. When the root has
 * explicitly activated Modo usuario, the server-to-server request carries
 * `X-Nvet-Acting-Role: CLIENT`; the Nvet backend accepts that hint only for
 * the canonical SUPERADMIN and returns the CLIENT effective role. The root
 * identity marker remains true so a one-click return to SUPERADMIN is always
 * available without mutating the database role.
 *
 * CTG-provisioned accounts may legitimately have null profile names; missing
 * names therefore no longer turn a valid authenticated session into a 502.
 */
export async function fetchNvetCurrentUser(accessToken: string): Promise<NvetCurrentUserResult> {
  let res: Response;
  try {
    res = await fetch(`${getNvetApiUrl()}/api/auth/me`, {
      headers: await getNvetAuthorizationHeaders(accessToken),
      cache: 'no-store',
    });
  } catch {
    return { ok: false, status: 502 };
  }

  if (!res.ok) {
    return { ok: false, status: res.status };
  }

  try {
    const raw = (await res.json()) as Partial<NvetCurrentUser> & {
      role?: unknown;
      ctgUserId?: unknown;
    };
    if (typeof raw.id !== 'string' || typeof raw.email !== 'string') {
      return { ok: false, status: 502 };
    }

    const canonicalSession = await isCanonicalNvetSuperadminSession();
    const canonicalNvetLink =
      typeof raw.ctgUserId === 'string' &&
      isCanonicalNvetSuperadminSubject(raw.ctgUserId);
    const canonicalSuperadmin = canonicalSession && canonicalNvetLink;

    const upstreamRole = raw.role;
    const rootClientMode = canonicalSuperadmin && upstreamRole === 'CLIENT';
    const effectiveRole: NvetUserRole | undefined = canonicalSuperadmin
      ? rootClientMode
        ? 'CLIENT'
        : 'ADMIN'
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
        isSuperadmin: canonicalSuperadmin,
        isClientMode: rootClientMode,
      },
    };
  } catch {
    return { ok: false, status: 502 };
  }
}
