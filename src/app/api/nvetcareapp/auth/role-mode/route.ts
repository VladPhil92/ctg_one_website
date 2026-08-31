import { NextResponse, type NextRequest } from 'next/server';
import {
  NVET_ACCESS_COOKIE,
  setNvetRoleModeCookie,
  type NvetRootRoleMode,
} from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';

const ALLOWED_MODES = new Set<NvetRootRoleMode>(['SUPERADMIN', 'CLIENT']);

/**
 * Session-local role switch for the canonical Nvet SUPERADMIN.
 *
 * This endpoint never changes `users.role`. It only stores an httpOnly mode
 * hint after re-validating that the current Nvet + CTG One identity is the
 * canonical root. The Nvet backend independently enforces the same invariant
 * before honoring CLIENT mode on subsequent requests.
 */
export async function POST(request: NextRequest) {
  let body: { mode?: NvetRootRoleMode };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Cuerpo de solicitud inválido' }, { status: 400 });
  }

  if (!body.mode || !ALLOWED_MODES.has(body.mode)) {
    return NextResponse.json({ message: 'Modo de rol inválido' }, { status: 400 });
  }

  const accessToken = request.cookies.get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    return NextResponse.json({ message: 'Sesión de Nvet Care no encontrada' }, { status: 401 });
  }

  const currentUser = await fetchNvetCurrentUser(accessToken);
  if (!currentUser.ok) {
    return NextResponse.json(
      { message: 'No se pudo validar la sesión de Nvet Care' },
      { status: currentUser.status },
    );
  }

  if (!currentUser.user.isSuperadmin) {
    return NextResponse.json(
      { message: 'El cambio de rol está reservado a la identidad SUPERADMIN canónica' },
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    mode: body.mode,
    message:
      body.mode === 'CLIENT'
        ? 'Modo usuario activado. Tu autoridad SUPERADMIN permanece intacta.'
        : 'Modo SUPERADMIN restaurado.',
  });
  setNvetRoleModeCookie(response, body.mode);
  return response;
}
