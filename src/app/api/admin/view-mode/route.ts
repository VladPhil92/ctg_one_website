import { NextResponse, type NextRequest } from 'next/server';

import {
  SUPERADMIN_VIEW_COOKIE,
  SUPERADMIN_VIEW_COOKIE_MAX_AGE,
  isSuperadminViewMode,
} from '@/lib/admin/superadmin-view';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Authentication is not configured.' }, { status: 503 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json.' }, { status: 415 });
  }

  const body = await request.json().catch(() => null) as { mode?: unknown } | null;
  const mode = body?.mode;
  if (!isSuperadminViewMode(mode)) {
    return NextResponse.json({ error: 'Unsupported view mode.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const [{ data: profile }, { data: investmentProfile }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase
      .from('investment_participant_profiles')
      .select('investment_role')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const isSuperAdmin = profile?.role === 'admin' && investmentProfile?.investment_role === 'SUPER_ADMIN';
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'SUPER_ADMIN authority required.' }, { status: 403 });
  }

  const response = NextResponse.json({ mode });
  if (mode === 'superadmin') {
    response.cookies.delete(SUPERADMIN_VIEW_COOKIE);
  } else {
    response.cookies.set(SUPERADMIN_VIEW_COOKIE, mode, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SUPERADMIN_VIEW_COOKIE_MAX_AGE,
    });
  }

  return response;
}
