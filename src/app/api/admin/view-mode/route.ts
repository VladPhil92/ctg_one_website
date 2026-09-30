import { NextResponse, type NextRequest } from 'next/server';

import {
  SUPERADMIN_VIEW_COOKIE,
  SUPERADMIN_VIEW_COOKIE_MAX_AGE,
  isSuperadminUserViewCookie,
  isSuperadminViewMode,
  superadminUserViewCookieValue,
} from '@/lib/admin/superadmin-view';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}

function clearEffectiveViewResponse(init?: ResponseInit, error?: string) {
  const response = noStoreJson(error ? { mode: 'superadmin', error } : { mode: 'superadmin' }, init);
  response.cookies.delete(SUPERADMIN_VIEW_COOKIE);
  return response;
}

async function readAuthority() {
  if (!isSupabaseConfigured) {
    return { status: 503, error: 'Authentication is not configured.' } as const;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: 401, error: 'Authentication required.' } as const;
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
    return { status: 503, error: 'Authorization state is temporarily unavailable.' } as const;
  }

  const isSuperAdmin =
    profileResult.data?.role === 'admin'
    && investmentProfileResult.data?.investment_role === 'SUPER_ADMIN';

  if (!isSuperAdmin) {
    return { status: 403, error: 'SUPER_ADMIN authority required.' } as const;
  }

  return { user } as const;
}

export async function GET(request: NextRequest) {
  const authority = await readAuthority();
  if ('error' in authority) {
    return clearEffectiveViewResponse({ status: authority.status }, authority.error);
  }

  const requestedView = request.cookies.get(SUPERADMIN_VIEW_COOKIE)?.value;
  if (!isSuperadminUserViewCookie(requestedView, authority.user.id, authority.user.last_sign_in_at)) {
    return clearEffectiveViewResponse({ status: 409 }, 'Effective user view is no longer valid.');
  }

  return noStoreJson({ mode: 'user' });
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

  const authority = await readAuthority();
  if ('error' in authority) {
    return noStoreJson({ error: authority.error }, { status: authority.status });
  }

  const cookieValue = superadminUserViewCookieValue(authority.user.id, authority.user.last_sign_in_at);
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
