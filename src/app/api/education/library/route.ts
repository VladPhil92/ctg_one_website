import { NextResponse } from 'next/server';
import { createAuthenticatedRequestContext } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function json(body: Record<string, unknown>, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

type ProgressRow = {
  lesson_id: string;
  status: string;
  progress_percent: number | null;
  updated_at: string;
};

type LessonRow = {
  id: string;
  status: string;
};

type ModuleRow = {
  id: string;
  status: string;
  lessons: LessonRow[] | LessonRow | null;
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  estimated_minutes: number | null;
  modules: ModuleRow[] | ModuleRow | null;
};

type EnrollmentRow = {
  id: string;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  course: CourseRow[] | CourseRow | null;
  progress: ProgressRow[] | ProgressRow | null;
};

function clampPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function buildLearningReadModel(rows: EnrollmentRow[]) {
  return rows.flatMap((enrollment) => {
    const course = firstRelation(enrollment.course);
    if (!course) return [];

    const modules = asArray(course.modules).filter((module) => module.status === 'published');
    const publishedLessons = modules.flatMap((module) => asArray(module.lessons).filter((lesson) => lesson.status === 'published'));
    const publishedLessonIds = new Set(publishedLessons.map((lesson) => lesson.id));
    const progressRows = asArray(enrollment.progress).filter((progress) => publishedLessonIds.has(progress.lesson_id));
    const progressByLesson = new Map(progressRows.map((progress) => [progress.lesson_id, progress]));

    let completedLessons = 0;
    let totalProgress = 0;
    for (const lesson of publishedLessons) {
      const progress = progressByLesson.get(lesson.id);
      const percent = clampPercent(progress?.progress_percent);
      totalProgress += percent;
      if (progress?.status === 'completed' || percent >= 100) completedLessons += 1;
    }

    const totalLessons = publishedLessons.length;
    const progressPercent = totalLessons > 0 ? Math.round(totalProgress / totalLessons) : 0;
    const timestamps = [
      enrollment.updated_at,
      enrollment.enrolled_at,
      ...progressRows.map((progress) => progress.updated_at),
    ].filter(Boolean);
    const lastActivityAt = timestamps.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? enrollment.enrolled_at;

    return [{
      enrollmentId: enrollment.id,
      status: enrollment.status,
      enrolledAt: enrollment.enrolled_at,
      completedAt: enrollment.completed_at,
      course: {
        id: course.id,
        slug: course.slug,
        title: course.title,
        summary: course.summary,
        estimatedMinutes: course.estimated_minutes,
      },
      totalLessons,
      completedLessons,
      progressPercent,
      lastActivityAt,
      continuePath: `/learn/${encodeURIComponent(course.slug)}`,
    }];
  });
}

export async function GET(request: Request) {
  const context = await createAuthenticatedRequestContext(request);
  if (!context) {
    return json({ ok: false }, 401);
  }

  const [entitlementsResult, ordersResult, advisoryResult, enrollmentsResult] = await Promise.all([
    context.supabase
      .from('education_entitlements')
      .select(`
        id,
        status,
        source_type,
        starts_at,
        ends_at,
        granted_at,
        offering:education_offerings (
          id,
          slug,
          title,
          offering_type,
          summary,
          access_path,
          metadata
        )
      `)
      .eq('user_id', context.user.id)
      .order('granted_at', { ascending: false }),
    context.supabase
      .from('education_orders')
      .select('id, status, currency, total_amount, payment_provider, provider_reference, verified_at, created_at')
      .eq('user_id', context.user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    context.supabase
      .from('education_advisory_requests')
      .select('id, institution_name, service_area, status, created_at, updated_at')
      .eq('user_id', context.user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    context.supabase
      .from('education_enrollments')
      .select(`
        id,
        status,
        enrolled_at,
        completed_at,
        created_at,
        updated_at,
        course:education_courses (
          id,
          slug,
          title,
          summary,
          estimated_minutes,
          modules:education_modules (
            id,
            status,
            lessons:education_lessons (
              id,
              status
            )
          )
        ),
        progress:education_lesson_progress (
          lesson_id,
          status,
          progress_percent,
          updated_at
        )
      `)
      .eq('user_id', context.user.id)
      .order('updated_at', { ascending: false })
      .limit(20),
  ]);

  if (entitlementsResult.error || ordersResult.error || advisoryResult.error || enrollmentsResult.error) {
    return json({ ok: false }, 503);
  }

  const learning = buildLearningReadModel((enrollmentsResult.data ?? []) as EnrollmentRow[]);

  return json({
    ok: true,
    userId: context.user.id,
    transport: context.transport,
    entitlements: entitlementsResult.data ?? [],
    orders: ordersResult.data ?? [],
    advisoryRequests: advisoryResult.data ?? [],
    learning,
  });
}
