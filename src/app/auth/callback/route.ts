import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { recordFunnelEvent } from '@/lib/analytics/server';
import { ANALYTICS_COOKIE_NAME, isAnalyticsAnonymousId } from '@/lib/analytics/funnel';
import { safeRedirectPath } from '@/lib/security/safe-redirect';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = safeRedirectPath(requestUrl.searchParams.get('next'), '/dashboard');

  if (!isSupabaseConfigured || !code) {
    return NextResponse.redirect(new URL('/iniciar-sesion?error=auth_callback_invalid', requestUrl.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/iniciar-sesion?error=auth_callback_failed', requestUrl.origin));
  }

  const { data: { user } } = await supabase.auth.getUser();
  const metadataAnonymousId = user?.user_metadata?.analytics_anonymous_id;
  const cookieAnonymousId = request.cookies.get(ANALYTICS_COOKIE_NAME)?.value;
  const anonymousId = isAnalyticsAnonymousId(metadataAnonymousId)
    ? metadataAnonymousId
    : isAnalyticsAnonymousId(cookieAnonymousId)
      ? cookieAnonymousId
      : crypto.randomUUID();

  // Registration confirmation is the only callback that contributes to this
  // funnel. Password recovery intentionally redirects elsewhere and must not
  // inflate email verification or first-login activation milestones.
  if (next === '/dashboard' && user && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await Promise.all([
      recordFunnelEvent({
        eventName: 'email_verified',
        anonymousId,
        userId: user.id,
        sourcePath: '/auth/callback',
      }),
      recordFunnelEvent({
        eventName: 'first_login',
        anonymousId,
        userId: user.id,
        sourcePath: '/auth/callback',
      }),
    ]);
  }

  const response = NextResponse.redirect(new URL(next, requestUrl.origin));
  response.cookies.set(ANALYTICS_COOKIE_NAME, anonymousId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
