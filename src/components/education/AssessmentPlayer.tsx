'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, LoaderCircle, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

type Option = { id: string; label: string; text: string; position: number };
type Question = { id: string; prompt: string; questionType: string; points: number; position: number; options: Option[] };
type Attempt = { id: string; attempt_number: number; score_percent: number | string; passed: boolean; points_earned: number; points_possible: number; submitted_at: string };
type AssessmentResponse = {
  ok?: boolean;
  error?: string;
  course?: { slug: string; title: string };
  assessment?: { id: string; slug: string; title: string; instructions: string; passingScore: number; maxAttempts: number; requiredForCompletion: boolean; questions: Question[] };
  attempts?: Attempt[];
  attemptsRemaining?: number;
  passed?: boolean;
};
type SubmitResponse = { ok?: boolean; error?: string; result?: { attemptId: string; attemptNumber: number; scorePercent: number | string; passed: boolean; pointsEarned: number; pointsPossible: number; attemptsRemaining: number } };

export function AssessmentPlayer({ assessmentId }: { assessmentId: string }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AssessmentResponse>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResponse['result'] | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace(`/iniciar-sesion?next=${encodeURIComponent(`/learn/assessment/${assessmentId}`)}`);
  }, [assessmentId, isAuthenticated, isLoading, router]);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setState('loading');
    try {
      const response = await fetch(`/api/education/assessments/${encodeURIComponent(assessmentId)}`, { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as AssessmentResponse;
      if (!response.ok || !payload.ok || !payload.assessment) return setState('error');
      setData(payload);
      setState('ready');
    } catch { setState('error'); }
  }, [assessmentId, isAuthenticated]);

  useEffect(() => { void load(); }, [load]);

  const questions = data.assessment?.questions ?? [];
  const complete = useMemo(() => questions.length > 0 && questions.every((question) => Boolean(answers[question.id])), [answers, questions]);

  async function submit() {
    if (!complete || submitting || data.passed) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/education/assessments/${encodeURIComponent(assessmentId)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }),
      });
      const payload = (await response.json().catch(() => ({}))) as SubmitResponse;
      if (!response.ok || !payload.ok || !payload.result) {
        setResult(null);
        setState('error');
        return;
      }
      setResult(payload.result);
      setAnswers({});
      await load();
    } catch { setState('error'); }
    finally { setSubmitting(false); }
  }

  if (isLoading || !isAuthenticated) return <div className="min-h-screen bg-[#050505]" />;
  if (state === 'loading') return <Shell><div className="flex min-h-[55vh] items-center justify-center gap-3 text-sm text-white/45"><LoaderCircle className="h-5 w-5 animate-spin text-accent" /> Sincronizando evaluación…</div></Shell>;
  if (state === 'error' || !data.assessment || !data.course) return <Shell><Container><section className="mx-auto mt-10 max-w-3xl rounded-3xl border border-red-400/20 bg-red-500/5 p-8"><h1 className="font-outfit text-3xl font-semibold">No pudimos cargar la evaluación</h1><button onClick={() => void load()} className="mt-6 inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-accent"><RotateCcw className="h-4 w-4" /> Reintentar</button></section></Container></Shell>;

  const attempts = data.attempts ?? [];
  return <Shell><Container><div className="pb-16 pt-8">
    <header className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.055] to-white/[.015] p-6 sm:p-8">
      <a href={`/learn/${data.course.slug}`} className="inline-flex min-h-10 items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-accent"><ArrowLeft className="h-4 w-4" /> Volver al curso</a>
      <p className="mt-6 text-[9px] font-bold uppercase tracking-[.22em] text-white/35">Assessment Core · {data.course.title}</p>
      <h1 className="mt-3 font-outfit text-4xl font-semibold tracking-[-.045em] sm:text-5xl">{data.assessment.title}</h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">{data.assessment.instructions}</p>
      <div className="mt-5 flex flex-wrap gap-3 text-[10px] uppercase tracking-[.12em] text-white/35"><span>Aprobación: {data.assessment.passingScore}%</span><span>Intentos: {attempts.length}/{data.assessment.maxAttempts}</span><span>{data.assessment.requiredForCompletion ? 'Evaluación requerida' : 'Evaluación opcional'}</span></div>
    </header>

    {result ? <section className={result.passed ? 'mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-6' : 'mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/5 p-6'}><div className="flex items-start gap-3">{result.passed ? <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-300" /> : <XCircle className="mt-1 h-5 w-5 text-amber-200" />}<div><h2 className="font-outfit text-xl font-semibold">{result.passed ? 'Evaluación aprobada' : 'Aún no alcanzas el umbral'}</h2><p className="mt-2 text-sm text-white/55">Resultado: {Number(result.scorePercent).toFixed(0)}% · {result.pointsEarned}/{result.pointsPossible} puntos · {result.attemptsRemaining} intentos restantes.</p></div></div></section> : null}

    {data.passed ? <section className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-6"><ShieldCheck className="h-5 w-5 text-emerald-300" /><h2 className="mt-3 font-outfit text-2xl font-semibold">Evidencia de comprensión registrada</h2><p className="mt-3 text-sm leading-7 text-white/55">Ya existe al menos un intento aprobado asociado a tu matrícula. Puedes revisar el historial debajo.</p></section> : null}

    {!data.passed && (data.attemptsRemaining ?? 0) > 0 ? <section className="mt-6 space-y-4">
      {questions.map((question) => <article key={question.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6"><p className="text-[9px] font-bold uppercase tracking-[.16em] text-accent">Pregunta {question.position} · {question.points} punto</p><h2 className="mt-3 text-base font-semibold leading-7 text-white/85">{question.prompt}</h2><div className="mt-4 space-y-2">{question.options.map((option) => <label key={option.id} className={answers[question.id] === option.id ? 'flex cursor-pointer gap-3 rounded-xl border border-accent/35 bg-accent/10 p-4' : 'flex cursor-pointer gap-3 rounded-xl border border-white/10 bg-black/20 p-4'}><input type="radio" name={question.id} value={option.id} checked={answers[question.id] === option.id} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} className="mt-1" /><span className="text-sm leading-6 text-white/65"><strong className="mr-2 text-white/85">{option.label}.</strong>{option.text}</span></label>)}</div></article>)}
      <button type="button" onClick={() => void submit()} disabled={!complete || submitting} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-6 text-[10px] font-bold uppercase tracking-[.14em] text-black disabled:opacity-40">{submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Enviar evaluación</button>
    </section> : null}

    <section className="mt-10"><p className="text-[9px] font-bold uppercase tracking-[.2em] text-white/35">Evidencia</p><h2 className="mt-2 font-outfit text-2xl font-semibold">Historial de intentos</h2><div className="mt-4 space-y-3">{attempts.length === 0 ? <p className="rounded-2xl border border-white/10 bg-white/[.025] p-5 text-sm text-white/40">Aún no hay intentos registrados.</p> : attempts.map((attempt) => <div key={attempt.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-5"><div><p className="text-sm font-semibold">Intento {attempt.attempt_number}</p><p className="mt-1 text-xs text-white/35">{new Date(attempt.submitted_at).toLocaleString('es-CO')}</p></div><div className="text-right"><p className={attempt.passed ? 'font-mono text-xl font-semibold text-emerald-300' : 'font-mono text-xl font-semibold text-amber-200'}>{Number(attempt.score_percent).toFixed(0)}%</p><p className="mt-1 text-[9px] uppercase tracking-[.12em] text-white/35">{attempt.passed ? 'Aprobado' : 'No aprobado'}</p></div></div>)}</div></section>
  </div></Container></Shell>;
}

function Shell({ children }: { children: React.ReactNode }) { return <div className="min-h-screen bg-[#050505] text-white"><Navbar /><main className="pt-24">{children}</main></div>; }
