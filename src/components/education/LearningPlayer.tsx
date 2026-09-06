'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Circle,
  Clock3,
  GraduationCap,
  LoaderCircle,
  LockKeyhole,
  RotateCcw,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

type LessonProgress = {
  lesson_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress_percent: number;
  last_position_seconds: number;
  completed_at: string | null;
};

type Lesson = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  lessonType: string;
  body: string;
  mediaUrl: string | null;
  durationMinutes: number;
  position: number;
  progress: LessonProgress;
};

type CourseModule = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  position: number;
  lessons: Lesson[];
};

type CourseResponse = {
  ok?: boolean;
  error?: string;
  enrollment?: { id: string; status: string };
  course?: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    estimatedMinutes: number;
    modules: CourseModule[];
  };
  progress?: {
    courseProgressPercent: number;
    completedLessons: number;
    totalLessons: number;
  };
};

type LoadState = 'idle' | 'loading' | 'ready' | 'access_required' | 'not_found' | 'error';

export function LearningPlayer({
  courseSlug,
  lessonSlug,
}: {
  courseSlug: string;
  lessonSlug?: string;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<CourseResponse>({});
  const [state, setState] = useState<LoadState>('idle');
  const [claiming, setClaiming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const requestedPath = lessonSlug
    ? `/learn/${courseSlug}/${lessonSlug}`
    : `/learn/${courseSlug}`;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/iniciar-sesion?next=${encodeURIComponent(requestedPath)}`);
    }
  }, [isAuthenticated, isLoading, requestedPath, router]);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setState('loading');
    setNotice(null);
    try {
      const response = await fetch(`/api/education/learning/courses/${encodeURIComponent(courseSlug)}`, {
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => ({}))) as CourseResponse;
      if (response.status === 403 && payload.error === 'EDUCATION_COURSE_ACCESS_REQUIRED') {
        setData({});
        setState('access_required');
        return;
      }
      if (response.status === 404) {
        setData({});
        setState('not_found');
        return;
      }
      if (!response.ok || !payload.ok || !payload.course || !payload.progress) {
        setData({});
        setState('error');
        return;
      }
      setData(payload);
      setState('ready');
    } catch {
      setData({});
      setState('error');
    }
  }, [courseSlug, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated, load]);

  const lessons = useMemo(
    () => data.course?.modules.flatMap((module) => module.lessons) ?? [],
    [data.course?.modules],
  );

  const selectedLesson = useMemo(() => {
    if (lessons.length === 0) return null;
    if (lessonSlug) {
      const requested = lessons.find((lesson) => lesson.slug === lessonSlug);
      if (requested) return requested;
    }
    return lessons.find((lesson) => lesson.progress.status !== 'completed') ?? lessons[0];
  }, [lessonSlug, lessons]);

  const selectedIndex = selectedLesson
    ? lessons.findIndex((lesson) => lesson.id === selectedLesson.id)
    : -1;
  const previousLesson = selectedIndex > 0 ? lessons[selectedIndex - 1] : null;
  const nextLesson = selectedIndex >= 0 && selectedIndex < lessons.length - 1
    ? lessons[selectedIndex + 1]
    : null;

  async function claimAccess() {
    if (claiming) return;
    setClaiming(true);
    setNotice(null);
    try {
      const response = await fetch('/api/education/learning/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: courseSlug }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        accessPath?: string;
      };
      if (!response.ok || !payload.ok) {
        setNotice(payload.error === 'EDUCATION_LEARNING_FREE_CLAIM_FORBIDDEN'
          ? 'Este curso requiere un derecho de acceso previo. Revísalo desde el Campus.'
          : 'No fue posible activar el curso en este momento.');
        return;
      }
      router.replace(payload.accessPath ?? `/learn/${courseSlug}`);
      await load();
    } catch {
      setNotice('No fue posible activar el curso en este momento.');
    } finally {
      setClaiming(false);
    }
  }

  async function completeLesson() {
    if (!selectedLesson || saving || selectedLesson.progress.status === 'completed') return;
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch('/api/education/learning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: selectedLesson.id, progressPercent: 100 }),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setNotice('No fue posible guardar el progreso. Tu acceso no se modificó.');
        return;
      }
      await load();
      if (nextLesson) {
        router.push(`/learn/${courseSlug}/${nextLesson.slug}`);
      } else {
        setNotice('Curso completado. El progreso quedó registrado en tu cuenta CTG One.');
      }
    } catch {
      setNotice('No fue posible guardar el progreso. Tu acceso no se modificó.');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || (!isAuthenticated && !isLoading)) {
    return <div className="min-h-screen bg-[#050505]" />;
  }

  if (state === 'loading' || state === 'idle') {
    return (
      <Shell>
        <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-white/45">
          <LoaderCircle className="h-5 w-5 animate-spin text-accent" aria-hidden="true" />
          Sincronizando tu aprendizaje…
        </div>
      </Shell>
    );
  }

  if (state === 'access_required') {
    return (
      <Shell>
        <Container>
          <section className="mx-auto mt-10 max-w-3xl rounded-3xl border border-white/10 bg-white/[.025] p-7 sm:p-10">
            <LockKeyhole className="h-7 w-7 text-accent" aria-hidden="true" />
            <p className="mt-6 text-[9px] font-bold uppercase tracking-[.2em] text-white/35">CTG One Education</p>
            <h1 className="mt-3 font-outfit text-4xl font-semibold tracking-[-.035em]">Activa tu acceso al curso</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/55">Si esta oferta es gratuita, la activación creará un entitlement complementario y tu matrícula. Si requiere pago o asignación, el sistema no permitirá saltarse ese control.</p>
            {notice ? <p role="alert" className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100">{notice}</p> : null}
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={() => void claimAccess()} disabled={claiming} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-5 text-[10px] font-bold uppercase tracking-[.13em] text-black disabled:opacity-50">
                {claiming ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <GraduationCap className="h-4 w-4" aria-hidden="true" />}
                Activar y comenzar
              </button>
              <a href="/jpvalderrama/campus#catalogo" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/10 px-5 text-[10px] font-bold uppercase tracking-[.13em] text-white/60">Volver al Campus</a>
            </div>
          </section>
        </Container>
      </Shell>
    );
  }

  if (state === 'not_found' || state === 'error' || !data.course || !data.progress || !selectedLesson) {
    return (
      <Shell>
        <Container>
          <section className="mx-auto mt-10 max-w-3xl rounded-3xl border border-white/10 bg-white/[.025] p-8">
            <BookOpenCheck className="h-7 w-7 text-accent" aria-hidden="true" />
            <h1 className="mt-5 font-outfit text-3xl font-semibold">{state === 'not_found' ? 'Curso no disponible' : 'No pudimos cargar el curso'}</h1>
            <p className="mt-4 text-sm leading-7 text-white/50">{state === 'not_found' ? 'El curso solicitado no está publicado.' : 'La biblioteca no pudo sincronizarse. Puedes volver a intentarlo sin perder tu acceso.'}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {state === 'error' ? <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-accent"><RotateCcw className="h-4 w-4" aria-hidden="true" /> Reintentar</button> : null}
              <a href="/dashboard/educacion" className="inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-white/50"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Mi educación</a>
            </div>
          </section>
        </Container>
      </Shell>
    );
  }

  const paragraphs = selectedLesson.body
    .split(/\\n\\n|\n\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <Shell>
      <Container>
        <div className="pb-16 pt-8">
          <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.055] to-white/[.015] p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <a href="/dashboard/educacion" className="inline-flex min-h-10 items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-accent"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Mi educación</a>
              <span className="font-mono text-[10px] text-white/35">{data.progress.completedLessons}/{data.progress.totalLessons} lecciones</span>
            </div>
            <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.22em] text-white/35">JP Valderrama · Learning Core</p>
                <h1 className="mt-3 font-outfit text-4xl font-semibold tracking-[-.045em] sm:text-5xl">{data.course.title}</h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">{data.course.summary}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/45"><Clock3 className="h-4 w-4 text-accent" aria-hidden="true" /> {data.course.estimatedMinutes} min</div>
            </div>
            <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-white/10" aria-label={`Progreso del curso ${data.progress.courseProgressPercent}%`}>
              <div className="h-full bg-accent transition-[width]" style={{ width: `${data.progress.courseProgressPercent}%` }} />
            </div>
            <p className="mt-2 text-right font-mono text-[9px] text-white/35">{data.progress.courseProgressPercent}% completado</p>
          </header>

          <div className="mt-6 grid gap-6 xl:grid-cols-[330px_minmax(0,1fr)]">
            <aside className="self-start rounded-2xl border border-white/10 bg-white/[.025] p-4 xl:sticky xl:top-24">
              <p className="px-2 pb-3 text-[9px] font-bold uppercase tracking-[.2em] text-white/30">Programa</p>
              <div className="space-y-4">
                {data.course.modules.map((module) => (
                  <section key={module.id}>
                    <h2 className="px-2 text-sm font-semibold text-white/75">{module.position}. {module.title}</h2>
                    <div className="mt-2 space-y-1">
                      {module.lessons.map((lesson) => {
                        const active = lesson.id === selectedLesson.id;
                        const completed = lesson.progress.status === 'completed';
                        return (
                          <a key={lesson.id} href={`/learn/${courseSlug}/${lesson.slug}`} aria-current={active ? 'page' : undefined} className={active ? 'flex min-h-11 items-center gap-3 rounded-xl border border-accent/25 bg-accent/10 px-3 text-xs text-white' : 'flex min-h-11 items-center gap-3 rounded-xl px-3 text-xs text-white/50 hover:bg-white/[.04] hover:text-white/75'}>
                            {completed ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" /> : <Circle className="h-4 w-4 shrink-0 text-white/20" aria-hidden="true" />}
                            <span>{lesson.title}</span>
                          </a>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </aside>

            <article className="rounded-2xl border border-white/10 bg-white/[.025] p-6 sm:p-9 lg:p-11">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-[9px] font-bold uppercase tracking-[.2em] text-accent">Lección {selectedIndex + 1} de {lessons.length}</p>
                <span className="inline-flex items-center gap-2 text-[10px] text-white/35"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> {selectedLesson.durationMinutes} min</span>
              </div>
              <h2 className="mt-4 max-w-4xl font-outfit text-4xl font-semibold tracking-[-.04em] sm:text-5xl">{selectedLesson.title}</h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-white/50">{selectedLesson.summary}</p>

              <div className="mt-10 max-w-3xl space-y-6 border-t border-white/[.07] pt-9">
                {paragraphs.map((paragraph, index) => <p key={`${selectedLesson.id}-${index}`} className="text-[17px] leading-8 text-white/75">{paragraph}</p>)}
              </div>

              {notice ? <p role="status" className="mt-8 rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm leading-6 text-white/75">{notice}</p> : null}

              <div className="mt-10 flex flex-col gap-4 border-t border-white/[.07] pt-7 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {previousLesson ? <a href={`/learn/${courseSlug}/${previousLesson.slug}`} className="inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-white/45"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Anterior</a> : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <button type="button" onClick={() => void completeLesson()} disabled={saving || selectedLesson.progress.status === 'completed'} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-5 text-[10px] font-bold uppercase tracking-[.13em] text-black disabled:cursor-default disabled:opacity-55">
                    {saving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BookOpenCheck className="h-4 w-4" aria-hidden="true" />}
                    {selectedLesson.progress.status === 'completed' ? 'Lección completada' : 'Marcar como completada'}
                  </button>
                  {nextLesson ? <a href={`/learn/${courseSlug}/${nextLesson.slug}`} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/10 px-5 text-[10px] font-bold uppercase tracking-[.13em] text-white/60">Siguiente <ArrowRight className="h-4 w-4" aria-hidden="true" /></a> : null}
                </div>
              </div>
            </article>
          </div>
        </div>
      </Container>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />
      <main className="pt-20">{children}</main>
    </div>
  );
}
