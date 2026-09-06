import { NextResponse } from 'next/server';
import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';

const MAX_BODY_BYTES = 4096;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ProgressPayload = {
  lessonId?: unknown;
  progressPercent?: unknown;
  lastPositionSeconds?: unknown;
};

function json(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

function publicError(message: string) {
  if (message.includes('EDUCATION_COURSE_ACCESS_REQUIRED')) {
    return { status: 403, code: 'EDUCATION_COURSE_ACCESS_REQUIRED' };
  }
  if (message.includes('EDUCATION_LEARNING_ENROLLMENT_REQUIRED')) {
    return { status: 409, code: 'EDUCATION_LEARNING_ENROLLMENT_REQUIRED' };
  }
  if (message.includes('EDUCATION_LEARNING_LESSON_UNAVAILABLE')) {
    return { status: 404, code: 'EDUCATION_LEARNING_LESSON_UNAVAILABLE' };
  }
  if (message.includes('EDUCATION_LEARNING_PROGRESS_INVALID')) {
    return { status: 400, code: 'EDUCATION_LEARNING_PROGRESS_INVALID' };
  }
  if (message.includes('EDUCATION_LEARNING_POSITION_INVALID')) {
    return { status: 400, code: 'EDUCATION_LEARNING_POSITION_INVALID' };
  }
  return { status: 503, code: 'EDUCATION_LEARNING_PROGRESS_FAILED' };
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

  let body: ProgressPayload;
  try {
    body = (await request.json()) as ProgressPayload;
  } catch {
    return json({ ok: false, error: 'EDUCATION_LEARNING_BODY_INVALID' }, 400);
  }

  const lessonId = typeof body.lessonId === 'string' ? body.lessonId.trim() : '';
  const progressPercent = typeof body.progressPercent === 'number' ? body.progressPercent : Number.NaN;
  const lastPositionSeconds = body.lastPositionSeconds === undefined
    ? 0
    : typeof body.lastPositionSeconds === 'number'
      ? body.lastPositionSeconds
      : Number.NaN;

  if (!UUID_RE.test(lessonId)) {
    return json({ ok: false, error: 'EDUCATION_LEARNING_LESSON_INVALID' }, 400);
  }
  if (!Number.isInteger(progressPercent) || progressPercent < 0 || progressPercent > 100) {
    return json({ ok: false, error: 'EDUCATION_LEARNING_PROGRESS_INVALID' }, 400);
  }
  if (!Number.isInteger(lastPositionSeconds) || lastPositionSeconds < 0 || lastPositionSeconds > 864000) {
    return json({ ok: false, error: 'EDUCATION_LEARNING_POSITION_INVALID' }, 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('record_education_lesson_progress', {
    p_user_id: auth.user.id,
    p_lesson_id: lessonId,
    p_progress_percent: progressPercent,
    p_last_position_seconds: lastPositionSeconds,
  });

  if (error) {
    const failure = publicError(error.message);
    return json({ ok: false, error: failure.code }, failure.status);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return json({ ok: false, error: 'EDUCATION_LEARNING_PROGRESS_RESPONSE_INVALID' }, 503);
  }

  return json({ ok: true, ...data });
}
