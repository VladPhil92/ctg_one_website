import { NextResponse, type NextRequest } from 'next/server';
import { updateSession, handleNvetSession } from '@/lib/supabase/middleware';

function normalizeHost(request: NextRequest) {
  return request.headers.get('host')?.split(':')[0].trim().toLowerCase() ?? '';
}

function handleWorldMakersSubdomain(request: NextRequest) {
  const host = normalizeHost(request);
  const isWorldMakersHost = host === 'worldmakers.ctgone.com' || host === 'www.worldmakers.ctgone.com';

  if (!isWorldMakersHost) {
    return null;
  }

  const pathname = request.nextUrl.pathname;

  // Keep shared/static infrastructure at its canonical path. The proxy matcher
  // already excludes most image/static extensions; these explicit guards keep
  // API and framework traffic out of the branded route namespace as well.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/api/') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return null;
  }

  // `/worldmakers/*` remains a valid direct preview namespace on ctgone.com.
  // If such a URL is opened on the dedicated hostname, canonicalize it back to
  // the clean branded path before applying the internal rewrite.
  if (pathname === '/worldmakers' || pathname.startsWith('/worldmakers/')) {
    const canonical = request.nextUrl.clone();
    canonical.pathname = pathname === '/worldmakers' ? '/' : pathname.slice('/worldmakers'.length);
    return NextResponse.redirect(canonical, 308);
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? '/worldmakers' : `/worldmakers${pathname}`;
  return NextResponse.rewrite(url);
}

export async function proxy(request: NextRequest) {
  // The World Makers public portal lives inside this Next.js deployment but is
  // served as its own branded property at worldmakers.ctgone.com.
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
