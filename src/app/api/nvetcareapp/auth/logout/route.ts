import { NextResponse, type NextRequest } from 'next/server';
import { NVET_ACCESS_COOKIE, NVET_REFRESH_COOKIE, clearNvetSessionCookies, getNvetApiUrl } from '@/lib/nvetcareapp/session';

// Best-effort revoke on the NestJS side, then always clear the local
// cookies — a failed upstream call shouldn't leave the browser stuck
// with a session cookie it can't use.
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(NVET_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(NVET_REFRESH_COOKIE)?.value;

  if (accessToken) {
    try {
      await fetch(`${getNvetApiUrl()}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
    } catch {
      // Ignore — cookies are cleared below regardless.
    }
  }

  const response = NextResponse.json({ ok: true });
  clearNvetSessionCookies(response);
  return response;
}
