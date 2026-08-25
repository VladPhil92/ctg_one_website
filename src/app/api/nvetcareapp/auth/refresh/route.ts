import { NextResponse, type NextRequest } from 'next/server';
import {
  NVET_REFRESH_COOKIE,
  clearNvetSessionCookies,
  refreshNvetSession,
  setNvetSessionCookies,
} from '@/lib/nvetcareapp/session';

// Rotates the session using the refresh-token cookie. Called by the
// dashboard client when a BFF call comes back 401, and by middleware
// itself when the access-token cookie has expired.
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(NVET_REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: 'Sesión no encontrada' }, { status: 401 });
  }

  const tokens = await refreshNvetSession(refreshToken);
  if (!tokens) {
    const response = NextResponse.json({ message: 'Sesión expirada' }, { status: 401 });
    clearNvetSessionCookies(response);
    return response;
  }

  const response = NextResponse.json({ ok: true });
  setNvetSessionCookies(response, tokens);
  return response;
}
