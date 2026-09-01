import { NextResponse, type NextRequest } from 'next/server';
import {
  NVET_ACCESS_COOKIE,
  setNvetRoleModeCookie,
  type NvetRootRoleMode,
} from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';

// Effective backend modes remain deliberately restricted to SUPERADMIN/CLIENT.
// VET_TESTER is handled separately as a root-only presentation sandbox and is
// never forwarded to NestJS as an authority claim.
const ALLOWED_MODES = new Set<NvetRootRoleMode>(['SUPERADMIN', 'CLIENT']);
const VET_TESTER_MODE: NvetRootRoleMode = 'VET_TESTER';

/**
 * Session-local role/presentation switch for the canonical Nvet SUPERADMIN.
 *
 * This endpoint never rewrites persistent account authority. It only stores
 * an httpOnly mode hint after re-validating that the current Nvet + CTG One
 * identity is the canonical root. VET_TESTER is a sandbox presentation mode;
 * real veterinarian BFF routes still require a true VET identity.
 */
export async function POST(request: NextRequest) {
  let body: { mode?: NvetRootRoleMode };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Cuerpo de solicitud inválido' }, { status: 400 });
  }

  const isTesterMode = body.mode === VET_TESTER_MODE;
  if (!body.mode || (!ALLOWED_MODES.has(body.mode) && !isTesterMode)) {
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

  const messages: Record<NvetRootRoleMode, string> = {
    CLIENT: 'Modo usuario activado. Tu autoridad SUPERADMIN permanece intacta.',
    VET_TESTER: 'Vet Tester activado. La vista usa un sandbox y no otorga autoridad veterinaria.',
    SUPERADMIN: 'Modo SUPERADMIN restaurado.',
  };

  const response = NextResponse.json({
    ok: true,
    mode: body.mode,
    message: messages[body.mode],
  });
  setNvetRoleModeCookie(response, body.mode);
  return response;
}
