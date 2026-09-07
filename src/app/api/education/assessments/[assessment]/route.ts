import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const answerSchema = z.object({
  answers: z.record(z.string().regex(UUID_RE), z.string().regex(UUID_RE)),
}).strict();

function json(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

async function accessAssessment(request: Request, assessmentId: string) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { response: json({ ok: false, error: 'EDUCATION_ASSESSMENT_UNAVAILABLE' }, 503) } as const;
  }
  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) return { response: json({ ok: false, error: 'UNAUTHENTICATED' }, 401) } as const;
  if (!UUID_RE.test(assessmentId)) return { response: json({ ok: false, error: 'ASSESSMENT_ID_INVALID' }, 400) } as const;

  const admin = createAdminClient();
  const { data: assessment, error } = await admin
    .from('education_assessments')
    .select('id,course_id,slug,title,instructions,assessment_type,status,passing_score,max_attempts,required_for_completion,position')
    .eq('id', assessmentId)
    .eq('status', 'published')
    .maybeSingle();
  if (error) return { response: json({ ok: false, error: 'EDUCATION_ASSESSMENT_LOOKUP_FAILED' }, 503) } as const;
  if (!assessment) return { response: json({ ok: false, error: 'EDUCATION_ASSESSMENT_NOT_FOUND' }, 404) } as const;

  const { data: course, error: courseError } = await admin
    .from('education_courses')
    .select('id,offering_id,slug,title,status')
    .eq('id', assessment.course_id)
    .eq('status', 'published')
    .maybeSingle();
  if (courseError) return { response: json({ ok: false, error: 'EDUCATION_ASSESSMENT_LOOKUP_FAILED' }, 503) } as const;
  if (!course) return { response: json({ ok: false, error: 'EDUCATION_ASSESSMENT_NOT_FOUND' }, 404) } as const;

  const { data: entitlement, error: entitlementError } = await admin
    .from('education_entitlements')
    .select('id')
    .eq('user_id', auth.user.id)
    .eq('offering_id', course.offering_id)
    .eq('status', 'active')
    .lte('starts_at', new Date().toISOString())
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
    .limit(1)
    .maybeSingle();
  if (entitlementError) return { response: json({ ok: false, error: 'EDUCATION_ASSESSMENT_ACCESS_CHECK_FAILED' }, 503) } as const;
  if (!entitlement) return { response: json({ ok: false, error: 'EDUCATION_COURSE_ACCESS_REQUIRED' }, 403) } as const;

  const { data: enrollment, error: enrollmentError } = await admin
    .from('education_enrollments')
    .select('id,status')
    .eq('user_id', auth.user.id)
    .eq('course_id', course.id)
    .maybeSingle();
  if (enrollmentError) return { response: json({ ok: false, error: 'EDUCATION_ASSESSMENT_ACCESS_CHECK_FAILED' }, 503) } as const;
  if (!enrollment) return { response: json({ ok: false, error: 'EDUCATION_LEARNING_ENROLLMENT_REQUIRED' }, 409) } as const;

  return { auth, admin, assessment, course, enrollment } as const;
}

export async function GET(request: Request, { params }: { params: Promise<{ assessment: string }> }) {
  const { assessment: assessmentId } = await params;
  const access = await accessAssessment(request, assessmentId);
  if ('response' in access) return access.response;

  const [questionsResult, attemptsResult] = await Promise.all([
    access.admin
      .from('education_assessment_questions')
      .select('id,prompt,question_type,points,position')
      .eq('assessment_id', access.assessment.id)
      .eq('status', 'published')
      .order('position', { ascending: true }),
    access.admin
      .from('education_assessment_attempts')
      .select('id,attempt_number,score_percent,passed,points_earned,points_possible,submitted_at')
      .eq('assessment_id', access.assessment.id)
      .eq('enrollment_id', access.enrollment.id)
      .eq('user_id', access.auth.user.id)
      .order('attempt_number', { ascending: false }),
  ]);
  if (questionsResult.error || attemptsResult.error) return json({ ok: false, error: 'EDUCATION_ASSESSMENT_READ_FAILED' }, 503);

  const questions = questionsResult.data ?? [];
  const questionIds = questions.map((question) => question.id);
  let options: Array<{ id: string; question_id: string; label: string; option_text: string; position: number }> = [];
  if (questionIds.length > 0) {
    const optionsResult = await access.admin
      .from('education_assessment_options')
      .select('id,question_id,label,option_text,position')
      .in('question_id', questionIds)
      .order('position', { ascending: true });
    if (optionsResult.error) return json({ ok: false, error: 'EDUCATION_ASSESSMENT_READ_FAILED' }, 503);
    options = optionsResult.data ?? [];
  }

  const attempts = attemptsResult.data ?? [];
  return json({
    ok: true,
    course: { slug: access.course.slug, title: access.course.title },
    assessment: {
      id: access.assessment.id,
      slug: access.assessment.slug,
      title: access.assessment.title,
      instructions: access.assessment.instructions,
      passingScore: Number(access.assessment.passing_score),
      maxAttempts: access.assessment.max_attempts,
      requiredForCompletion: access.assessment.required_for_completion,
      questions: questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        questionType: question.question_type,
        points: question.points,
        position: question.position,
        options: options.filter((option) => option.question_id === question.id).map((option) => ({
          id: option.id,
          label: option.label,
          text: option.option_text,
          position: option.position,
        })),
      })),
    },
    attempts,
    attemptsRemaining: Math.max(access.assessment.max_attempts - attempts.length, 0),
    passed: attempts.some((attempt) => attempt.passed === true),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ assessment: string }> }) {
  const { assessment: assessmentId } = await params;
  const access = await accessAssessment(request, assessmentId);
  if ('response' in access) return access.response;
  if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ ok: false, error: 'CROSS_SITE_FORBIDDEN' }, 403);
  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') return json({ ok: false, error: 'CONTENT_TYPE_INVALID' }, 415);

  let body: unknown;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'BODY_INVALID' }, 400); }
  const parsed = answerSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, error: 'ANSWERS_INVALID' }, 400);

  const { data, error } = await access.admin.rpc('submit_education_assessment_attempt', {
    p_user_id: access.auth.user.id,
    p_assessment_id: access.assessment.id,
    p_answers: parsed.data.answers,
  });
  if (error) {
    const message = error.message;
    if (message.includes('MAX_ATTEMPTS')) return json({ ok: false, error: 'EDUCATION_ASSESSMENT_MAX_ATTEMPTS_REACHED' }, 409);
    if (message.includes('ANSWERS_INCOMPLETE') || message.includes('ANSWER_INVALID') || message.includes('OPTION_INVALID')) return json({ ok: false, error: 'EDUCATION_ASSESSMENT_ANSWERS_INVALID' }, 400);
    if (message.includes('ACCESS_REQUIRED')) return json({ ok: false, error: 'EDUCATION_COURSE_ACCESS_REQUIRED' }, 403);
    return json({ ok: false, error: 'EDUCATION_ASSESSMENT_SUBMIT_FAILED' }, 503);
  }

  return json({ ok: true, result: data });
}
