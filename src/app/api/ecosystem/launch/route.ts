import { NextResponse } from 'next/server';

import { getEcosystemApp } from '@/lib/ecosystem/registry';
import { createAuthenticatedRequestContext, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function harden(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const app = getEcosystemApp(url.searchParams.get('app'));
  if (!app || app.status !== 'active') {
    return harden(NextResponse.json({ error: 'ECOSYSTEM_APP_NOT_AVAILABLE' }, { status: 404 }));
  }

  if (!isSupabaseConfigured) {
    return harden(NextResponse.json({ error: 'ECOSYSTEM_FEDERATION_UNAVAILABLE' }, { status: 503 }));
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) {
    const publicOrigin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
    const loginUrl = new URL('/iniciar-sesion', publicOrigin);
    loginUrl.searchParams.set('next', `${url.pathname}${url.search}`);
    return harden(NextResponse.redirect(loginUrl, 302));
  }

  const destination = new URL(app.federationStartPath, app.origin);
  destination.searchParams.set('next', app.federationNextPath);
  return harden(NextResponse.redirect(destination, 302));
}
