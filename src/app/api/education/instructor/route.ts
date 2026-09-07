import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const lifecycleStatus = z.enum(['draft', 'published', 'archived']);

const createCourse = z.object({
  action: z.literal('create_course'),
  slug: z.string().min(3).max(100).regex(SLUG_RE),
  title: z.string().trim().min(2).max(180),
  summary: z.string().trim().min(10).max(1200),
  estimatedMinutes: z.number().int().min(1).max(100000),
  priceAmount: z.number().int().min(0).max(2_000_000_000).default(0),
}).strict();

const updateCourse = z.object({
  action: z.literal('update_course'),
  courseId: z.string().regex(UUID_RE),
  title: z.string().trim().min(2).max(180),
  summary: z.string().trim().min(10).max(1200),
  estimatedMinutes: z.number().int().min(1).max(100000),
  status: lifecycleStatus,
}).strict();

const createModule = z.object({
  action: z.literal('create_module'),
  courseId: z.string().regex(UUID_RE),
  slug: z.string().min(3).max(100).regex(SLUG_RE),
  title: z.string().trim().min(2).max(180),
  summary: z.string().trim().min(10).max(1200),
  position: z.number().int().min(1).max(1000),
}).strict();

const updateModule = z.object({
  action: z.literal('update_module'),
  moduleId: z.string().regex(UUID_RE),
  title: z.string().trim().min(2).max(180),
  summary: z.string().trim().min(10).max(1200),
  position: z.number().int().min(1).max(1000),
  status: lifecycleStatus,
}).strict();

const createLesson = z.object({
  action: z.literal('create_lesson'),
  moduleId: z.string().regex(UUID_RE),
  slug: z.string().min(3).max(120).regex(SLUG_RE),
  title: z.string().trim().min(2).max(180),
  summary: z.string().trim().min(10).max(1200),
  body: z.string().max(100000),
  durationMinutes: z.number().int().min(1).max(10000),
  position: z.number().int().min(1).max(1000),
  lessonType: z.enum(['text', 'video', 'audio', 'resource']).default('text'),
  mediaUrl: z.union([z.string().url().max(2000), z.string().startsWith('/').max(2000), z.literal('')]).default(''),
}).strict();

const updateLesson = z.object({
  action: z.literal('update_lesson'),
  lessonId: z.string().regex(UUID_RE),
  title: z.string().trim().min(2).max(180),
  summary: z.string().trim().min(10).max(1200),
  body: z.string().max(100000),
  durationMinutes: z.number().int().min(1).max(10000),
  position: z.number().int().min(1).max(1000),
  status: lifecycleStatus,
}).strict();

const createAssessment = z.object({
  action: z.literal('create_assessment'),
  courseId: z.string().regex(UUID_RE),
  slug: z.string().min(3).max(120).regex(SLUG_RE),
  title: z.string().trim().min(2).max(180),
  instructions: z.string().max(6000).default(''),
  passingScore: z.number().min(0).max(100),
  maxAttempts: z.number().int().min(1).max(20),
  requiredForCompletion: z.boolean().default(true),
  position: z.number().int().min(1).max(1000),
}).strict();

const updateAssessment = z.object({
  action: z.literal('update_assessment'),
  assessmentId: z.string().regex(UUID_RE),
  title: z.string().trim().min(2).max(180),
  instructions: z.string().max(6000),
  passingScore: z.number().min(0).max(100),
  maxAttempts: z.number().int().min(1).max(20),
  requiredForCompletion: z.boolean(),
  position: z.number().int().min(1).max(1000),
  status: lifecycleStatus,
}).strict();

const optionInput = z.object({
  label: z.string().trim().min(1).max(12),
  text: z.string().trim().min(1).max(3000),
  isCorrect: z.boolean(),
}).strict();

const createQuestion = z.object({
  action: z.literal('create_question'),
  assessmentId: z.string().regex(UUID_RE),
  prompt: z.string().trim().min(3).max(3000),
  explanation: z.string().trim().max(6000).default(''),
  points: z.number().int().min(1).max(1000).default(1),
  position: z.number().int().min(1).max(1000),
  options: z.array(optionInput).min(2).max(8),
}).strict();

