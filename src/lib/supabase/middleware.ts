import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  SUPERADMIN_VIEW_COOKIE,
  isSuperadminUserViewCookie,
} from '@/lib/admin/superadmin-view';
import {
  NVET_ACCESS_COOKIE,
  NVET_REFRESH_COOKIE,
  isExpiredOrUnreadable,
  refreshNvetSession,
  setNvetSessionCookies,
} from '@/lib/nvetcareapp/session';

type InvestmentRole = 'SUPER_ADMIN'|'FINANCE_ADMIN'|'PRODUCTION_MANAGER'|'INVENTORY_MANAGER'|'SALES_MANAGER'|'AUDITOR'|'PARTICIPANT';

const participantAdminExactExemptPaths = new Set([
  '/dashboard/seguridad/mfa',
]);

const participantAdminExemptPrefixes = [
  '/dashboard/educacion/instructor',
  '/dashboard/educacion/operaciones',
] as const;

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isParticipantAdminExemptPath(pathname: string) {
  return participantAdminExactExemptPaths.has(pathname)
    || participantAdminExemptPrefixes.some(prefix => matchesPrefix(pathname, prefix));
}

function authorizationUnavailable() {
  return new NextResponse('Authorization state is temporarily unavailable.', {
    status: 503,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

// Nvet Care dashboard: its own session cookie, not Supabase (ADR-002).
// Runs independently of Supabase configuration so it isn't skipped when
// Supabase env vars are unset. Excludes /nvetcareapp/iniciar-sesion — a
// sibling of dashboard/, not nested inside it, so this can't intercept the
// sign-in page itself and loop. Returns null when the route isn't a Nvet
// dashboard route, so the caller can fall through to other handling.
export async function handleNvetSession(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/nvetcareapp/dashboard')) {
    return null;
  }

  const response = NextResponse.next({ request });
  const accessToken = request.cookies.get(NVET_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(NVET_REFRESH_COOKIE)?.value;

  if (!isExpiredOrUnreadable(accessToken)) {
    return response;
  }

  if (refreshToken) {
    const tokens = await refreshNvetSession(refreshToken);
    if (tokens) {
      setNvetSessionCookies(response, tokens);
      return response;
    }
  }

  const url = request.nextUrl.clone();
  url.pathname = '/nvetcareapp/iniciar-sesion';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { pathname } = request.nextUrl;

  const { data: { user } } = await supabase.auth.getUser();
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isAdminRoute = pathname.startsWith('/admin');
  const isKnowledgeRoute = pathname.startsWith('/knowledge');
  const isInvestmentAppRoute = pathname.startsWith('/inversion/app');
  const isInvestmentAdminRoute = pathname.startsWith('/inversion/admin');

  if ((isDashboardRoute || isAdminRoute || isKnowledgeRoute || isInvestmentAppRoute || isInvestmentAdminRoute) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/iniciar-sesion';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Effective participant view enforcement belongs here because the proxy sees
  // the concrete pathname on every document/RSC navigation. Existing education
  // admin consoles remain governed by their own global-admin authorization and
  // must not require an investment role merely because they live under /dashboard.
  // The exact MFA challenge route is also exempt because it is part of the
  // authentication boundary itself: an admin at AAL1 must be able to reach it
  // before any participant-view cookie can be required.
  if ((isDashboardRoute || isInvestmentAppRoute) && user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) return authorizationUnavailable();

    if (profile?.role === 'admin' && !isParticipantAdminExemptPath(pathname)) {
      const { data: investmentProfile, error: investmentRoleError } = await supabase
        .from('investment_participant_profiles')
        .select('investment_role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (investmentRoleError) return authorizationUnavailable();

      const requestedView = request.cookies.get(SUPERADMIN_VIEW_COOKIE)?.value;
      const isVerifiedUserView =
        investmentProfile?.investment_role === 'SUPER_ADMIN'
        && isSuperadminUserViewCookie(requestedView, user.id, user.last_sign_in_at);

      if (!isVerifiedUserView) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin';
        url.search = '';
        return NextResponse.redirect(url);
      }
    }
  }

  if ((isAdminRoute || isInvestmentAdminRoute) && user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = isInvestmentAdminRoute ? '/inversion/app' : '/dashboard';
      return NextResponse.redirect(url);
    }

    const matchedRule = routeRoles.find(rule => pathname === rule.prefix || pathname.startsWith(rule.prefix + '/'));
    if (matchedRule) {
      const { data: investmentProfile } = await supabase
        .from('investment_participant_profiles')
        .select('investment_role')
        .eq('user_id', user.id)
        .maybeSingle();
      const role = investmentProfile?.investment_role as InvestmentRole | undefined;
      if (!role || !matchedRule.roles.includes(role)) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin';
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}