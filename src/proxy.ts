import { NextResponse, type NextRequest } from 'next/server';
import { updateSession, handleNvetSession } from '@/lib/supabase/middleware';

function normalizeHost(request: NextRequest) {
  return request.headers.get('host')?.split(':')[0].trim().toLowerCase() ?? '';
}

function handleWorldMakersSubdomain(request: NextRequest) {
  const host = normalizeHost(request);
  const isWorldMakersHost = host === 'worldmakers.ctgone.com' || host === 'www.worldmakers.ctgone.com';

  if (!isWorldMakersHost || request.nextUrl.pathname !== '/') {
    return null;
  }

  const url = request.nextUrl.clone();
  url.pathname = '/worldmakers';
  return NextResponse.rewrite(url);
}

export async function proxy(request: NextRequest) {
  // The World Makers marketing site lives in this Next.js deployment but is
  // served as its own branded property at worldmakers.ctgone.com. Keep the
  // canonical root URL clean while retaining /worldmakers as a direct preview.
  const worldMakersResponse = handleWorldMakersSubdomain(request);
  if (worldMakersResponse) {
    return worldMakersResponse;
  }

  // Nvet Care's session handling is independent of Supabase (ADR-002) and
  // must run even when Supabase isn't configured in this environment.
  const nvetResponse = await handleNvetSession(request);
  if (nvetResponse) {
    return nvetResponse;
  }

  // Supabase isn't configured yet in every environment (for example,
  // before environment variables are provisioned). No-op rather than
  // returning 500 for every request.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