const payloadSchema = z.union([
  createCourse,
  updateCourse,
  createModule,
  updateModule,
  createLesson,
  updateLesson,
  createAssessment,
  updateAssessment,
  createQuestion,
]);

function json(body: Record<string, unknown>, code = 200) {
  const response = NextResponse.json(body, { status: code });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

async function authorize(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { response: json({ ok: false, error: 'EDUCATION_INSTRUCTOR_UNAVAILABLE' }, 503) } as const;
  }
  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) return { response: json({ ok: false, error: 'UNAUTHENTICATED' }, 401) } as const;

  const { data: isAdmin, error } = await auth.supabase.rpc('is_admin');
  if (error) return { response: json({ ok: false, error: 'AUTHORIZATION_UNAVAILABLE' }, 503) } as const;
  if (isAdmin !== true) return { response: json({ ok: false, error: 'FORBIDDEN' }, 403) } as const;

  return { admin: createAdminClient() } as const;
}

export async function GET(request: Request) {
  const access = await authorize(request);
  if ('response' in access) return access.response;

  const [courses, modules, lessons, assessments, questions] = await Promise.all([
    access.admin.from('education_courses').select('id,offering_id,slug,title,summary,status,estimated_minutes,created_at,updated_at').order('updated_at', { ascending: false }).limit(100),
    access.admin.from('education_modules').select('id,course_id,slug,title,summary,position,status').order('position', { ascending: true }).limit(500),
    access.admin.from('education_lessons').select('id,module_id,slug,title,summary,lesson_type,body,media_url,duration_minutes,position,status').order('position', { ascending: true }).limit(1000),
    access.admin.from('education_assessments').select('id,course_id,slug,title,instructions,status,passing_score,max_attempts,required_for_completion,position').order('position', { ascending: true }).limit(500),
    access.admin.from('education_assessment_questions').select('id,assessment_id,prompt,explanation,points,position,status').order('position', { ascending: true }).limit(1000),
  ]);

  if ([courses, modules, lessons, assessments, questions].some((result) => result.error)) {
    return json({ ok: false, error: 'EDUCATION_INSTRUCTOR_READ_FAILED' }, 503);
  }

  return json({
    ok: true,
    courses: courses.data ?? [],
    modules: modules.data ?? [],
    lessons: lessons.data ?? [],
    assessments: assessments.data ?? [],
    questions: questions.data ?? [],
  });
}

