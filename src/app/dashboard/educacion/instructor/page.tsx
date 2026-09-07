'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpenCheck, FileQuestion, GraduationCap, Layers3, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

type Course = { id: string; slug: string; title: string; summary: string; status: 'draft' | 'published' | 'archived'; estimated_minutes: number };
type Module = { id: string; course_id: string; slug: string; title: string; summary: string; position: number; status: string };
type Lesson = { id: string; module_id: string; slug: string; title: string; summary: string; body: string; duration_minutes: number; position: number; status: string };
type Assessment = { id: string; course_id: string; slug: string; title: string; instructions: string; status: string; passing_score: number | string; max_attempts: number; required_for_completion: boolean; position: number };
type Question = { id: string; assessment_id: string; prompt: string; points: number; position: number; status: string };
type StudioResponse = { ok?: boolean; error?: string; courses?: Course[]; modules?: Module[]; lessons?: Lesson[]; assessments?: Assessment[]; questions?: Question[] };

type ActionPayload = Record<string, unknown> & { action: string };

export default function EducationInstructorStudioPage() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<StudioResponse>({});
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'forbidden'>('loading');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/iniciar-sesion?next=/dashboard/educacion/instructor');
  }, [isAuthenticated, isLoading, router]);

  const load = useCallback(async () => {
    if (!isAuthenticated || profile?.role !== 'admin') return;
    setState('loading');
    try {
      const response = await fetch('/api/education/instructor', { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as StudioResponse;
      if (response.status === 403) return setState('forbidden');
      if (!response.ok || !payload.ok) return setState('error');
      setData(payload);
      setSelectedCourseId((current) => current || payload.courses?.[0]?.id || '');
      setState('ready');
    } catch { setState('error'); }
  }, [isAuthenticated, profile?.role]);

  useEffect(() => { void load(); }, [load]);

  const modules = useMemo(() => (data.modules ?? []).filter((item) => item.course_id === selectedCourseId), [data.modules, selectedCourseId]);
  const lessons = useMemo(() => (data.lessons ?? []).filter((item) => modules.some((module) => module.id === item.module_id)), [data.lessons, modules]);
  const assessments = useMemo(() => (data.assessments ?? []).filter((item) => item.course_id === selectedCourseId), [data.assessments, selectedCourseId]);
  const selectedCourse = (data.courses ?? []).find((item) => item.id === selectedCourseId) ?? null;

  useEffect(() => {
    if (!modules.some((module) => module.id === selectedModuleId)) setSelectedModuleId(modules[0]?.id ?? '');
    if (!assessments.some((item) => item.id === selectedAssessmentId)) setSelectedAssessmentId(assessments[0]?.id ?? '');
  }, [assessments, modules, selectedAssessmentId, selectedModuleId]);

  async function send(payload: ActionPayload) {
    if (submitting) return false;
    setSubmitting(true); setNotice(null);
    try {
      const response = await fetch('/api/education/instructor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) { setNotice(`Operación rechazada: ${result.error ?? 'ERROR'}`); return false; }
      await load(); return true;
    } catch { setNotice('No fue posible completar la operación.'); return false; }
    finally { setSubmitting(false); }
  }

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
    const ok = await send({ action: 'create_course', slug: String(values.get('slug') ?? ''), title: String(values.get('title') ?? ''), summary: String(values.get('summary') ?? ''), estimatedMinutes: Number(values.get('estimatedMinutes') ?? 60), priceAmount: Number(values.get('priceAmount') ?? 0) });
    if (ok) { form.reset(); setNotice('Curso borrador creado. Añade currículo antes de publicarlo.'); }
  }

  async function updateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedCourse) return; const values = new FormData(event.currentTarget);
    const ok = await send({ action: 'update_course', courseId: selectedCourse.id, title: String(values.get('title') ?? ''), summary: String(values.get('summary') ?? ''), estimatedMinutes: Number(values.get('estimatedMinutes') ?? 1), status: String(values.get('status') ?? 'draft') });
    if (ok) setNotice('Curso actualizado. Publicar sincroniza también su oferta del Campus.');
  }

  async function createModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedCourseId) return; const form = event.currentTarget; const values = new FormData(form);
    const ok = await send({ action: 'create_module', courseId: selectedCourseId, slug: String(values.get('slug') ?? ''), title: String(values.get('title') ?? ''), summary: String(values.get('summary') ?? ''), position: Number(values.get('position') ?? modules.length + 1) });
    if (ok) { form.reset(); setNotice('Módulo borrador creado.'); }
  }

  async function createLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedModuleId) return; const form = event.currentTarget; const values = new FormData(form);
    const ok = await send({ action: 'create_lesson', moduleId: selectedModuleId, slug: String(values.get('slug') ?? ''), title: String(values.get('title') ?? ''), summary: String(values.get('summary') ?? ''), body: String(values.get('body') ?? ''), durationMinutes: Number(values.get('durationMinutes') ?? 10), position: Number(values.get('position') ?? 1), lessonType: 'text', mediaUrl: '' });
    if (ok) { form.reset(); setNotice('Lección borrador creada. Puedes editar su contenido desde el Studio.'); }
  }

  async function createAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedCourseId) return; const form = event.currentTarget; const values = new FormData(form);
    const ok = await send({ action: 'create_assessment', courseId: selectedCourseId, slug: String(values.get('slug') ?? ''), title: String(values.get('title') ?? ''), instructions: String(values.get('instructions') ?? ''), passingScore: Number(values.get('passingScore') ?? 70), maxAttempts: Number(values.get('maxAttempts') ?? 3), requiredForCompletion: true, position: Number(values.get('position') ?? assessments.length + 1) });
    if (ok) { form.reset(); setNotice('Evaluación borrador creada.'); }
  }

  async function createQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedAssessmentId) return; const form = event.currentTarget; const values = new FormData(form); const correct = String(values.get('correct') ?? 'B');
    const ok = await send({ action: 'create_question', assessmentId: selectedAssessmentId, prompt: String(values.get('prompt') ?? ''), explanation: String(values.get('explanation') ?? ''), points: 1, position: Number(values.get('position') ?? 1), options: ['A', 'B', 'C'].map((label) => ({ label, text: String(values.get(`option${label}`) ?? ''), isCorrect: label === correct })) });
    if (ok) { form.reset(); setNotice('Pregunta creada con clave server-side.'); }
  }

  if (isLoading || (!profile && isAuthenticated)) return <div className="min-h-screen bg-[#030303]" />;
  if (!isAuthenticated) return <div className="min-h-screen bg-[#030303]" />;
  if (profile?.role !== 'admin' || state === 'forbidden') return <Restricted />;

  return <div className="min-h-screen bg-[#050505] text-white"><Navbar /><main className="pb-20 pt-24"><Container>
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.055] to-white/[.015] p-6 sm:p-8">
      <a href="/dashboard/educacion" className="inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-accent"><ArrowLeft className="h-4 w-4" /> Education OS</a>
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-white/35">Instructor Studio V1</p><h1 className="mt-3 font-outfit text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Autoría académica</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">Crea cursos, módulos, lecciones y evaluaciones sin editar SQL. Los cursos nacen en borrador; publicar requiere al menos una lección publicada y sincroniza su oferta del Campus.</p></div><button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-[10px] font-bold uppercase tracking-[.13em] text-white/60"><RefreshCw className={state === 'loading' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Actualizar</button></div>
    </section>
    {notice ? <p role="status" className="mt-5 rounded-2xl border border-accent/20 bg-accent/10 p-4 text-sm text-white/75">{notice}</p> : null}
    {state === 'error' ? <p role="alert" className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/5 p-4 text-sm text-red-200">No fue posible sincronizar Instructor Studio.</p> : null}

    <section className="mt-8 grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
      <aside className="space-y-5">
        <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center gap-3"><GraduationCap className="h-5 w-5 text-accent" /><h2 className="font-outfit text-xl font-semibold">Cursos</h2></div><div className="mt-4 space-y-2">{(data.courses ?? []).map((course) => <button key={course.id} type="button" onClick={() => setSelectedCourseId(course.id)} className={selectedCourseId === course.id ? 'w-full rounded-xl border border-accent/30 bg-accent/10 p-4 text-left' : 'w-full rounded-xl border border-white/[.07] bg-black/20 p-4 text-left'}><div className="flex justify-between gap-3"><span className="text-sm font-semibold">{course.title}</span><span className="text-[9px] uppercase text-accent">{course.status}</span></div><p className="mt-1 text-[10px] text-white/35">{course.slug}</p></button>)}</div></article>
        <form onSubmit={createCourse} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center gap-2"><Plus className="h-4 w-4 text-accent" /><h2 className="font-outfit text-lg font-semibold">Nuevo curso</h2></div><FieldsCourse /><button disabled={submitting} className="mt-4 min-h-11 rounded-xl bg-accent px-4 text-[10px] font-bold uppercase tracking-[.13em] text-black disabled:opacity-50">Crear borrador</button></form>
      </aside>

      <div className="space-y-5">{selectedCourse ? <>
        <form onSubmit={updateCourse} key={selectedCourse.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center gap-3"><BookOpenCheck className="h-5 w-5 text-accent" /><h2 className="font-outfit text-xl font-semibold">Editar y publicar curso</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input name="title" label="Título" defaultValue={selectedCourse.title} required /><Input name="estimatedMinutes" label="Duración estimada" type="number" defaultValue={String(selectedCourse.estimated_minutes)} required /><label className="text-xs text-white/45 sm:col-span-2">Resumen<textarea name="summary" defaultValue={selectedCourse.summary} required minLength={10} rows={4} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white" /></label><label className="text-xs text-white/45">Estado<select name="status" defaultValue={selectedCourse.status} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"><option value="draft">Borrador</option><option value="published">Publicado</option><option value="archived">Archivado</option></select></label></div><button disabled={submitting} className="mt-4 min-h-11 rounded-xl bg-accent px-4 text-[10px] font-bold uppercase tracking-[.13em] text-black disabled:opacity-50">Guardar curso</button></form>

        <div className="grid gap-5 lg:grid-cols-2">
          <form onSubmit={createModule} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-accent" /><h2 className="font-outfit text-lg font-semibold">Añadir módulo</h2></div><Input name="slug" label="Slug" required /><Input name="title" label="Título" required /><Input name="summary" label="Resumen" required /><Input name="position" label="Posición" type="number" defaultValue={String(modules.length + 1)} required /><button disabled={submitting} className="mt-4 min-h-11 rounded-xl bg-accent px-4 text-[10px] font-bold uppercase tracking-[.13em] text-black">Crear módulo</button></form>
          <form onSubmit={createLesson} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center gap-2"><BookOpenCheck className="h-4 w-4 text-accent" /><h2 className="font-outfit text-lg font-semibold">Añadir lección</h2></div><label className="mt-4 block text-xs text-white/45">Módulo<select value={selectedModuleId} onChange={(event) => setSelectedModuleId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white">{modules.map((module) => <option key={module.id} value={module.id}>{module.position}. {module.title}</option>)}</select></label><Input name="slug" label="Slug" required /><Input name="title" label="Título" required /><Input name="summary" label="Resumen" required /><Input name="durationMinutes" label="Minutos" type="number" defaultValue="10" required /><Input name="position" label="Posición" type="number" defaultValue={String(lessons.filter((lesson) => lesson.module_id === selectedModuleId).length + 1)} required /><label className="mt-3 block text-xs text-white/45">Contenido<textarea name="body" rows={6} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white" /></label><button disabled={submitting || !selectedModuleId} className="mt-4 min-h-11 rounded-xl bg-accent px-4 text-[10px] font-bold uppercase tracking-[.13em] text-black disabled:opacity-50">Crear lección</button></form>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <form onSubmit={createAssessment} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center gap-2"><FileQuestion className="h-4 w-4 text-accent" /><h2 className="font-outfit text-lg font-semibold">Nueva evaluación</h2></div><Input name="slug" label="Slug" required /><Input name="title" label="Título" required /><Input name="instructions" label="Instrucciones" /><Input name="passingScore" label="Aprobación %" type="number" defaultValue="70" required /><Input name="maxAttempts" label="Máximo intentos" type="number" defaultValue="3" required /><Input name="position" label="Posición" type="number" defaultValue={String(assessments.length + 1)} required /><button disabled={submitting} className="mt-4 min-h-11 rounded-xl bg-accent px-4 text-[10px] font-bold uppercase tracking-[.13em] text-black">Crear evaluación</button></form>
          <form onSubmit={createQuestion} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /><h2 className="font-outfit text-lg font-semibold">Añadir pregunta</h2></div><label className="mt-4 block text-xs text-white/45">Evaluación<select value={selectedAssessmentId} onChange={(event) => setSelectedAssessmentId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white">{assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.title}</option>)}</select></label><Input name="prompt" label="Pregunta" required /><Input name="optionA" label="Opción A" required /><Input name="optionB" label="Opción B" required /><Input name="optionC" label="Opción C" required /><label className="mt-3 block text-xs text-white/45">Respuesta correcta<select name="correct" defaultValue="B" className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"><option>A</option><option>B</option><option>C</option></select></label><Input name="explanation" label="Explicación" /><Input name="position" label="Posición" type="number" defaultValue={String((data.questions ?? []).filter((question) => question.assessment_id === selectedAssessmentId).length + 1)} required /><button disabled={submitting || !selectedAssessmentId} className="mt-4 min-h-11 rounded-xl bg-accent px-4 text-[10px] font-bold uppercase tracking-[.13em] text-black disabled:opacity-50">Crear pregunta</button></form>
        </div>
      </> : <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6 text-sm text-white/35">Crea o selecciona un curso.</div>}</div>
    </section>
  </Container></main></div>;
}

function Input({ label, name, type = 'text', required = false, defaultValue }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string }) { return <label className="mt-3 block text-xs text-white/45">{label}<input name={name} type={type} required={required} defaultValue={defaultValue} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white" /></label>; }
function FieldsCourse() { return <><Input name="slug" label="Slug" required /><Input name="title" label="Título" required /><Input name="summary" label="Resumen" required /><Input name="estimatedMinutes" label="Minutos estimados" type="number" defaultValue="60" required /><Input name="priceAmount" label="Precio COP" type="number" defaultValue="0" required /></>; }
function Restricted() { return <div className="min-h-screen bg-[#050505] text-white"><Navbar /><main className="pb-20 pt-24"><Container><section className="rounded-3xl border border-white/10 bg-white/[.025] p-8"><ShieldCheck className="h-6 w-6 text-accent" /><h1 className="mt-5 font-outfit text-3xl font-semibold">Instructor Studio restringido</h1><p className="mt-4 text-sm text-white/50">Esta superficie de autoría está disponible únicamente para administradores educativos autorizados.</p></section></Container></main></div>; }
