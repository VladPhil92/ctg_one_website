'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  FileText,
  GraduationCap,
  LibraryBig,
  Presentation,
  RefreshCw,
  School,
  ShieldCheck,
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

type LibraryResponse = {
  ok?: boolean;
  entitlements?: Entitlement[];
  orders?: EducationOrder[];
  advisoryRequests?: AdvisoryRequest[];
};

const categoryMeta = {
  course: { label: 'Mis cursos', icon: GraduationCap },
  conference: { label: 'Mis conferencias', icon: Presentation },
  book: { label: 'Mis libros', icon: BookOpen },
  class: { label: 'Mis clases', icon: School },
  resource: { label: 'Recursos', icon: FileText },
} as const;

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
  pending: 'Pendiente',
  paid: 'Pagada',
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

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />
      <main className="pb-20 pt-24">
        <Container>
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.055] to-white/[.015] p-6 sm:p-8">
            <a href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-accent"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard</a>
            <div className="mt-5 grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-white/35">CTG One / Education Library</p>
                <h1 className="mt-3 font-outfit text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Biblioteca educativa de {firstName}</h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">Aquí aparecen los cursos, conferencias, libros, clases y recursos que tu cuenta tiene habilitados, junto con tus solicitudes institucionales y órdenes educativas.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="/jpvalderrama/campus" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 text-[10px] font-bold uppercase tracking-[.13em] text-accent">Explorar Campus <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
                <button type="button" onClick={() => void loadLibrary()} disabled={state === 'loading'} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-[10px] font-bold uppercase tracking-[.13em] text-white/60 disabled:opacity-50"><RefreshCw className={state === 'loading' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden="true" /> Actualizar</button>
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric icon={<LibraryBig className="h-4 w-4" />} label="Accesos activos" value={state === 'loading' ? '—' : String(totalActive)} />
            <Metric icon={<ShieldCheck className="h-4 w-4" />} label="Órdenes verificadas" value={state === 'loading' ? '—' : String((library.orders ?? []).filter((order) => order.status === 'paid').length)} />
            <Metric icon={<Building2 className="h-4 w-4" />} label="Asesorías" value={state === 'loading' ? '—' : String((library.advisoryRequests ?? []).length)} />
          </section>

          {state === 'error' ? (
            <section className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/5 p-6">
              <p className="text-sm text-red-200">No fue posible sincronizar tu biblioteca educativa. El acceso no se modifica por este error; intenta actualizar nuevamente.</p>
            </section>
          ) : null}

          <section className="mt-8">
            <div className="mb-4">
              <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-white/35">Tus derechos de acceso</p>
              <h2 className="mt-2 font-outfit text-2xl font-semibold">Contenido y servicios asignados</h2>
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
                          {entitlement.status === 'active' && offering.access_path ? <a href={offering.access_path} className="mt-4 inline-flex min-h-10 items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-accent">Abrir recurso <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></a> : null}
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
              <header className="flex items-center gap-3 border-b border-white/[.07] pb-4"><Building2 className="h-5 w-5 text-accent" aria-hidden="true" /><div><p className="text-[9px] font-semibold uppercase tracking-[.2em] text-white/30">Instituciones</p><h2 className="mt-1 font-outfit text-xl font-semibold">Asesorías educativas</h2></div></header>
              <div className="mt-4 space-y-3">
                {state === 'ready' && (library.advisoryRequests ?? []).length === 0 ? <p className="text-sm leading-6 text-white/35">No tienes solicitudes institucionales registradas.</p> : null}
                {(library.advisoryRequests ?? []).map((request) => <div key={request.id} className="rounded-xl border border-white/[.07] bg-black/20 p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-white/85">{request.institution_name}</p><p className="mt-1 text-xs text-white/40">{request.service_area}</p></div><span className="text-[9px] font-bold uppercase tracking-[.12em] text-accent">{advisoryStatus[request.status] ?? request.status}</span></div><p className="mt-3 flex items-center gap-2 text-[10px] text-white/30"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> {new Date(request.created_at).toLocaleDateString('es-CO')}</p></div>)}
                <a href="/jpvalderrama/campus#instituciones" className="inline-flex min-h-10 items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-accent">Nueva solicitud <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></a>
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
              <header className="flex items-center gap-3 border-b border-white/[.07] pb-4"><ShieldCheck className="h-5 w-5 text-accent" aria-hidden="true" /><div><p className="text-[9px] font-semibold uppercase tracking-[.2em] text-white/30">Commerce ledger</p><h2 className="mt-1 font-outfit text-xl font-semibold">Órdenes educativas</h2></div></header>
              <div className="mt-4 space-y-3">
                {state === 'ready' && (library.orders ?? []).length === 0 ? <p className="text-sm leading-6 text-white/35">Aún no hay órdenes educativas asociadas a tu cuenta.</p> : null}
                {(library.orders ?? []).map((order) => <div key={order.id} className="rounded-xl border border-white/[.07] bg-black/20 p-4"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] text-white/45">{order.id.slice(0, 8).toUpperCase()}</p><p className="mt-2 text-sm font-semibold text-white/85">{formatAmount(order.total_amount, order.currency)}</p></div><span className={order.status === 'paid' ? 'text-[9px] font-bold uppercase tracking-[.12em] text-emerald-300' : 'text-[9px] font-bold uppercase tracking-[.12em] text-white/40'}>{orderStatus[order.status] ?? order.status}</span></div><p className="mt-3 text-[10px] text-white/30">{new Date(order.created_at).toLocaleDateString('es-CO')}{order.verified_at ? ' · pago verificado' : ''}</p></div>)}
              </div>
            </article>
          </section>
        </Container>
      </main>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center justify-between text-accent">{icon}<span className="font-mono text-[9px] text-white/20">EDU</span></div><p className="mt-4 text-[9px] font-semibold uppercase tracking-[.16em] text-white/30">{label}</p><p className="mt-2 font-outfit text-2xl font-semibold">{value}</p></div>;
}