export async function POST(request: Request) {
  const access = await authorize(request);
  if ('response' in access) return access.response;
  if (request.headers.get('sec-fetch-site') === 'cross-site') return json({ ok: false, error: 'CROSS_SITE_FORBIDDEN' }, 403);
  if (request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') {
    return json({ ok: false, error: 'CONTENT_TYPE_INVALID' }, 415);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'BODY_INVALID' }, 400);
  }

  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return json({ ok: false, error: 'PAYLOAD_INVALID' }, 400);
  const input = parsed.data;
  const now = new Date().toISOString();

  if (input.action === 'create_course') {
    const { data: offering, error: offeringError } = await access.admin
      .from('education_offerings')
      .insert({
        slug: input.slug,
        title: input.title,
        offering_type: 'course',
        summary: input.summary,
        status: 'draft',
        price_amount: input.priceAmount,
        currency: 'COP',
        access_path: `/learn/${input.slug}`,
        metadata: { learning_core: 'v1', authored_in: 'instructor_studio' },
        published_at: null,
      })
      .select('id')
      .single();
    if (offeringError || !offering) return json({ ok: false, error: 'COURSE_OFFERING_CREATE_FAILED' }, 409);

    const { data: course, error } = await access.admin
      .from('education_courses')
      .insert({
        offering_id: offering.id,
        slug: input.slug,
        title: input.title,
        summary: input.summary,
        status: 'draft',
        estimated_minutes: input.estimatedMinutes,
        updated_at: now,
      })
      .select('id,slug,title,status')
      .single();
    if (error || !course) {
      await access.admin.from('education_offerings').delete().eq('id', offering.id);
      return json({ ok: false, error: 'COURSE_CREATE_FAILED' }, 409);
    }
    return json({ ok: true, course }, 201);
  }

  if (input.action === 'update_course') {
    if (input.status === 'published') {
      const { data: publishedModules, error: moduleError } = await access.admin
        .from('education_modules')
        .select('id')
        .eq('course_id', input.courseId)
        .eq('status', 'published');
      if (moduleError) return json({ ok: false, error: 'COURSE_PUBLISH_CHECK_FAILED' }, 503);
      const moduleIds = (publishedModules ?? []).map((module) => module.id);
      if (moduleIds.length === 0) return json({ ok: false, error: 'COURSE_PUBLISH_REQUIRES_PUBLISHED_MODULE' }, 409);

      const { count, error: lessonError } = await access.admin
        .from('education_lessons')
        .select('id', { count: 'exact', head: true })
        .in('module_id', moduleIds)
        .eq('status', 'published');
      if (lessonError) return json({ ok: false, error: 'COURSE_PUBLISH_CHECK_FAILED' }, 503);
      if (!count) return json({ ok: false, error: 'COURSE_PUBLISH_REQUIRES_PUBLISHED_LESSON' }, 409);
    }

    const { data: current, error: currentError } = await access.admin
      .from('education_courses')
      .select('offering_id')
      .eq('id', input.courseId)
      .maybeSingle();
    if (currentError) return json({ ok: false, error: 'COURSE_UPDATE_FAILED' }, 503);
    if (!current) return json({ ok: false, error: 'COURSE_NOT_FOUND' }, 404);

    const { error } = await access.admin
      .from('education_courses')
      .update({
        title: input.title,
        summary: input.summary,
        estimated_minutes: input.estimatedMinutes,
        status: input.status,
        updated_at: now,
      })
      .eq('id', input.courseId);
    if (error) return json({ ok: false, error: 'COURSE_UPDATE_FAILED' }, 409);

    const { error: offeringUpdateError } = await access.admin
      .from('education_offerings')
      .update({
        title: input.title,
        summary: input.summary,
        status: input.status,
        published_at: input.status === 'published' ? now : null,
      })
      .eq('id', current.offering_id);
    if (offeringUpdateError) return json({ ok: false, error: 'COURSE_OFFERING_UPDATE_FAILED' }, 503);
    return json({ ok: true });
  }

  if (input.action === 'create_module') {
    const { data, error } = await access.admin
      .from('education_modules')
      .insert({ course_id: input.courseId, slug: input.slug, title: input.title, summary: input.summary, position: input.position, status: 'draft', updated_at: now })
      .select('id')
      .single();
    return error ? json({ ok: false, error: 'MODULE_CREATE_FAILED' }, 409) : json({ ok: true, module: data }, 201);
  }

  if (input.action === 'update_module') {
    const { error } = await access.admin
      .from('education_modules')
      .update({ title: input.title, summary: input.summary, position: input.position, status: input.status, updated_at: now })
      .eq('id', input.moduleId);
    return error ? json({ ok: false, error: 'MODULE_UPDATE_FAILED' }, 409) : json({ ok: true });
  }

  if (input.action === 'create_lesson') {
    const { data, error } = await access.admin
      .from('education_lessons')
      .insert({
        module_id: input.moduleId,
        slug: input.slug,
        title: input.title,
        summary: input.summary,
        lesson_type: input.lessonType,
        body: input.body,
        media_url: input.mediaUrl || null,
        duration_minutes: input.durationMinutes,
        position: input.position,
        status: 'draft',
        updated_at: now,
      })
      .select('id')
      .single();
    return error ? json({ ok: false, error: 'LESSON_CREATE_FAILED' }, 409) : json({ ok: true, lesson: data }, 201);
  }

  if (input.action === 'update_lesson') {
    const { error } = await access.admin
      .from('education_lessons')
      .update({
        title: input.title,
        summary: input.summary,
        body: input.body,
        duration_minutes: input.durationMinutes,
        position: input.position,
        status: input.status,
        updated_at: now,
      })
      .eq('id', input.lessonId);
    return error ? json({ ok: false, error: 'LESSON_UPDATE_FAILED' }, 409) : json({ ok: true });
  }

  if (input.action === 'create_assessment') {
    const { data, error } = await access.admin
      .from('education_assessments')
      .insert({
        course_id: input.courseId,
        slug: input.slug,
        title: input.title,
        instructions: input.instructions,
        status: 'draft',
        passing_score: input.passingScore,
        max_attempts: input.maxAttempts,
        required_for_completion: input.requiredForCompletion,
        position: input.position,
        updated_at: now,
      })
      .select('id')
      .single();
    return error ? json({ ok: false, error: 'ASSESSMENT_CREATE_FAILED' }, 409) : json({ ok: true, assessment: data }, 201);
  }

  if (input.action === 'update_assessment') {
    if (input.status === 'published') {
      const { data: publishedQuestions, error: questionError } = await access.admin
        .from('education_assessment_questions')
        .select('id')
        .eq('assessment_id', input.assessmentId)
        .eq('status', 'published');
      if (questionError) return json({ ok: false, error: 'ASSESSMENT_PUBLISH_CHECK_FAILED' }, 503);
      if (!publishedQuestions?.length) return json({ ok: false, error: 'ASSESSMENT_PUBLISH_REQUIRES_QUESTION' }, 409);

      const questionIds = publishedQuestions.map((question) => question.id);
      const { data: correctOptions, error: optionError } = await access.admin
        .from('education_assessment_options')
        .select('question_id')
        .in('question_id', questionIds)
        .eq('is_correct', true);
      if (optionError) return json({ ok: false, error: 'ASSESSMENT_PUBLISH_CHECK_FAILED' }, 503);
      const covered = new Set((correctOptions ?? []).map((option) => option.question_id));
      if (covered.size !== questionIds.length) return json({ ok: false, error: 'ASSESSMENT_PUBLISH_REQUIRES_ANSWER_KEY' }, 409);
    }

    const { error } = await access.admin
      .from('education_assessments')
      .update({
        title: input.title,
        instructions: input.instructions,
        passing_score: input.passingScore,
        max_attempts: input.maxAttempts,
        required_for_completion: input.requiredForCompletion,
        position: input.position,
        status: input.status,
        updated_at: now,
      })
      .eq('id', input.assessmentId);
    return error ? json({ ok: false, error: 'ASSESSMENT_UPDATE_FAILED' }, 409) : json({ ok: true });
  }

  if (input.options.filter((option) => option.isCorrect).length !== 1) {
    return json({ ok: false, error: 'QUESTION_REQUIRES_EXACTLY_ONE_CORRECT_OPTION' }, 400);
  }

  const { data: question, error: questionError } = await access.admin
    .from('education_assessment_questions')
    .insert({
      assessment_id: input.assessmentId,
      prompt: input.prompt,
      explanation: input.explanation || null,
      points: input.points,
      position: input.position,
      status: 'published',
      updated_at: now,
    })
    .select('id')
    .single();
  if (questionError || !question) return json({ ok: false, error: 'QUESTION_CREATE_FAILED' }, 409);

  const { error: optionsError } = await access.admin
    .from('education_assessment_options')
    .insert(input.options.map((option, index) => ({
      question_id: question.id,
      label: option.label,
      option_text: option.text,
      is_correct: option.isCorrect,
      position: index + 1,
      updated_at: now,
    })));
  if (optionsError) {
    await access.admin.from('education_assessment_questions').delete().eq('id', question.id);
    return json({ ok: false, error: 'QUESTION_OPTIONS_CREATE_FAILED' }, 409);
  }

  return json({ ok: true, question }, 201);
}
