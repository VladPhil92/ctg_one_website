'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Ban,
  History,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Container } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

type Offering = {
  id: string;
  slug: string;
  title: string;
  offering_type: string;
};

type LifecycleOrder = {
  id: string;
  user_id: string;
  status: 'initiated' | 'pending' | 'paid';
  currency: string;
  total_amount: number;
  payment_provider: string | null;
  provider_reference: string | null;
  verified_at: string | null;
  created_at: string;
  items: Array<{
    offeringId: string;
    quantity: number;
    unitAmount: number;
    offering: Offering | null;
  }>;
};

type LifecycleEvent = {
  id: string;
  order_id: string;
  event_type: 'cancelled' | 'refunded';
  previous_status: string;
  new_status: string;
  operator_user_id: string;
  reason: string;
  provider_reference: string | null;
  affected_entitlements: number;
  created_at: string;
};

type LifecycleResponse = {
  ok?: boolean;
  error?: string;
  queue?: LifecycleOrder[];
  recentEvents?: LifecycleEvent[];
};

type Draft = { reason: string; reference: string };

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function shortId(value: string) {
  return value.slice(0, 8).toUpperCase();
}

export default function EducationAccessLifecyclePage() {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<LifecycleResponse>({});
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error' | 'forbidden'>('idle');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/iniciar-sesion?next=/dashboard/educacion/operaciones/ciclo');
    }
  }, [isAuthenticated, isLoading, router]);

  const load = useCallback(async () => {
    if (!isAuthenticated || profile?.role !== 'admin') return;
    setState('loading');
    try {
      const response = await fetch('/api/education/operations/lifecycle', { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as LifecycleResponse;
      if (response.status === 403) {
        setState('forbidden');
        return;
      }
      if (!response.ok || !payload.ok) {
        setState('error');
        return;
      }
      setData(payload);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [isAuthenticated, profile?.role]);

  useEffect(() => {
    if (profile?.role === 'admin') void load();
  }, [load, profile?.role]);

  const cancellable = useMemo(
    () => (data.queue ?? []).filter((order) => order.status === 'initiated' || order.status === 'pending'),
    [data.queue],
  );
  const refundable = useMemo(
    () => (data.queue ?? []).filter((order) => order.status === 'paid'),
    [data.queue],
  );
  const history = data.recentEvents ?? [];

  function updateDraft(orderId: string, field: keyof Draft, value: string) {
    setDrafts((current) => ({
      ...current,
      [orderId]: {
        reason: current[orderId]?.reason ?? '',
        reference: current[orderId]?.reference ?? '',
        [field]: value,
      },
    }));
  }

  async function transition(order: LifecycleOrder, action: 'cancel' | 'refund') {
    const draft = drafts[order.id] ?? { reason: '', reference: '' };
    const reason = draft.reason.trim();
    const reference = draft.reference.trim();
    if (reason.length < 3 || busyId || (action === 'refund' && !reference)) return;

    setBusyId(order.id);
    setNotice(null);
    try {
      const response = await fetch('/api/education/operations/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          action,
          reason,
          providerReference: action === 'refund' ? reference : undefined,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        replayed?: boolean;
        affectedEntitlements?: number;
      };
      if (!response.ok || !payload.ok) {
        setNotice(`No se pudo procesar la orden ${shortId(order.id)}. ${payload.error ?? 'Revisa la operación e intenta de nuevo.'}`);
        return;
      }

      if (action === 'refund') {
        setNotice(payload.replayed
          ? `El reembolso de ${shortId(order.id)} ya estaba registrado con esa referencia.`
          : `Orden ${shortId(order.id)} reembolsada. Accesos revocados por esta orden: ${payload.affectedEntitlements ?? 0}.`);
      } else {
        setNotice(payload.replayed
          ? `La orden ${shortId(order.id)} ya estaba cancelada.`
          : `Orden ${shortId(order.id)} cancelada sin conceder acceso.`);
      }

      setDrafts((current) => {
        const next = { ...current };
        delete next[order.id];
        return next;
      });
      await load();
    } catch {
      setNotice('No fue posible completar la transición. No se alteró el acceso desde el navegador.');
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading || (!profile && isAuthenticated)) {
    return <div className="min-h-screen bg-[#030303]" />;
  }

  if (!isAuthenticated) return <div className="min-h-screen bg-[#030303]" />;

  if (profile?.role !== 'admin' || state === 'forbidden') {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <Navbar />
        <main className="pb-20 pt-24">
          <Container>
            <section className="rounded-3xl border border-white/10 bg-white/[.025] p-8">
              <ShieldCheck className="h-6 w-6 text-accent" aria-hidden="true" />
              <h1 className="mt-5 font-outfit text-3xl font-semibold">Operaciones restringidas</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50">Esta consola sólo está disponible para el rol administrativo canónico de CTG One.</p>
              <a href="/dashboard/educacion" className="mt-6 inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.14em] text-accent"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a Educación</a>
            </section>
          </Container>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Navbar />
      <main className="pb-24 pt-24">
        <Container>
          <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[.055] to-white/[.015] p-6 sm:p-8">
            <a href="/dashboard/educacion/operaciones" className="inline-flex min-h-11 items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-accent"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Conciliación</a>
            <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-white/35">CTG One / Education Access Lifecycle</p>
                <h1 className="mt-3 font-outfit text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Ciclo de vida de órdenes y accesos</h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/55">Cancela órdenes aún no pagadas o registra un reembolso verificado. Un reembolso sólo revoca accesos que continúan vinculados a esa misma orden; una concesión posterior permanece intacta.</p>
              </div>
              <button type="button" onClick={() => void load()} disabled={state === 'loading'} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-[10px] font-bold uppercase tracking-[.13em] text-white/60 disabled:opacity-50"><RefreshCw className={state === 'loading' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} aria-hidden="true" /> Actualizar</button>
            </div>
          </section>

          <section className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric icon={<Ban className="h-4 w-4" />} label="Cancelables" value={String(cancellable.length)} />
            <Metric icon={<RotateCcw className="h-4 w-4" />} label="Reembolsables" value={String(refundable.length)} />
            <Metric icon={<History className="h-4 w-4" />} label="Eventos recientes" value={String(history.length)} />
          </section>

          {notice ? <p role="status" className="mt-5 rounded-2xl border border-accent/20 bg-accent/10 p-4 text-sm leading-6 text-white/75">{notice}</p> : null}
          {state === 'error' ? <p role="alert" className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/5 p-4 text-sm text-red-200">No fue posible sincronizar el ciclo de vida educativo. No se modificó ninguna orden.</p> : null}

          <LifecycleSection
            title="Órdenes pendientes"
            eyebrow="Cancelar antes del pago"
            empty="No hay órdenes pendientes que puedan cancelarse."
            orders={cancellable}
            drafts={drafts}
            busyId={busyId}
            action="cancel"
            updateDraft={updateDraft}
            transition={transition}
          />

          <LifecycleSection
            title="Órdenes pagadas"
            eyebrow="Reembolso verificado"
            empty="No hay órdenes pagadas disponibles para reembolso."
            orders={refundable}
            drafts={drafts}
            busyId={busyId}
            action="refund"
            updateDraft={updateDraft}
            transition={transition}
          />

          <section className="mt-10">
            <div className="mb-4">
              <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-white/35">Ledger administrativo</p>
              <h2 className="mt-2 font-outfit text-2xl font-semibold">Eventos de ciclo de vida</h2>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              {history.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6 text-sm text-white/40">Todavía no existen cancelaciones o reembolsos registrados.</div> : null}
              {history.map((event) => (
                <article key={event.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] text-white/45">Orden {shortId(event.order_id)}</p>
                      <p className="mt-2 text-sm font-semibold text-white/80">{event.previous_status} → {event.new_status}</p>
                    </div>
                    <span className={event.event_type === 'refunded' ? 'text-[9px] font-bold uppercase tracking-[.12em] text-amber-200' : 'text-[9px] font-bold uppercase tracking-[.12em] text-white/45'}>{event.event_type}</span>
                  </div>
                  <p className="mt-4 text-xs leading-6 text-white/50">{event.reason}</p>
                  {event.provider_reference ? <p className="mt-2 break-all text-xs text-white/35">Ref. {event.provider_reference}</p> : null}
                  <p className="mt-3 text-[10px] text-white/30">{new Date(event.created_at).toLocaleString('es-CO')} · accesos afectados {event.affected_entitlements}</p>
                </article>
              ))}
            </div>
          </section>
        </Container>
      </main>
    </div>
  );
}

function LifecycleSection({
  title,
  eyebrow,
  empty,
  orders,
  drafts,
  busyId,
  action,
  updateDraft,
  transition,
}: {
  title: string;
  eyebrow: string;
  empty: string;
  orders: LifecycleOrder[];
  drafts: Record<string, Draft>;
  busyId: string | null;
  action: 'cancel' | 'refund';
  updateDraft: (orderId: string, field: keyof Draft, value: string) => void;
  transition: (order: LifecycleOrder, action: 'cancel' | 'refund') => Promise<void>;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4">
        <p className="text-[9px] font-semibold uppercase tracking-[.24em] text-white/35">{eyebrow}</p>
        <h2 className="mt-2 font-outfit text-2xl font-semibold">{title}</h2>
      </div>
      <div className="space-y-4">
        {orders.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/[.025] p-6 text-sm leading-7 text-white/40">{empty}</div> : null}
        {orders.map((order) => {
          const draft = drafts[order.id] ?? { reason: '', reference: '' };
          const canSubmit = draft.reason.trim().length >= 3 && (action === 'cancel' || draft.reference.trim().length > 0);
          return (
            <article key={order.id} className="rounded-2xl border border-white/10 bg-white/[.025] p-5 sm:p-6">
              <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[.12em] text-white/40">Orden {shortId(order.id)}</p>
                      <p className="mt-2 break-all font-mono text-[10px] text-white/25">{order.id}</p>
                    </div>
                    <span className={order.status === 'paid' ? 'rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-emerald-300' : 'rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-amber-200'}>{order.status}</span>
                  </div>
                  <p className="mt-5 font-outfit text-3xl font-semibold">{formatAmount(order.total_amount, order.currency)}</p>
                  <p className="mt-2 text-xs text-white/35">{new Date(order.created_at).toLocaleString('es-CO')} · {order.payment_provider ?? 'sin proveedor'}</p>
                  <div className="mt-5 space-y-2 border-t border-white/[.07] pt-4">
                    {order.items.map((item, index) => <div key={`${order.id}-${item.offeringId}-${index}`} className="flex items-start justify-between gap-4 text-sm"><span className="text-white/65">{item.offering?.title ?? item.offeringId}</span><span className="shrink-0 text-white/35">{item.quantity} × {formatAmount(item.unitAmount, order.currency)}</span></div>)}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[.07] bg-black/20 p-4 sm:p-5">
                  {action === 'refund' ? (
                    <>
                      <label className="block text-[9px] font-bold uppercase tracking-[.16em] text-white/40" htmlFor={`refund-reference-${order.id}`}>Referencia externa del reembolso</label>
                      <input id={`refund-reference-${order.id}`} value={draft.reference} onChange={(event) => updateDraft(order.id, 'reference', event.target.value)} maxLength={240} autoComplete="off" className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-accent/50" placeholder="Referencia de devolución verificada" />
                    </>
                  ) : null}
                  <label className={action === 'refund' ? 'mt-4 block text-[9px] font-bold uppercase tracking-[.16em] text-white/40' : 'block text-[9px] font-bold uppercase tracking-[.16em] text-white/40'} htmlFor={`reason-${order.id}`}>Motivo obligatorio</label>
                  <textarea id={`reason-${order.id}`} value={draft.reason} onChange={(event) => updateDraft(order.id, 'reason', event.target.value)} maxLength={2000} rows={3} className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-accent/50" placeholder={action === 'refund' ? 'Motivo y evidencia del reembolso' : 'Motivo de cancelación'} />
                  <p className="mt-3 text-[11px] leading-5 text-white/35">{action === 'refund' ? 'PostgreSQL exige una orden pagada y revoca sólo los accesos activos que todavía señalan a esta orden como fuente.' : 'Sólo las órdenes iniciadas o pendientes pueden cancelarse. Una orden pagada debe pasar por el flujo de reembolso.'}</p>
                  <button type="button" onClick={() => void transition(order, action)} disabled={!canSubmit || busyId !== null} className={action === 'refund' ? 'mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 text-[10px] font-bold uppercase tracking-[.13em] text-amber-100 disabled:cursor-not-allowed disabled:opacity-40' : 'mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.04] px-4 text-[10px] font-bold uppercase tracking-[.13em] text-white/75 disabled:cursor-not-allowed disabled:opacity-40'}>{action === 'refund' ? <RotateCcw className="h-4 w-4" aria-hidden="true" /> : <Ban className="h-4 w-4" aria-hidden="true" />} {busyId === order.id ? 'Procesando…' : action === 'refund' ? 'Registrar reembolso y revocar acceso' : 'Cancelar orden'}</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5"><div className="flex items-center justify-between text-accent">{icon}<span className="font-mono text-[9px] uppercase tracking-[.14em] text-white/30">{label}</span></div><p className="mt-4 font-outfit text-3xl font-semibold">{value}</p></div>;
}