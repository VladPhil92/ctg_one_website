'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Activity, ArrowLeft, RefreshCw, RotateCcw, ShieldAlert, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type Runtime = {
  id: number;
  processing_enabled: boolean;
  max_amount_cents: number;
  max_points_per_event: number;
  max_events_per_subject_per_day: number;
  updated_reason: string;
  updated_at: string;
};
type ShadowEvent = {
  id: string;
  source_domain: string;
  external_event_id: string;
  event_code: string;
  subject_user_id: string;
  amount_cents: number;
  event_kind: 'original' | 'reversal';
  reversal_of_event_id: string | null;
  payload_digest: string;
  occurred_at: string;
  created_at: string;
};
type Evaluation = {
  id: string;
  source_event_id: string;
  pilot_unit_id: string | null;
  rule_id: string | null;
  decision: 'eligible' | 'ineligible' | 'blocked' | 'no_unit' | 'no_rule' | 'reversal';
  direction: 'credit' | 'debit' | 'none';
  calculated_points: number;
  reason_code: string;
  created_at: string;
};
type ShadowPayload = {
  phase: 'shadow_earning_engine_v3';
  commercialStatus: 'inactive';
  ledgerEffects: false;
  ingestionMode: 'admin_replay_only';
  runtime: Runtime;
  events: ShadowEvent[];
  evaluations: Evaluation[];
};

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none transition focus:border-accent/45';
const labelClass = 'mb-1.5 block text-[9px] font-medium uppercase tracking-[.14em] text-text-dim';

function centsToCop(cents: number) {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Math.floor(cents / 100));
}

function nowForInput() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

