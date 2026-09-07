'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  FileText,
  GraduationCap,
  Lightbulb,
  LibraryBig,
  Mic2,
  Presentation,
  RefreshCw,
  School,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

type EducationOffering = {
  id: string;
  slug: string;
  title: string;
  offering_type: 'conference' | 'book' | 'course' | 'class' | 'resource';
  summary: string;
  access_path: string | null;
  metadata?: Record<string, unknown> | null;
};

type Entitlement = {
  id: string;
  status: 'active' | 'revoked' | 'expired';
  source_type: string;
  starts_at: string;
  ends_at: string | null;
  granted_at: string;
  offering: EducationOffering | EducationOffering[] | null;
};

type EducationOrder = {
  id: string;
  status: string;
  currency: string;
  total_amount: number;
  payment_provider: string | null;
  provider_reference: string | null;
  verified_at: string | null;
  created_at: string;
};

type AdvisoryRequest = {
  id: string;
  institution_name: string;
  service_area: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type LearningItem = {
  enrollmentId: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
  course: {
    id: string;
    slug: string;
    title: string;
    summary: string;
    estimatedMinutes: number | null;
  };
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  lastActivityAt: string;
  continuePath: string;
};

type LibraryResponse = {
  ok?: boolean;
  entitlements?: Entitlement[];
  orders?: EducationOrder[];
  advisoryRequests?: AdvisoryRequest[];
  learning?: LearningItem[];
};

const categoryMeta = {
  course: { label: 'Mis cursos', icon: GraduationCap },
  conference: { label: 'Mis conferencias', icon: Presentation },
  book: { label: 'Mis libros', icon: BookOpen },
  class: { label: 'Mis clases', icon: School },
  resource: { label: 'Recursos', icon: FileText },
} as const;

const axes = [
  { title: 'Talks', text: 'Conferencias, eventos y conversaciones.', href: '/jpvalderrama/talks', icon: Mic2 },
  { title: 'Ideas', text: 'Archivo editorial, cursos y recursos.', href: '/jpvalderrama/ideas', icon: Lightbulb },
  { title: 'Books', text: 'Publicaciones y ediciones disponibles.', href: '/jpvalderrama/books', icon: BookOpen },
  { title: 'Projects', text: 'Programas, asesoría y proyectos a medida.', href: '/jpvalderrama/projects', icon: Sparkles },
] as const;

const advisoryStatus: Record<string, string> = {
  submitted: 'Recibida',
  qualified: 'En diagnóstico',
  proposal: 'Propuesta',
  scheduled: 'Programada',
  won: 'Contratada',
  lost: 'Cerrada',
  closed: 'Finalizada',
};

const orderStatus: Record<string, string> = {
  initiated: 'Iniciada',
  pending: 'Pendiente de pago/verificación',
  paid: 'Pagada y verificada',
  failed: 'Fallida',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
};

function normalizeOffering(value: Entitlement['offering']) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function progressLabel(item: LearningItem) {
  if (item.progressPercent >= 100 || item.status === 'completed') return 'Completado';
  if (item.progressPercent > 0) return 'En progreso';
  return 'Listo para comenzar';
}

export default function EducationDashboardPage() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const router = useRouter();
  const [library, setLibrary] = useState<LibraryResponse>({});
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/iniciar-sesion?next=/dashboard/educacion');
    }
  }, [isAuthenticated, isLoading, router]);

  async function loadLibrary() {
    if (!isAuthenticated) return;
    setState('loading');
    try {
      const response = await fetch('/api/education/library', { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as LibraryResponse;
      if (!response.ok || !payload.ok) {
        setState('error');
        return;
      }
      setLibrary(payload);
      setState('ready');
    } catch {
      setState('error');
    }
  }

  useEffect(() => {
    if (isAuthenticated) void loadLibrary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const grouped = useMemo(() => {
    const groups: Record<keyof typeof categoryMeta, Array<{ entitlement: Entitlement; offering: EducationOffering }>> = {
      course: [],
      conference: [],
      book: [],
      class: [],
      resource: [],
    };

    for (const entitlement of library.entitlements ?? []) {
      const offering = normalizeOffering(entitlement.offering);
      if (offering && offering.offering_type in groups) {
        groups[offering.offering_type].push({ entitlement, offering });
      }
    }
    return groups;
  }, [library.entitlements]);

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-[#030303]" />;
  }

  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? 'Usuario';
  const totalActive = (library.entitlements ?? []).filter((item) => item.status === 'active').length;
  const learning = library.learning ?? [];
  const activeLearning = learning.filter((item) => item.status === 'active' && item.progressPercent < 100).length;
  const pendingOrders = (library.orders ?? []).filter((order) => order.status === 'initiated' || order.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />
      <main className="pb-20 pt-24">
        <Container>
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.055] to-white/[.015] p-6 sm:p-8">
            <a href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-accent"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard</a>
            <div className="mt-5 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-white/35">CTG One / Education OS</p>
                <h1 className="mt-3 font-outfit text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Mi aprendizaje</h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">{firstName}, este es tu centro educativo: progreso de cursos, accesos, conferencias, libros, clases, compras y solicitudes institucionales bajo la misma identidad CTG One.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="/jpvalderrama/campus" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 text-[10px] font-bold uppercase tracking-[.13em] text-accent">Explorar Campus <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
                <button type="button" onClick={() => void loadLibrary()} disabled={state === 'loading'} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-[10px] font-bold uppercase tracking-[.13em] text-white/60 disabled:opacity-50"><RefreshCw className={state === 'loading' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden="true" /> Actualizar</button>
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<LibraryBig className="h-4 w-4" />} label="Accesos activos" value={state === 'loading' ? '—' : String(totalActive)} />
            <Metric icon={<GraduationCap className="h-4 w-4" />} label="Cursos en progreso" value={state === 'loading' ? '—' : String(activeLearning)} />
            <Metric icon={<ShieldCheck className="h-4 w-4" />} label="Órdenes pendientes" value={state === 'loading' ? '—' : String(pendingOrders)} />
            <Metric icon={<Building2 className="h-4 w-4" />} label="Solicitudes" value={state === 'loading' ? '—' : String((library.advisoryRequests ?? []).length)} />
          </section>

          {state === 'error' ? (
            <section className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/5 p-6">
              <p className="text-sm text-red-200">No fue posible sincronizar tu espacio educativo. Ningún acceso se modifica por este error; intenta actualizar nuevamente.</p>
            </section>
          ) : null}

          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-white/35">Learning Core</p><h2 className="mt-2 font-outfit text-2xl font-semibold">Continuar aprendiendo</h2></div>
              <a href="/jpvalderrama/ideas#oferta" className="inline-flex min-h-10 items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-accent">Descubrir cursos <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></a>
            </div>

            {state === 'loading' ? <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6 text-sm text-white/35">Sincronizando progreso…</div> : null}
            {state === 'ready' && learning.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6 sm:p-7"><p className="text-sm leading-7 text-white/45">Aún no tienes matrículas activas. Puedes activar un curso gratuito o adquirir una experiencia formativa desde el Campus.</p><a href="/jpvalderrama/campus#catalogo" className="mt-4 inline-flex min-h-10 items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-accent">Ver oferta publicada <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></a></div>
            ) : null}
            <div className="grid gap-4 xl:grid-cols-2">
              {learning.map((item) => (
                <article key={item.enrollmentId} className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-xl"><p className="text-[9px] font-semibold uppercase tracking-[.2em] text-accent">{progressLabel(item)}</p><h3 className="mt-2 font-outfit text-xl font-semibold text-white/90">{item.course.title}</h3><p className="mt-2 text-xs leading-6 text-white/40">{item.course.summary}</p></div>
                    <span className="font-mono text-sm font-semibold text-accent">{item.progressPercent}%</span>
                  </div>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[.07]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.progressPercent} aria-label={`Progreso de ${item.course.title}`}><div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${item.progressPercent}%` }} /></div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-white/35"><span>{item.completedLessons}/{item.totalLessons} lecciones completadas</span>{item.course.estimatedMinutes ? <span>{item.course.estimatedMinutes} min estimados</span> : null}<span>Actividad: {formatDate(item.lastActivityAt)}</span></div>
                  <a href={item.continuePath} className="mt-5 inline-flex min-h-10 items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-accent">{item.progressPercent > 0 ? 'Continuar curso' : 'Comenzar curso'} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></a>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4"><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-white/35">Explorar por eje</p><h2 className="mt-2 font-outfit text-2xl font-semibold">JP Valderrama Education</h2></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {axes.map(({ title, text, href, icon: Icon }) => (
                <a key={title} href={href} className="group rounded-2xl border border-white/10 bg-white/[.025] p-5 transition hover:border-accent/30 hover:bg-accent/[.04]"><div className="flex items-center justify-between"><Icon className="h-4 w-4 text-accent" aria-hidden="true" /><ArrowRight className="h-4 w-4 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" /></div><h3 className="mt-5 font-outfit text-lg font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-white/40">{text}</p></a>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4">
              <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-white/35">Derechos de acceso</p>
              <h2 className="mt-2 font-outfit text-2xl font-semibold">Mi biblioteca</h2>
              <p className="mt-2 max-w-3xl text-xs leading-6 text-white/40">Una orden pendiente no es un acceso. Esta sección muestra únicamente entitlements emitidos por el sistema después de una activación válida, asignación o verificación transaccional.</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {(Object.entries(categoryMeta) as Array<[keyof typeof categoryMeta, (typeof categoryMeta)[keyof typeof categoryMeta]]>).map(([type, meta]) => {
                const Icon = meta.icon;
                const items = grouped[type];
                return (
                  <article key={type} className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
                    <header className="flex items-center justify-between gap-4 border-b border-white/[.07] pb-4">
                      <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/25 text-accent"><Icon className="h-4 w-4" aria-hidden="true" /></span><h3 className="font-outfit text-lg font-semibold">{meta.label}</h3></div>
                      <span className="font-mono text-[10px] text-white/30">{items.length}</span>
                    </header>
                    <div className="mt-4 space-y-3">
                      {state === 'loading' ? <p className="text-sm text-white/35">Sincronizando…</p> : null}
                      {state === 'ready' && items.length === 0 ? <p className="text-sm leading-6 text-white/35">Todavía no tienes elementos de esta categoría.</p> : null}
                      {items.map(({ entitlement, offering }) => (
                        <div key={entitlement.id} className="rounded-xl border border-white/[.07] bg-black/20 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="max-w-xl"><p className="text-sm font-semibold text-white/85">{offering.title}</p><p className="mt-2 text-xs leading-5 text-white/40">{offering.summary}</p></div>
                            <span className={entitlement.status === 'active' ? 'rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-emerald-300' : 'rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-white/35'}>{entitlement.status}</span>
                          </div>
                          {entitlement.status === 'active' && offering.access_path ? <a href={offering.access_path} className="mt-4 inline-flex min-h-10 items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-accent">Abrir acceso <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></a> : null}
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mt-8 grid gap-4 xl:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
              <header className="flex items-center gap-3 border-b border-white/[.07] pb-4"><ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" /><div><p className="text-[9px] font-semibold uppercase tracking-[.2em] text-white/30">Compras</p><h2 className="mt-1 font-outfit text-xl font-semibold">Mis órdenes educativas</h2></div></header>
              <p className="mt-4 text-xs leading-6 text-white/40">Aquí ves intención transaccional y verificación. Solo las órdenes pagadas y verificadas pueden originar el acceso correspondiente.</p>
              <div className="mt-4 space-y-3">
                {state === 'ready' && (library.orders ?? []).length === 0 ? <p className="text-sm leading-6 text-white/35">Aún no hay órdenes educativas asociadas a tu cuenta.</p> : null}
                {(library.orders ?? []).map((order) => <div key={order.id} className="rounded-xl border border-white/[.07] bg-black/20 p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] text-white/45">{order.id.slice(0, 8).toUpperCase()}</p><p className="mt-2 text-sm font-semibold text-white/85">{formatAmount(order.total_amount, order.currency)}</p></div><span className={order.status === 'paid' ? 'text-right text-[9px] font-bold uppercase tracking-[.12em] text-emerald-300' : 'text-right text-[9px] font-bold uppercase tracking-[.12em] text-amber-200/80'}>{orderStatus[order.status] ?? order.status}</span></div><p className="mt-3 text-[10px] text-white/30">{formatDate(order.created_at)}{order.verified_at ? ` · verificada ${formatDate(order.verified_at)}` : ''}</p></div>)}
                <a href="/jpvalderrama/campus#catalogo" className="inline-flex min-h-10 items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-accent">Explorar productos <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></a>
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
              <header className="flex items-center gap-3 border-b border-white/[.07] pb-4"><Building2 className="h-5 w-5 text-accent" aria-hidden="true" /><div><p className="text-[9px] font-semibold uppercase tracking-[.2em] text-white/30">Servicios a medida</p><h2 className="mt-1 font-outfit text-xl font-semibold">Mis solicitudes</h2></div></header>
              <p className="mt-4 text-xs leading-6 text-white/40">Tutorías, charlas privadas, proyectos y asesorías institucionales se siguen como solicitudes porque su alcance debe definirse antes de contratar.</p>
              <div className="mt-4 space-y-3">
                {state === 'ready' && (library.advisoryRequests ?? []).length === 0 ? <p className="text-sm leading-6 text-white/35">No tienes solicitudes educativas registradas.</p> : null}
                {(library.advisoryRequests ?? []).map((request) => <div key={request.id} className="rounded-xl border border-white/[.07] bg-black/20 p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-white/85">{request.institution_name}</p><p className="mt-1 text-xs text-white/40">{request.service_area}</p></div><span className="text-[9px] font-bold uppercase tracking-[.12em] text-accent">{advisoryStatus[request.status] ?? request.status}</span></div><p className="mt-3 flex items-center gap-2 text-[10px] text-white/30"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {formatDate(request.created_at)}</p></div>)}
                <a href="/jpvalderrama/campus#instituciones" className="inline-flex min-h-10 items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-accent">Nueva solicitud <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></a>
              </div>
            </article>
          </section>
        </Container>
      </main>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center justify-between text-accent">{icon}<span className="font-mono text-lg font-semibold text-white/90">{value}</span></div><p className="mt-3 text-[9px] font-semibold uppercase tracking-[.16em] text-white/35">{label}</p></div>;
}
