'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock3, FileText, MapPin, RefreshCw, Video, XCircle } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

type ServiceRequest = {
  id: string;
  request_kind: string;
  institution_name: string;
  service_area: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type Quote = {
  id: string;
  request_id: string;
  version: number;
  title: string;
  scope_summary: string;
  status: string;
  currency: string;
  total_amount: number;
  valid_until: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
};

type Session = {
  id: string;
  request_id: string | null;
  quote_id: string | null;
  session_type: string;
  title: string;
  status: string;
  modality: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  meeting_url: string | null;
  location_label: string | null;
  participant_note: string | null;
};

type ServicesResponse = { ok?: boolean; requests?: ServiceRequest[]; quotes?: Quote[]; sessions?: Session[] };

const requestStatus: Record<string, string> = {
  submitted: 'Recibida', qualified: 'En diagnóstico', proposal: 'Propuesta enviada',
  scheduled: 'Programada', won: 'Alcance aceptado', lost: 'Cerrada', closed: 'Finalizada',
};

const quoteStatus: Record<string, string> = {
  sent: 'Pendiente de decisión', accepted: 'Aceptada', declined: 'Rechazada',
  expired: 'Vencida', cancelled: 'Cancelada', draft: 'Borrador',
};

function money(amount: number, currency: string) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function dateTime(value: string) {
  return new Date(value).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function EducationServicesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ServicesResponse>({});
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [acting, setActing] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/iniciar-sesion?next=/dashboard/educacion/servicios');
  }, [isAuthenticated, isLoading, router]);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setState('loading');
    try {
      const response = await fetch('/api/education/services', { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as ServicesResponse;
      if (!response.ok || !payload.ok) return setState('error');
      setData(payload);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [isAuthenticated]);

  useEffect(() => { void load(); }, [load]);

  async function decide(quoteId: string, action: 'accept' | 'decline') {
    if (acting) return;
    setActing(quoteId);
    setNotice(null);
    try {
      const response = await fetch(`/api/education/services/quotes/${encodeURIComponent(quoteId)}/decision`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setNotice(`No se pudo registrar la decisión. ${payload.error ?? ''}`.trim());
        return;
      }
      setNotice(action === 'accept'
        ? 'Alcance aceptado. Esto todavía no constituye un pago ni concede acceso; el siguiente paso es coordinar contratación y agenda.'
        : 'Propuesta rechazada. La decisión quedó registrada.');
      await load();
    } catch {
      setNotice('No fue posible registrar la decisión.');
    } finally {
      setActing(null);
    }
  }

  const requestsById = useMemo(() => new Map((data.requests ?? []).map((item) => [item.id, item])), [data.requests]);
  const upcoming = (data.sessions ?? []).filter((item) => item.status === 'scheduled' && Date.parse(item.ends_at) >= Date.now());

  if (isLoading || !isAuthenticated) return <div className="min-h-screen bg-[#030303]" />;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />
      <main className="pb-20 pt-24"><Container>
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.055] to-white/[.015] p-6 sm:p-8">
          <a href="/dashboard/educacion" className="inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-accent"><ArrowLeft className="h-4 w-4" /> Mi aprendizaje</a>
          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-white/35">Education OS / Commerce & Academic Operations</p><h1 className="mt-3 font-outfit text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Mis servicios y agenda</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">Sigue solicitudes personalizadas, revisa cotizaciones y consulta sesiones programadas. Aceptar una cotización confirma el alcance; no registra un pago.</p></div>
            <button type="button" onClick={() => void load()} disabled={state === 'loading'} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-[10px] font-bold uppercase tracking-[.13em] text-white/60 disabled:opacity-50"><RefreshCw className={state === 'loading' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Actualizar</button>
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric label="Solicitudes" value={String((data.requests ?? []).length)} />
          <Metric label="Propuestas" value={String((data.quotes ?? []).length)} />
          <Metric label="Próximas sesiones" value={String(upcoming.length)} />
        </section>

        {notice ? <p role="status" className="mt-5 rounded-2xl border border-accent/20 bg-accent/10 p-4 text-sm leading-6 text-white/75">{notice}</p> : null}
        {state === 'error' ? <p role="alert" className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/5 p-4 text-sm text-red-200">No fue posible sincronizar tus operaciones educativas.</p> : null}

        <section className="mt-8">
          <div className="mb-4"><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-white/35">Agenda</p><h2 className="mt-2 font-outfit text-2xl font-semibold">Próximas sesiones</h2></div>
          <div className="grid gap-4 xl:grid-cols-2">
            {state === 'ready' && upcoming.length === 0 ? <Empty text="Todavía no tienes sesiones programadas." /> : null}
            {upcoming.map((session) => <article key={session.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-accent">{session.session_type}</p><h3 className="mt-2 font-outfit text-xl font-semibold">{session.title}</h3></div><span className="text-[9px] font-bold uppercase tracking-[.12em] text-emerald-300">Programada</span></div><p className="mt-4 flex items-center gap-2 text-sm text-white/65"><CalendarDays className="h-4 w-4 text-accent" /> {dateTime(session.starts_at)}</p><p className="mt-2 flex items-center gap-2 text-xs text-white/40"><Clock3 className="h-3.5 w-3.5" /> Hasta {dateTime(session.ends_at)} · {session.timezone}</p>{session.modality === 'virtual' && session.meeting_url ? <a href={session.meeting_url} rel="noreferrer" target="_blank" className="mt-5 inline-flex min-h-10 items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-accent"><Video className="h-4 w-4" /> Abrir enlace de sesión</a> : null}{session.location_label ? <p className="mt-4 flex items-start gap-2 text-xs leading-6 text-white/45"><MapPin className="mt-1 h-3.5 w-3.5 shrink-0" /> {session.location_label}</p> : null}{session.participant_note ? <p className="mt-3 text-xs leading-6 text-white/40">{session.participant_note}</p> : null}</article>)}
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4"><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-white/35">Comercial</p><h2 className="mt-2 font-outfit text-2xl font-semibold">Cotizaciones</h2></div>
          <div className="space-y-4">
            {state === 'ready' && (data.quotes ?? []).length === 0 ? <Empty text="Aún no tienes cotizaciones emitidas." /> : null}
            {(data.quotes ?? []).map((quote) => {
              const source = requestsById.get(quote.request_id);
              const actionable = quote.status === 'sent' && (!quote.valid_until || Date.parse(quote.valid_until) > Date.now());
              return <article key={quote.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6"><div className="grid gap-5 lg:grid-cols-[1fr_auto]"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-accent">Versión {quote.version} · {source?.service_area ?? 'Servicio educativo'}</p><h3 className="mt-2 font-outfit text-xl font-semibold">{quote.title}</h3><p className="mt-3 max-w-3xl text-sm leading-7 text-white/50">{quote.scope_summary}</p><p className="mt-4 text-[10px] text-white/35">Estado: {quoteStatus[quote.status] ?? quote.status}{quote.valid_until ? ` · Vigente hasta ${dateTime(quote.valid_until)}` : ''}</p></div><div className="min-w-48 lg:text-right"><p className="font-outfit text-3xl font-semibold">{money(quote.total_amount, quote.currency)}</p><p className="mt-2 text-[10px] leading-5 text-white/35">Importe propuesto, no pagado.</p></div></div>{actionable ? <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[.07] pt-5"><button type="button" onClick={() => void decide(quote.id, 'accept')} disabled={acting !== null} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-[10px] font-bold uppercase tracking-[.13em] text-black disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Aceptar alcance</button><button type="button" onClick={() => void decide(quote.id, 'decline')} disabled={acting !== null} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-[10px] font-bold uppercase tracking-[.13em] text-white/55 disabled:opacity-50"><XCircle className="h-4 w-4" /> Rechazar</button></div> : null}</article>;
            })}
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4"><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-white/35">Intake</p><h2 className="mt-2 font-outfit text-2xl font-semibold">Solicitudes</h2></div>
          <div className="grid gap-4 xl:grid-cols-2">
            {state === 'ready' && (data.requests ?? []).length === 0 ? <Empty text="No tienes solicitudes registradas." /> : null}
            {(data.requests ?? []).map((item) => <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-bold uppercase tracking-[.16em] text-accent">{item.request_kind}</p><h3 className="mt-2 text-sm font-semibold text-white/85">{item.service_area}</h3><p className="mt-1 text-xs text-white/35">{item.institution_name}</p></div><span className="text-right text-[9px] font-bold uppercase tracking-[.12em] text-accent">{requestStatus[item.status] ?? item.status}</span></div><p className="mt-4 line-clamp-3 text-xs leading-6 text-white/40"><FileText className="mr-2 inline h-3.5 w-3.5" />{item.message}</p></article>)}
          </div>
        </section>
      </Container></main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><p className="font-mono text-xl font-semibold text-white/90">{value}</p><p className="mt-2 text-[9px] font-semibold uppercase tracking-[.16em] text-white/35">{label}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6 text-sm leading-7 text-white/40">{text}</div>;
}
