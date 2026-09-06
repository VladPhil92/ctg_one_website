import { NextResponse } from 'next/server';
import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type EnrollmentRpc = {
  courseId?: string;
  enrollmentId?: string;
  status?: string;
};

type ModuleRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  position: number;
};

type LessonRow = {
  id: string;
  module_id: string;
  slug: string;
  title: string;
  summary: string;
  lesson_type: string;
  body: string;
  media_url: string | null;
  duration_minutes: number;
  position: number;
};

type ProgressRow = {
  lesson_id: string;
  status: string;
  progress_percent: number;
  last_position_seconds: number;
  completed_at: string | null;
};

function json(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

function enrollmentFailure(message: string) {
  if (message.includes('EDUCATION_COURSE_ACCESS_REQUIRED')) {
    return { status: 403, code: 'EDUCATION_COURSE_ACCESS_REQUIRED' };
  }
  if (message.includes('EDUCATION_LEARNING_COURSE_UNAVAILABLE')) {
    return { status: 404, code: 'EDUCATION_LEARNING_COURSE_UNAVAILABLE' };
  }
  if (message.includes('EDUCATION_LEARNING_COURSE_SLUG_INVALID')) {
    return { status: 400, code: 'EDUCATION_LEARNING_COURSE_SLUG_INVALID' };
  }
  return { status: 503, code: 'EDUCATION_LEARNING_ENROLLMENT_FAILED' };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ course: string }> },
) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ ok: false, error: 'EDUCATION_LEARNING_UNAVAILABLE' }, 503);
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) return json({ ok: false, error: 'UNAUTHENTICATED' }, 401);

  const { course: rawCourse } = await params;
  const courseSlug = rawCourse.trim().toLowerCase();
  if (!SLUG_RE.test(courseSlug) || courseSlug.length > 100) {
    return json({ ok: false, error: 'EDUCATION_LEARNING_COURSE_SLUG_INVALID' }, 400);
  }

  const admin = createAdminClient();
  const { data: enrollmentData, error: enrollmentError } = await admin.rpc(
    'ensure_education_course_enrollment',
    { p_user_id: auth.user.id, p_course_slug: courseSlug },
  );

  if (enrollmentError) {
    const failure = enrollmentFailure(enrollmentError.message);
    return json({ ok: false, error: failure.code }, failure.status);
  }

  const enrollment = enrollmentData as EnrollmentRpc | null;
  if (!enrollment?.courseId || !enrollment.enrollmentId) {
    return json({ ok: false, error: 'EDUCATION_LEARNING_ENROLLMENT_RESPONSE_INVALID' }, 503);
  }

  const [courseResult, modulesResult] = await Promise.all([
    admin
      .from('education_courses')
      .select('id, slug, title, summary, estimated_minutes, status')
      .eq('id', enrollment.courseId)
      .eq('status', 'published')
      .single(),
    admin
      .from('education_modules')
      .select('id, slug, title, summary, position')
      .eq('course_id', enrollment.courseId)
      .eq('status', 'published')
      .order('position', { ascending: true }),
  ]);

  if (courseResult.error || modulesResult.error || !courseResult.data) {
    return json({ ok: false, error: 'EDUCATION_LEARNING_READ_FAILED' }, 503);
  }

  const modules = (modulesResult.data ?? []) as ModuleRow[];
  const moduleIds = modules.map((module) => module.id);
  let lessons: LessonRow[] = [];

  if (moduleIds.length > 0) {
    const lessonsResult = await admin
      .from('education_lessons')
      .select('id, module_id, slug, title, summary, lesson_type, body, media_url, duration_minutes, position')
      .in('module_id', moduleIds)
      .eq('status', 'published')
      .order('position', { ascending: true });

    if (lessonsResult.error) {
      return json({ ok: false, error: 'EDUCATION_LEARNING_READ_FAILED' }, 503);
    }
    lessons = (lessonsResult.data ?? []) as LessonRow[];
  }

  const lessonIds = lessons.map((lesson) => lesson.id);
  let progressRows: ProgressRow[] = [];
  if (lessonIds.length > 0) {
    const progressResult = await admin
      .from('education_lesson_progress')
      .select('lesson_id, status, progress_percent, last_position_seconds, completed_at')
      .eq('enrollment_id', enrollment.enrollmentId)
      .in('lesson_id', lessonIds);

    if (progressResult.error) {
      return json({ ok: false, error: 'EDUCATION_LEARNING_PROGRESS_READ_FAILED' }, 503);
    }
    progressRows = (progressResult.data ?? []) as ProgressRow[];
  }

  const progressByLesson = new Map(progressRows.map((row) => [row.lesson_id, row]));
  const nestedModules = modules.map((module) => ({
    ...module,
    lessons: lessons
      .filter((lesson) => lesson.module_id === module.id)
      .sort((left, right) => left.position - right.position)
      .map((lesson) => ({
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        summary: lesson.summary,
        lessonType: lesson.lesson_type,
        body: lesson.body,
        mediaUrl: lesson.media_url,
        durationMinutes: lesson.duration_minutes,
        position: lesson.position,
        progress: progressByLesson.get(lesson.id) ?? {
          lesson_id: lesson.id,
          status: 'not_started',
          progress_percent: 0,
          last_position_seconds: 0,
          completed_at: null,
        },
      })),
  }));

  const totalLessons = lessons.length;
  const courseProgressPercent = totalLessons === 0
    ? 0
    : Math.floor(
        lessons.reduce(
          (sum, lesson) => sum + (progressByLesson.get(lesson.id)?.progress_percent ?? 0),
          0,
        ) / totalLessons,
      );
  const completedLessons = lessons.filter(
    (lesson) => progressByLesson.get(lesson.id)?.status === 'completed',
  ).length;

  return json({
    ok: true,
    enrollment: {
      id: enrollment.enrollmentId,
      status: enrollment.status ?? 'active',
    },
    course: {
      id: courseResult.data.id,
      slug: courseResult.data.slug,
      title: courseResult.data.title,
      summary: courseResult.data.summary,
      estimatedMinutes: courseResult.data.estimated_minutes,
      modules: nestedModules,
    },
    progress: {
      courseProgressPercent,
      completedLessons,
      totalLessons,
    },
  });
}
