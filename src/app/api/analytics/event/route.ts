import { NextRequest, NextResponse } from 'next/server';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { recordFunnelEvent } from '@/lib/analytics/server';
import {
  ANALYTICS_COOKIE_NAME,
  isAnalyticsAnonymousId,
  isAnalyticsSourcePath,
  isClientFunnelEventName,
  isFunnelServiceKey,
} from '@/lib/analytics/funnel';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 2048;
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ accepted: false }, { status: 503 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ accepted: false }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }

  if (!isClientFunnelEventName(body.eventName) || !isAnalyticsSourcePath(body.sourcePath)) {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }

  const requestedService = body.serviceKey;
  if (body.eventName === 'first_service_used') {
    if (!isFunnelServiceKey(requestedService)) {
      return NextResponse.json({ accepted: false }, { status: 400 });
    }
  } else if (requestedService != null) {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const requiresUser = ['first_login', 'dashboard_viewed', 'first_service_used'].includes(body.eventName);
  if (requiresUser && !user) {
    return NextResponse.json({ accepted: false }, { status: 401 });
  }

  const metadataAnonymousId = user?.user_metadata?.analytics_anonymous_id;
  const cookieAnonymousId = request.cookies.get(ANALYTICS_COOKIE_NAME)?.value;
  const bodyAnonymousId = body.anonymousId;

  const anonymousId = isAnalyticsAnonymousId(metadataAnonymousId)
    ? metadataAnonymousId
    : isAnalyticsAnonymousId(cookieAnonymousId)
      ? cookieAnonymousId
      : isAnalyticsAnonymousId(bodyAnonymousId)
        ? bodyAnonymousId
        : null;

  if (!anonymousId) {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }

  const accepted = await recordFunnelEvent({
    eventName: body.eventName,
    anonymousId,
    userId: user?.id ?? null,
    sourcePath: body.sourcePath,
    serviceKey: body.eventName === 'first_service_used' && isFunnelServiceKey(requestedService)
      ? requestedService
      : null,
  });

  const response = NextResponse.json({ accepted }, { status: accepted ? 202 : 503 });
  response.headers.set('Cache-Control', 'no-store');
  response.cookies.set(ANALYTICS_COOKIE_NAME, anonymousId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
