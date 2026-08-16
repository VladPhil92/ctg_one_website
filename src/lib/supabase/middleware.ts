import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type InvestmentRole = 'SUPER_ADMIN'|'FINANCE_ADMIN'|'PRODUCTION_MANAGER'|'INVENTORY_MANAGER'|'SALES_MANAGER'|'AUDITOR'|'PARTICIPANT';

const routeRoles: Array<{ prefix:string; roles:InvestmentRole[] }> = [
  { prefix:'/admin/operations/settlement', roles:['SUPER_ADMIN','FINANCE_ADMIN'] },
  { prefix:'/admin/operations/labels', roles:['SUPER_ADMIN','PRODUCTION_MANAGER','INVENTORY_MANAGER'] },
  { prefix:'/admin/operations/scanner', roles:['SUPER_ADMIN','PRODUCTION_MANAGER','INVENTORY_MANAGER','SALES_MANAGER'] },
  { prefix:'/admin/operations/overview', roles:['SUPER_ADMIN','FINANCE_ADMIN','PRODUCTION_MANAGER','INVENTORY_MANAGER','SALES_MANAGER','AUDITOR'] },
  { prefix:'/admin/operations', roles:['SUPER_ADMIN','PRODUCTION_MANAGER'] },
  { prefix:'/inversion/admin/orders', roles:['SUPER_ADMIN','FINANCE_ADMIN'] },
];

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

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
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
