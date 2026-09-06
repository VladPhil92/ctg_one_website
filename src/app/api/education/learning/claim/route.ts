import { NextResponse } from 'next/server';
import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';

const MAX_BODY_BYTES = 2048;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ClaimPayload = { slug?: unknown };

function json(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

function publicError(message: string) {
  if (message.includes('EDUCATION_LEARNING_FREE_CLAIM_FORBIDDEN')) {
    return { status: 409, code: 'EDUCATION_LEARNING_FREE_CLAIM_FORBIDDEN' };
  }
  if (message.includes('EDUCATION_LEARNING_COURSE_UNAVAILABLE')) {
    return { status: 404, code: 'EDUCATION_LEARNING_COURSE_UNAVAILABLE' };
  }
  if (message.includes('EDUCATION_LEARNING_COURSE_SLUG_INVALID')) {
    return { status: 400, code: 'EDUCATION_LEARNING_COURSE_SLUG_INVALID' };
  }
  return { status: 503, code: 'EDUCATION_LEARNING_CLAIM_FAILED' };
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ ok: false, error: 'EDUCATION_LEARNING_UNAVAILABLE' }, 503);
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);

  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    return json({ ok: false, error: 'EDUCATION_LEARNING_CONTENT_TYPE_INVALID' }, 415);
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ ok: false, error: 'EDUCATION_LEARNING_BODY_TOO_LARGE' }, 413);
  }

  let body: ClaimPayload;
  try {
    body = (await request.json()) as ClaimPayload;
  } catch {
    return json({ ok: false, error: 'EDUCATION_LEARNING_BODY_INVALID' }, 400);
  }

  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  if (!SLUG_RE.test(slug) || slug.length > 100) {
    return json({ ok: false, error: 'EDUCATION_LEARNING_COURSE_SLUG_INVALID' }, 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('claim_free_education_course', {
    p_user_id: auth.user.id,
    p_course_slug: slug,
  });

  if (error) {
    const failure = publicError(error.message);
    return json({ ok: false, error: failure.code }, failure.status);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return json({ ok: false, error: 'EDUCATION_LEARNING_RESPONSE_INVALID' }, 503);
  }

  return json({ ok: true, ...data }, 201);
}
