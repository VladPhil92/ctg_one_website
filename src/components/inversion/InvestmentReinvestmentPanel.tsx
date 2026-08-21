'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Boxes, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { formatCents } from '@/lib/format';

type ReinvestmentSource = {
  settlementId: string;
  sourceLotId: string;
  sourceLotCode: string;
  beerStyle: string;
  creditedAmountCents: number;
  usedOrReservedAmountCents: number;
  remainingCreditCents: number;
};

type ReinvestmentTarget = {
  lotId: string;
  lotCode: string;
  beerStyle: string;
  caseSizeUnits: number;
  capitalPerCaseCents: number;
  totalEligibleCases: number;
  allocatedCases: number;
  orderReservedCases: number;
  reinvestmentReservedCases: number;
  availableFundableCases: number;
  legacyReservationBlocked: boolean;
};

type ReinvestmentRequest = {
  id: string;
  sourceSettlementId: string;
  targetLotId: string;
  targetLotCode: string;
  caseEquivalentUnits: number | null;
  amountCents: number;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  reviewNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

type ReinvestmentContext = {
  spendableBalanceCents: number;
  sources: ReinvestmentSource[];
  targets: ReinvestmentTarget[];
  requests: ReinvestmentRequest[];
};

type Props = { onRefresh: () => Promise<void> };

const EMPTY_CONTEXT: ReinvestmentContext = {
  spendableBalanceCents: 0,
  sources: [],
  targets: [],
  requests: [],
};

const STATUS_LABELS: Record<ReinvestmentRequest['status'], string> = {
  REQUESTED: 'Reservada',
  APPROVED: 'Reinvertida',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
};

export function InvestmentReinvestmentPanel({ onRefresh }: Props) {
  const [context, setContext] = useState<ReinvestmentContext>(EMPTY_CONTEXT);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [cases, setCases] = useState('2');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadContext = async () => {
    setLoading(true);
    const { data, error: rpcError } = await createClient().rpc('get_participant_reinvestment_context');
    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    const next = (data as ReinvestmentContext | null) ?? EMPTY_CONTEXT;
    setContext(next);
    setSourceId((current) => current && next.sources.some((item) => item.settlementId === current)
      ? current
      : next.sources.find((item) => item.remainingCreditCents > 0)?.settlementId ?? '');
    setTargetId((current) => current && next.targets.some((item) => item.lotId === current)
      ? current
      : next.targets.find((item) => item.availableFundableCases >= 2 && !item.legacyReservationBlocked)?.lotId ?? '');
    setLoading(false);
  };

  useEffect(() => { void loadContext(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const source = useMemo(
    () => context.sources.find((item) => item.settlementId === sourceId) ?? null,
    [context.sources, sourceId],
  );
  const target = useMemo(
    () => context.targets.find((item) => item.lotId === targetId) ?? null,
    [context.targets, targetId],
  );

  const maxCases = useMemo(() => {
    if (!source || !target || target.capitalPerCaseCents <= 0) return 0;
    return Math.max(0, Math.min(
      target.availableFundableCases,
      Math.floor(source.remainingCreditCents / target.capitalPerCaseCents),
      Math.floor(context.spendableBalanceCents / target.capitalPerCaseCents),
    ));
  }, [context.spendableBalanceCents, source, target]);

  const requestedCases = Number.parseInt(cases, 10);
  const requestedAmount = target && Number.isInteger(requestedCases) && requestedCases > 0
    ? target.capitalPerCaseCents * requestedCases
    : 0;
  const canSubmit = !!source
    && !!target
    && Number.isInteger(requestedCases)
    && requestedCases >= 2
    && requestedCases <= maxCases
    && !target.legacyReservationBlocked;

  const requestReinvestment = async () => {
    if (!canSubmit || !source || !target) {
      setError(maxCases < 2
        ? 'No hay capacidad económica suficiente para reinvertir el mínimo de 2 cajas.'
        : 'Selecciona una fuente, un lote y una cantidad válida de cajas.');
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    const { error: rpcError } = await createClient().rpc('request_reinvestment_cases', {
      p_source_settlement_id: source.settlementId,
      p_target_lot_id: target.lotId,
      p_case_equivalent_units: requestedCases,
      p_idempotency_key: crypto.randomUUID(),
    });

    if (rpcError) setError(rpcError.message);
    else {
      setMessage(`Reinversión de ${requestedCases} cajas solicitada. El capital y la capacidad del lote quedan reservados hasta aprobación o cancelación.`);
      setCases('2');
      await Promise.all([loadContext(), onRefresh()]);
    }
    setBusy(false);
  };

  const cancelRequest = async (requestId: string) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    const { error: rpcError } = await createClient().rpc('cancel_reinvestment_request', { p_request_id: requestId });
    if (rpcError) setError(rpcError.message);
    else {
      setMessage('Solicitud cancelada. El saldo y la capacidad reservados vuelven a quedar disponibles.');
      await Promise.all([loadContext(), onRefresh()]);
    }
    setBusy(false);
  };

  return (
    <section className="investment-panel rounded-[22px] p-5 sm:p-6 mb-10" data-testid="investment-reinvestment-panel">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-6">
        <div>
          <div className="flex items-center gap-2 text-accent mb-2"><ArrowRightLeft size={15} /><p className="micro-label text-accent">Settlement → New Lot</p></div>
          <h2 className="text-2xl font-outfit font-semibold">Reinvertir saldo liquidado</h2>
          <p className="text-xs text-text-muted mt-2 max-w-2xl leading-relaxed">Elige una liquidación de origen y un lote abierto. El servidor calcula el capital exacto por caja desde los costos congelados del lote; una solicitud pendiente reserva simultáneamente saldo y capacidad productiva.</p>
        </div>
        <div className="rounded-xl border border-accent/15 bg-accent/[.035] px-4 py-3 min-w-[190px]">
          <p className="micro-label">Saldo reinvertible</p>
          <p className="text-xl font-semibold text-accent mt-1">{loading ? '—' : formatCents(context.spendableBalanceCents)}</p>
        </div>
      </div>

      {(error || message) && <div className="rounded-lg border px-3 py-2 text-xs mb-5" style={{ borderColor: error ? 'rgba(239,68,68,.25)' : 'rgba(201,169,98,.25)', color: error ? '#fca5a5' : 'var(--accent)' }}>{error ?? message}</div>}

      <div className="grid xl:grid-cols-[1fr_1fr_.65fr] gap-4">
        <label className="block text-xs text-text-muted">Liquidación de origen
          <select className="reinvestInput mt-1.5" value={sourceId} onChange={(event) => setSourceId(event.target.value)} disabled={loading || busy}>
            <option value="">Seleccionar liquidación</option>
            {context.sources.map((item) => <option key={item.settlementId} value={item.settlementId} disabled={item.remainingCreditCents <= 0}>{item.sourceLotCode} · {formatCents(item.remainingCreditCents)} disponible</option>)}
          </select>
        </label>
        <label className="block text-xs text-text-muted">Lote de destino
          <select className="reinvestInput mt-1.5" value={targetId} onChange={(event) => setTargetId(event.target.value)} disabled={loading || busy}>
            <option value="">Seleccionar lote</option>
            {context.targets.map((item) => <option key={item.lotId} value={item.lotId} disabled={item.availableFundableCases < 2 || item.legacyReservationBlocked}>{item.lotCode} · {item.availableFundableCases} cajas disponibles</option>)}
          </select>
        </label>
        <label className="block text-xs text-text-muted">Cajas a reinvertir
          <input className="reinvestInput mt-1.5" type="number" min={2} max={Math.max(maxCases, 2)} step={1} inputMode="numeric" value={cases} onChange={(event) => setCases(event.target.value)} disabled={loading || busy} />
        </label>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-5">
        <ReinvestmentMetric label="Capital por caja" value={target ? formatCents(target.capitalPerCaseCents) : '—'} />
        <ReinvestmentMetric label="Total a reservar" value={requestedAmount > 0 ? formatCents(requestedAmount) : '—'} />
        <ReinvestmentMetric label="Máximo por capacidad" value={target && source ? `${maxCases} cajas` : '—'} />
      </div>

      {target?.legacyReservationBlocked && <p className="text-[10px] text-amber-300/80 mt-3">Este lote tiene una solicitud histórica sin cantidad de cajas verificable. La nueva capacidad permanece bloqueada hasta revisión operativa.</p>}
      {source && <p className="text-[10px] text-text-dim mt-3">Origen {source.sourceLotCode}: {formatCents(source.creditedAmountCents)} acreditado · {formatCents(source.usedOrReservedAmountCents)} ya reinvertido o reservado.</p>}

      <div className="flex flex-wrap gap-3 mt-5">
        <Button onClick={() => void requestReinvestment()} disabled={!canSubmit || busy} loading={busy} variant="primary" size="sm"><RotateCcw size={13} /> Solicitar reinversión</Button>
        <Button onClick={() => void loadContext()} disabled={busy} variant="secondary" size="sm"><RefreshCw size={13} /> Actualizar</Button>
      </div>

      {context.requests.length > 0 && <div className="mt-7 border-t border-white/[.07] pt-5">
        <div className="flex items-center gap-2 mb-3"><Boxes size={13} className="text-accent" /><p className="micro-label">Historial de reinversiones</p></div>
        <div className="space-y-2">{context.requests.slice(0, 10).map((request) => <div key={request.id} className="grid sm:grid-cols-[1fr_auto] gap-3 rounded-lg border border-white/[.055] px-3 py-3">
          <div><p className="text-xs text-white">{request.targetLotCode} · {request.caseEquivalentUnits ?? '—'} cajas · {formatCents(request.amountCents)}</p><p className="text-[9px] text-text-dim mt-1">{new Date(request.createdAt).toLocaleString('es-CO')}{request.reviewNotes ? ` · ${request.reviewNotes}` : ''}</p></div>
          <div className="flex items-center gap-3 sm:justify-end"><span className="text-[9px] uppercase tracking-[.1em] text-accent">{STATUS_LABELS[request.status]}</span>{request.status === 'REQUESTED' && <button type="button" disabled={busy} onClick={() => void cancelRequest(request.id)} className="text-[9px] uppercase tracking-[.08em] text-text-muted hover:text-white disabled:opacity-40">Cancelar</button>}</div>
        </div>)}</div>
      </div>}

      {!loading && context.sources.length === 0 && <p className="text-xs text-text-muted mt-5">Aún no tienes una liquidación acreditada que pueda utilizarse como origen de reinversión.</p>}
      <style jsx global>{`.reinvestInput{width:100%;border-radius:11px;padding:10px 12px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.09);color:#fff;outline:none}.reinvestInput:focus{border-color:rgba(201,169,98,.38)}.reinvestInput:disabled{opacity:.45}.reinvestInput option{background:#101010;color:#fff}`}</style>
    </section>
  );
}

function ReinvestmentMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-white/[.07] bg-white/[.012] p-3"><p className="micro-label">{label}</p><p className="text-sm text-white mt-1 font-mono">{value}</p></div>;
}
