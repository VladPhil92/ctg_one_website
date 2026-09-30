import { NextResponse, type NextRequest } from 'next/server';

import {
  SUPERADMIN_VIEW_COOKIE,
  SUPERADMIN_VIEW_COOKIE_MAX_AGE,
  isSuperadminViewMode,
  superadminUserViewCookieValue,
} from '@/lib/admin/superadmin-view';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}

function clearEffectiveViewResponse() {
  const response = noStoreJson({ mode: 'superadmin' });
  response.cookies.delete(SUPERADMIN_VIEW_COOKIE);
  return response;
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return noStoreJson({ error: 'Content-Type must be application/json.' }, { status: 415 });
  }

  const body = await request.json().catch(() => null) as { mode?: unknown } | null;
  const mode = body?.mode;
  if (!isSuperadminViewMode(mode)) {
    return noStoreJson({ error: 'Unsupported view mode.' }, { status: 400 });
  }

  // Leaving an effective user view only removes state; it cannot grant any
  // capability. Keep this fail-safe available even if authorization data or
  // the Supabase session becomes unavailable while the operator is browsing.
  if (mode === 'superadmin') {
    return clearEffectiveViewResponse();
  }

  if (!isSupabaseConfigured) {
    return noStoreJson({ error: 'Authentication is not configured.' }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return noStoreJson({ error: 'Authentication required.' }, { status: 401 });
  }

  const [profileResult, investmentProfileResult] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase
      .from('investment_participant_profiles')
      .select('investment_role')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (profileResult.error || investmentProfileResult.error) {
    return noStoreJson({ error: 'Authorization state is temporarily unavailable.' }, { status: 503 });
  }

  const isSuperAdmin =
    profileResult.data?.role === 'admin'
    && investmentProfileResult.data?.investment_role === 'SUPER_ADMIN';
  if (!isSuperAdmin) {
    return noStoreJson({ error: 'SUPER_ADMIN authority required.' }, { status: 403 });
  }

  const cookieValue = superadminUserViewCookieValue(user.id, user.last_sign_in_at);
  if (!cookieValue) {
    return noStoreJson({ error: 'Current sign-in session cannot be fingerprinted safely.' }, { status: 409 });
  }

  const response = noStoreJson({ mode });
  response.cookies.set(SUPERADMIN_VIEW_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SUPERADMIN_VIEW_COOKIE_MAX_AGE,
  });
  return response;
}

// Clearing an effective-view cookie cannot grant privilege, so this endpoint is
// intentionally safe to call even after the Supabase session has expired. This
// lets every sign-out path remove stale browser state without depending on an
// authenticated request that may already be invalid.
export async function DELETE() {
  return clearEffectiveViewResponse();
}
