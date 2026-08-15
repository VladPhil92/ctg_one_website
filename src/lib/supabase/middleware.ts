import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Refreshes the Supabase auth session cookie on every request, then
// gates /dashboard (any authenticated user) and /admin (admin role only,
// re-checked against the profiles table — never trust a client-supplied
// claim). This is a UX/perf fast-path, not the real authorization
// boundary: every RPC a signed-in user can call re-verifies the role
// itself (see supabase/migrations/0001_init.sql) precisely so a bug here
// can't turn into unauthorized data access or fund movement.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isAdminRoute = pathname.startsWith('/admin');
  // CTG Craft Beer Inversión (docs/investment/adr/ADR-011): reuses this
  // same session, gated separately so /inversion has its own redirect
  // targets and doesn't send a signed-out investment visitor into the
  // unrelated CTG One /dashboard flow.
  const isInvestmentAppRoute = pathname.startsWith('/inversion/app');
  const isInvestmentAdminRoute = pathname.startsWith('/inversion/admin');

  if ((isDashboardRoute || isAdminRoute) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/iniciar-sesion';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if ((isInvestmentAppRoute || isInvestmentAdminRoute) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/iniciar-sesion';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminRoute && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // Interim gate only (ADR-011): reuses the existing CTG One admin role
  // until a dedicated investment RBAC table lands with the domain
  // milestone. There is no real financial data behind /inversion/admin
  // yet — this page is a demo-data shell, so this is not the final
  // authorization boundary, just a reasonable placeholder for it.
  if (isInvestmentAdminRoute && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/inversion/app';
      return NextResponse.redirect(url);
    }
  }

  return response;
}
