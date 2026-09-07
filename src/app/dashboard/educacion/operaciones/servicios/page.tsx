'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarPlus, FileSignature, RefreshCw, ShieldCheck } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

type ServiceRequest = { id: string; user_id: string; request_kind: string; institution_name: string; contact_name: string; contact_email: string; contact_phone: string | null; service_area: string; message: string; status: string; created_at: string; updated_at: string };
type Quote = { id: string; request_id: string; user_id: string; version: number; title: string; scope_summary: string; status: string; currency: string; total_amount: number; valid_until: string | null };
type Session = { id: string; request_id: string | null; quote_id: string | null; title: string; status: string; modality: string; starts_at: string; ends_at: string };
type OperationsResponse = { ok?: boolean; requests?: ServiceRequest[]; quotes?: Quote[]; sessions?: Session[]; error?: string };

function amount(value: number, currency: string) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value); }
function dt(value: string) { return new Date(value).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }); }

export default function EducationServiceOperationsPage() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<OperationsResponse>({});
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'forbidden'>('loading');
  const [selectedId, setSelectedId] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/iniciar-sesion?next=/dashboard/educacion/operaciones/servicios');
  }, [isAuthenticated, isLoading, router]);

  const load = useCallback(async () => {
    if (!isAuthenticated || profile?.role !== 'admin') return;
    setState('loading');
    try {
      const response = await fetch('/api/education/operations/services', { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as OperationsResponse;
      if (response.status === 403) return setState('forbidden');
      if (!response.ok || !payload.ok) return setState('error');
      setData(payload);
      if (!selectedId && payload.requests?.[0]?.id) setSelectedId(payload.requests[0].id);
      setState('ready');
    } catch { setState('error'); }
  }, [isAuthenticated, profile?.role, selectedId]);

  useEffect(() => { if (profile?.role === 'admin') void load(); }, [load, profile?.role]);

  async function send(payload: Record<string, unknown>) {
    if (submitting) return false;
    setSubmitting(true); setNotice(null);
    try {
      const response = await fetch('/api/education/operations/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) { setNotice(`Operación rechazada: ${result.error ?? 'ERROR'}`); return false; }
      await load(); return true;
    } catch { setNotice('No fue posible completar la operación.'); return false; }
    finally { setSubmitting(false); }
  }

  async function createQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
    const ok = await send({ action: 'create_quote', requestId: selectedId, title: String(values.get('title') ?? ''), scopeSummary: String(values.get('scopeSummary') ?? ''), totalAmount: Number(values.get('totalAmount') ?? 0), currency: 'COP', validUntil: values.get('validUntil') ? new Date(String(values.get('validUntil'))).toISOString() : null });
    if (ok) { form.reset(); setNotice('Cotización emitida. El usuario puede aceptarla o rechazarla desde Mis servicios.'); }
  }

  async function schedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form);
    const quoteId = String(values.get('quoteId') ?? '');
    const ok = await send({ action: 'schedule_session', requestId: selectedId, quoteId: quoteId || null, title: String(values.get('title') ?? ''), sessionType: String(values.get('sessionType') ?? 'tutoring'), modality: String(values.get('modality') ?? 'virtual'), startsAt: new Date(String(values.get('startsAt'))).toISOString(), endsAt: new Date(String(values.get('endsAt'))).toISOString(), timezone: 'America/Bogota', meetingUrl: String(values.get('meetingUrl') ?? ''), locationLabel: String(values.get('locationLabel') ?? ''), participantNote: String(values.get('participantNote') ?? '') });
    if (ok) { form.reset(); setNotice('Sesión programada y visible para el usuario.'); }
  }

  if (isLoading || (!profile && isAuthenticated)) return <div className="min-h-screen bg-[#030303]" />;
  if (!isAuthenticated) return <div className="min-h-screen bg-[#030303]" />;
  if (profile?.role !== 'admin' || state === 'forbidden') return <Restricted />;

  const requests = data.requests ?? [];
  const selected = requests.find((item) => item.id === selectedId) ?? null;
  const quotes = (data.quotes ?? []).filter((item) => item.request_id === selectedId);
  const sessions = (data.sessions ?? []).filter((item) => item.request_id === selectedId);
  const acceptedQuotes = quotes.filter((item) => item.status === 'accepted');

  return <div className="min-h-screen bg-[#050505] text-white"><Navbar /><main className="pb-20 pt-24"><Container>
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.055] to-white/[.015] p-6 sm:p-8">
      <a href="/dashboard/educacion/operaciones" className="inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-accent"><ArrowLeft className="h-4 w-4" /> Conciliación</a>
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[9px] font-semibold uppercase tracking-[.24em] text-white/35">Education Operations</p><h1 className="mt-3 font-outfit text-4xl font-semibold tracking-[-.045em]">Servicios, propuestas y agenda</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">Opera servicios personalizados sin mezclarlos con órdenes de precio fijo. Emitir una propuesta no registra un pago; programar una sesión no concede un entitlement.</p></div><button onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-[10px] font-bold uppercase tracking-[.13em] text-white/60"><RefreshCw className={state === 'loading' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Actualizar</button></div>
    </section>
    {notice ? <p role="status" className="mt-5 rounded-2xl border border-accent/20 bg-accent/10 p-4 text-sm text-white/75">{notice}</p> : null}
    {state === 'error' ? <p role="alert" className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/5 p-4 text-sm text-red-200">No se pudo cargar la operación educativa.</p> : null}

    <section className="mt-8 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <aside className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><p className="text-[9px] font-bold uppercase tracking-[.2em] text-white/35">Solicitudes</p><div className="mt-4 space-y-2">{requests.length === 0 ? <p className="text-sm text-white/35">No hay solicitudes.</p> : null}{requests.map((item) => <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={selectedId === item.id ? 'w-full rounded-xl border border-accent/30 bg-accent/10 p-4 text-left' : 'w-full rounded-xl border border-white/[.07] bg-black/20 p-4 text-left'}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white/85">{item.service_area}</p><p className="mt-1 text-[10px] text-white/35">{item.request_kind} · {item.contact_name}</p></div><span className="text-[9px] uppercase tracking-[.12em] text-accent">{item.status}</span></div></button>)}</div></aside>

      <div className="space-y-5">{selected ? <>
        <article className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><p className="text-[9px] font-bold uppercase tracking-[.2em] text-accent">Solicitud seleccionada</p><h2 className="mt-2 font-outfit text-2xl font-semibold">{selected.service_area}</h2><p className="mt-2 text-xs text-white/40">{selected.institution_name} · {selected.contact_email}{selected.contact_phone ? ` · ${selected.contact_phone}` : ''}</p><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/50">{selected.message}</p></article>

        <form onSubmit={createQuote} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center gap-3"><FileSignature className="h-5 w-5 text-accent" /><h2 className="font-outfit text-xl font-semibold">Emitir cotización</h2></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Input name="title" label="Título" required /><Input name="totalAmount" label="Valor COP" type="number" min="0" required /><label className="text-xs text-white/45 sm:col-span-2">Alcance<textarea name="scopeSummary" required minLength={20} maxLength={6000} rows={5} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-accent/50" /></label><Input name="validUntil" label="Vigente hasta" type="datetime-local" /></div><button disabled={submitting} className="mt-5 min-h-11 rounded-xl bg-accent px-4 text-[10px] font-bold uppercase tracking-[.13em] text-black disabled:opacity-50">Emitir propuesta</button></form>

        <form onSubmit={schedule} className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center gap-3"><CalendarPlus className="h-5 w-5 text-accent" /><h2 className="font-outfit text-xl font-semibold">Programar sesión</h2></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Input name="title" label="Título de la sesión" required /><label className="text-xs text-white/45">Tipo<select name="sessionType" className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"><option value="diagnostic">Diagnóstico</option><option value="tutoring">Tutoría</option><option value="class">Clase</option><option value="advisory">Asesoría</option><option value="project">Proyecto</option><option value="other">Otro</option></select></label><label className="text-xs text-white/45">Modalidad<select name="modality" className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"><option value="virtual">Virtual</option><option value="in_person">Presencial</option><option value="hybrid">Híbrida</option></select></label><label className="text-xs text-white/45">Cotización aceptada (opcional)<select name="quoteId" className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white"><option value="">Sesión diagnóstica / sin cotización</option>{acceptedQuotes.map((quote) => <option key={quote.id} value={quote.id}>v{quote.version} · {amount(quote.total_amount, quote.currency)}</option>)}</select></label><Input name="startsAt" label="Inicio" type="datetime-local" required /><Input name="endsAt" label="Fin" type="datetime-local" required /><Input name="meetingUrl" label="Enlace virtual" type="url" /><Input name="locationLabel" label="Lugar" /><label className="text-xs text-white/45 sm:col-span-2">Nota para participante<textarea name="participantNote" maxLength={2000} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-accent/50" /></label></div><button disabled={submitting} className="mt-5 min-h-11 rounded-xl bg-accent px-4 text-[10px] font-bold uppercase tracking-[.13em] text-black disabled:opacity-50">Programar sesión</button></form>

        <div className="grid gap-4 lg:grid-cols-2"><article className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><h3 className="font-outfit text-lg font-semibold">Propuestas</h3><div className="mt-4 space-y-3">{quotes.length === 0 ? <p className="text-xs text-white/35">Sin propuestas.</p> : quotes.map((quote) => <div key={quote.id} className="rounded-xl border border-white/[.07] bg-black/20 p-4"><div className="flex justify-between gap-3"><p className="text-sm font-semibold">v{quote.version} · {amount(quote.total_amount, quote.currency)}</p><span className="text-[9px] uppercase text-accent">{quote.status}</span></div><p className="mt-2 text-xs text-white/40">{quote.title}</p></div>)}</div></article><article className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><h3 className="font-outfit text-lg font-semibold">Agenda</h3><div className="mt-4 space-y-3">{sessions.length === 0 ? <p className="text-xs text-white/35">Sin sesiones.</p> : sessions.map((session) => <div key={session.id} className="rounded-xl border border-white/[.07] bg-black/20 p-4"><div className="flex justify-between gap-3"><p className="text-sm font-semibold">{session.title}</p><span className="text-[9px] uppercase text-accent">{session.status}</span></div><p className="mt-2 text-xs text-white/40">{dt(session.starts_at)} · {session.modality}</p></div>)}</div></article></div>
      </> : <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6 text-sm text-white/35">Selecciona una solicitud.</div>}</div>
    </section>
  </Container></main></div>;
}

function Input({ label, name, type = 'text', required = false, min }: { label: string; name: string; type?: string; required?: boolean; min?: string }) { return <label className="text-xs text-white/45">{label}<input name={name} type={type} required={required} min={min} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-accent/50" /></label>; }
function Restricted() { return <div className="min-h-screen bg-[#050505] text-white"><Navbar /><main className="pb-20 pt-24"><Container><section className="rounded-3xl border border-white/10 bg-white/[.025] p-8"><ShieldCheck className="h-6 w-6 text-accent" /><h1 className="mt-5 font-outfit text-3xl font-semibold">Operaciones restringidas</h1><p className="mt-3 text-sm text-white/50">Solo el rol administrativo canónico puede emitir propuestas y programar sesiones.</p></section></Container></main></div>; }
