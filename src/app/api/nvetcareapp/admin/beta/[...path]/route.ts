import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { getNvetAuthorizationHeaders } from '@/lib/nvetcareapp/request';
import { getNvetApiUrl, NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';

const GET_PATHS = new Set([
  'readiness',
  'cohort',
  'activation',
  'evidence/summary',
  'evidence/history',
]);

const POST_STATIC_PATHS = new Set([
  'cohort/invite',
  'activation/authorize',
  'activation/revoke',
  'evidence',
]);

const DYNAMIC_POST_PATH = /^(?:cohort\/[^/]+\/revoke|evidence\/[^/]+\/(?:approve|reject|revoke))$/;
const MAX_BODY_BYTES = 8_000;

async function authorizeRoot() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return { ok: false as const, status: 401, accessToken: null };

  const currentUser = await fetchNvetCurrentUser(accessToken);
  if (!currentUser.ok) return { ok: false as const, status: currentUser.status, accessToken: null };

  if (
    !currentUser.user.isSuperadmin ||
    currentUser.user.isClientMode ||
    currentUser.user.isVetTesterMode
  ) {
    return { ok: false as const, status: 403, accessToken: null };
  }

  return { ok: true as const, status: 200, accessToken };
}

function isAllowed(method: 'GET' | 'POST', path: string) {
  if (method === 'GET') return GET_PATHS.has(path);
  return POST_STATIC_PATHS.has(path) || DYNAMIC_POST_PATH.test(path);
}

async function proxy(request: NextRequest, method: 'GET' | 'POST', path: string) {
  if (!isAllowed(method, path)) {
    return NextResponse.json({ message: 'Operación beta no permitida' }, { status: 404 });
  }

  const authorization = await authorizeRoot();
  if (!authorization.ok || !authorization.accessToken) {
    const message = authorization.status === 401
      ? 'No autenticado'
      : 'Operaciones Beta reservadas al SUPERADMIN en modo real';
    return NextResponse.json({ message }, { status: authorization.status });
  }

  let body: string | undefined;
  if (method === 'POST') {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return NextResponse.json({ message: 'Se requiere application/json' }, { status: 415 });
    }

    body = await request.text();
    if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
      return NextResponse.json({ message: 'Solicitud demasiado grande' }, { status: 413 });
    }

    try {
      JSON.parse(body || '{}');
    } catch {
      return NextResponse.json({ message: 'JSON inválido' }, { status: 400 });
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${getNvetApiUrl()}/api/beta/${path}`, {
      method,
      headers: await getNvetAuthorizationHeaders(authorization.accessToken, {
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      }),
      ...(method === 'POST' ? { body: body || '{}' } : {}),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'Backend Nvet no disponible' }, { status: 502 });
  }

  const responseText = await upstream.text();
  let payload: unknown = null;
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = { message: upstream.ok ? 'Respuesta inválida del backend' : 'Operación rechazada por Nvet' };
    }
  }

  return NextResponse.json(payload, { status: upstream.status });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(request, 'GET', path.join('/'));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return proxy(request, 'POST', path.join('/'));
}