async function postAction(body: Record<string, unknown>) {
  const response = await fetch('/api/admin/rewards/shadow-engine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'No fue posible ejecutar la operación.');
  return payload;
}

export function RewardsShadowEnginePanel() {
  const [data, setData] = useState<ShadowPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/rewards/shadow-engine', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'No fue posible cargar Shadow Engine.');
      setData(payload as ShadowPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar Shadow Engine.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const evaluationsByEvent = useMemo(() => new Map((data?.evaluations ?? []).map(item => [item.source_event_id, item])), [data?.evaluations]);
  const reversedOriginals = useMemo(() => new Set((data?.events ?? []).filter(item => item.event_kind === 'reversal' && item.reversal_of_event_id).map(item => item.reversal_of_event_id as string)), [data?.events]);
  const reversibleEvents = useMemo(() => (data?.events ?? []).filter(item => item.event_kind === 'original' && !reversedOriginals.has(item.id)), [data?.events, reversedOriginals]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(success);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operación fallida.');
    } finally {
      setBusy(false);
    }
  }

  function configure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(() => postAction({
      action: 'configure_runtime',
      processingEnabled: form.get('processingEnabled') === 'true',
      maxAmountCents: Math.round(Number(form.get('maxAmountCop') ?? 0) * 100),
      maxPointsPerEvent: Number(form.get('maxPointsPerEvent') ?? 0),
      maxEventsPerSubjectPerDay: Number(form.get('maxEventsPerSubjectPerDay') ?? 0),
      reason: form.get('reason'),
    }), 'Runtime sombra actualizado. Ningún saldo de usuario fue modificado.');
  }

  function ingest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const occurredAt = new Date(String(form.get('occurredAt'))).toISOString();
    const formElement = event.currentTarget;
    void run(async () => {
      await postAction({
        action: 'ingest_event',
        sourceDomain: form.get('sourceDomain'),
        externalEventId: form.get('externalEventId'),
        eventCode: form.get('eventCode'),
        subjectUserId: form.get('subjectUserId'),
        amountCents: Math.round(Number(form.get('amountCop') ?? 0) * 100),
        payloadDigest: form.get('payloadDigest'),
        occurredAt,
      });
      formElement.reset();
    }, 'Evento procesado en sombra. El resultado es hipotético y no acredita puntos.');
  }

  function reverse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const occurredAt = new Date(String(form.get('occurredAt'))).toISOString();
    const formElement = event.currentTarget;
    void run(async () => {
      await postAction({
        action: 'reverse_event',
        sourceEventId: form.get('sourceEventId'),
        externalEventId: form.get('externalEventId'),
        payloadDigest: form.get('payloadDigest'),
        occurredAt,
      });
      formElement.reset();
    }, 'Reverso sombra registrado. No se debitó ningún saldo real.');
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] border border-white/10 p-6 sm:p-8" style={{ background: 'linear-gradient(135deg,rgba(18,18,18,.98),rgba(7,7,7,.95))' }}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/admin/rewards" className="mb-4 inline-flex items-center gap-2 text-[9px] uppercase tracking-[.16em] text-text-dim hover:text-white"><ArrowLeft size={13} /> Rewards Lab</Link>
            <p className="mb-3 text-[9px] uppercase tracking-[.28em] text-accent">CTG Rewards · Shadow Earning Engine v3</p>
            <h1 className="font-outfit text-3xl font-semibold sm:text-5xl">Eventos reales, efectos cero</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-muted">
              Reproduce contratos de eventos, prueba idempotencia, límites y reversos contra reglas validadas. Cada resultado muestra lo que habría ocurrido; ningún punto entra al ledger de Rewards.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={loading || busy}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </Button>
        </div>
      </header>

      <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[.055] p-5 text-sm text-amber-100">
        <div className="flex gap-3"><ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-300" /><div><strong>SHADOW ONLY — cero efectos de ledger.</strong><p className="mt-1 text-xs leading-relaxed text-amber-100/70">`processing_enabled` habilita únicamente evaluación hipotética. No activa earning comercial, no cambia `reward_accounts`, no crea `reward_ledger_entries`, no habilita redención y no conecta con CTGO.</p></div></div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/[.06] px-4 py-3 text-sm text-red-300">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[.05] px-4 py-3 text-sm text-emerald-200">{notice}</div>}

      {data && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-white/10 bg-white/[.02] p-5"><Zap size={18} className="mb-4 text-accent" /><p className="text-[9px] uppercase tracking-[.15em] text-text-dim">Kill switch</p><p className="mt-2 font-outfit text-xl font-semibold">{data.runtime.processing_enabled ? 'Shadow ON' : 'Cerrado'}</p></article>
          <article className="rounded-2xl border border-white/10 bg-white/[.02] p-5"><Activity size={18} className="mb-4 text-accent" /><p className="text-[9px] uppercase tracking-[.15em] text-text-dim">Eventos recientes</p><p className="mt-2 font-outfit text-3xl font-semibold">{data.events.length}</p></article>
          <article className="rounded-2xl border border-white/10 bg-white/[.02] p-5"><p className="text-[9px] uppercase tracking-[.15em] text-text-dim">Tope por evento</p><p className="mt-2 font-outfit text-3xl font-semibold">{data.runtime.max_points_per_event.toLocaleString()} pts</p></article>
          <article className="rounded-2xl border border-white/10 bg-white/[.02] p-5"><p className="text-[9px] uppercase tracking-[.15em] text-text-dim">Eventos / sujeto / día</p><p className="mt-2 font-outfit text-3xl font-semibold">{data.runtime.max_events_per_subject_per_day}</p></article>
        </section>
      )}

      {data && <form key={data.runtime.updated_at} onSubmit={configure} className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
        <h2 className="font-outfit text-xl font-semibold">Guardrails del runtime sombra</h2>
        <p className="mt-2 text-xs text-text-dim">El default de 0135 es kill switch cerrado. Cambiarlo no publica Rewards.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label><span className={labelClass}>Procesamiento sombra</span><select name="processingEnabled" defaultValue={String(data.runtime.processing_enabled)} className={inputClass}><option value="false">Cerrado</option><option value="true">Shadow ON</option></select></label>
          <label><span className={labelClass}>Monto máximo (COP)</span><input name="maxAmountCop" type="number" min="1" step="1" defaultValue={Math.floor(data.runtime.max_amount_cents / 100)} required className={inputClass} /></label>
          <label><span className={labelClass}>Puntos hipotéticos máximos</span><input name="maxPointsPerEvent" type="number" min="1" step="1" defaultValue={data.runtime.max_points_per_event} required className={inputClass} /></label>
          <label><span className={labelClass}>Eventos/sujeto/día</span><input name="maxEventsPerSubjectPerDay" type="number" min="1" max="1000" step="1" defaultValue={data.runtime.max_events_per_subject_per_day} required className={inputClass} /></label>
          <label className="md:col-span-2 lg:col-span-4"><span className={labelClass}>Razón del cambio</span><input name="reason" minLength={4} maxLength={300} required defaultValue={data.runtime.updated_reason} className={inputClass} /></label>
        </div>
        <Button type="submit" className="mt-5" disabled={busy}>Guardar guardrails</Button>
      </form>}

      <section className="grid gap-5 xl:grid-cols-2">
        <form onSubmit={ingest} className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
          <h2 className="font-outfit text-xl font-semibold">Replay manual de evento</h2>
          <p className="mt-2 text-xs text-text-dim">Solo SUPER_ADMIN. Los conectores automáticos aún no existen en v3.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label><span className={labelClass}>Source domain</span><input name="sourceDomain" required maxLength={64} placeholder="pisao.purchase" className={inputClass} /></label>
            <label><span className={labelClass}>Event code</span><input name="eventCode" required maxLength={64} placeholder="purchase.completed" className={inputClass} /></label>
            <label><span className={labelClass}>External event ID</span><input name="externalEventId" required maxLength={128} placeholder="pos_20260914_0001" className={inputClass} /></label>
            <label><span className={labelClass}>CTG user UUID</span><input name="subjectUserId" required placeholder="00000000-0000-4000-8000-000000000000" className={inputClass} /></label>
            <label><span className={labelClass}>Monto (COP)</span><input name="amountCop" type="number" min="0" step="1" required className={inputClass} /></label>
            <label><span className={labelClass}>Occurred at</span><input name="occurredAt" type="datetime-local" defaultValue={nowForInput()} required className={inputClass} /></label>
            <label className="sm:col-span-2"><span className={labelClass}>SHA-256 del payload fuente</span><input name="payloadDigest" pattern="[0-9a-fA-F]{64}" minLength={64} maxLength={64} required placeholder="64 caracteres hexadecimales" className={inputClass} /></label>
          </div>
          <Button type="submit" className="mt-5" disabled={busy}>Procesar en sombra</Button>
        </form>

        <form onSubmit={reverse} className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
          <div className="flex items-center gap-3"><RotateCcw size={18} className="text-accent" /><h2 className="font-outfit text-xl font-semibold">Reverso sombra</h2></div>
          <p className="mt-2 text-xs text-text-dim">Un evento original admite un solo reverso. El reverso se evalúa aunque el kill switch esté cerrado.</p>
          <div className="mt-5 grid gap-4">
            <label><span className={labelClass}>Evento original</span><select name="sourceEventId" required defaultValue="" className={inputClass}><option value="" disabled>Seleccionar evento</option>{reversibleEvents.map(item => <option key={item.id} value={item.id}>{item.external_event_id} · {item.source_domain} · ${centsToCop(item.amount_cents)}</option>)}</select></label>
            <label><span className={labelClass}>External reversal ID</span><input name="externalEventId" required maxLength={128} placeholder="refund_20260914_0001" className={inputClass} /></label>
            <label><span className={labelClass}>Occurred at</span><input name="occurredAt" type="datetime-local" defaultValue={nowForInput()} required className={inputClass} /></label>
            <label><span className={labelClass}>SHA-256 del payload de reverso</span><input name="payloadDigest" pattern="[0-9a-fA-F]{64}" minLength={64} maxLength={64} required className={inputClass} /></label>
          </div>
          <Button type="submit" className="mt-5" disabled={busy || reversibleEvents.length === 0}>Registrar reverso</Button>
        </form>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-white/[.018] p-5 sm:p-6">
        <h2 className="font-outfit text-xl font-semibold">Evidencia sombra reciente</h2>
        <div className="mt-5 space-y-3">
          {(data?.events ?? []).length === 0 && <p className="text-sm text-text-dim">Aún no hay eventos sombra.</p>}
          {(data?.events ?? []).map(item => { const evaluation = evaluationsByEvent.get(item.id); return <article key={item.id} className="rounded-xl border border-white/[.07] bg-black/20 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><strong className="text-sm">{item.external_event_id}</strong><p className="mt-1 font-mono text-[10px] text-text-dim">{item.source_domain} · {item.event_code} · {item.event_kind}</p><p className="mt-2 text-xs text-text-muted">${centsToCop(item.amount_cents)} COP · {new Date(item.occurred_at).toLocaleString()}</p></div><div className="sm:text-right">{evaluation ? <><span className="rounded-full border border-white/10 px-2 py-1 text-[8px] uppercase tracking-[.1em] text-accent">{evaluation.decision}</span><p className="mt-2 font-outfit text-lg">{evaluation.calculated_points.toLocaleString()} pts</p><p className="text-[9px] text-text-dim">{evaluation.direction} · {evaluation.reason_code}</p></> : <span className="text-xs text-amber-300">Sin evaluación confirmada</span>}</div></div></article>; })}
        </div>
      </section>
    </div>
  );
}
