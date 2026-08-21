'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRightLeft, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { formatCents } from '@/lib/format';

type ReinvestmentQueueRow = {
  id: string;
  participantUserId: string;
  participantKycStatus?: string;
  sourceSettlementId: string;
  sourceLotId?: string;
  sourceLotCode?: string;
  sourceBeerStyle?: string;
  targetLotId: string;
  targetLotCode: string;
  targetBeerStyle: string;
  targetLotStatus?: string;
  caseEquivalentUnits: number | null;
  amountCents: number;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNotes?: string | null;
  sourceCreditCents?: number;
  sourceUsedOrReservedCents?: number;
  participantSpendableBalanceCents?: number;
  legacyCaseIntentMissing?: boolean;
};

type QueueSnapshot = {
  active: ReinvestmentQueueRow[];
  history: ReinvestmentQueueRow[];
  generatedAt: string;
};

const EMPTY: QueueSnapshot = { active: [], history: [], generatedAt: '' };

export function FinanceReinvestmentQueue() {
  const [snapshot, setSnapshot] = useState<QueueSnapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: rpcError } = await createClient().rpc('get_finance_reinvestment_queue_snapshot', {
      p_active_limit: 50,
      p_history_limit: 50,
    });
    if (rpcError) setError(rpcError.message);
    else setSnapshot((data as QueueSnapshot | null) ?? EMPTY);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const run = async (id: string, action: () => PromiseLike<{ error: { message: string } | null }>, success: string) => {
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      const result = await action();
      if (result.error) throw new Error(result.error.message);
      setMessage(success);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo completar la operación de reinversión.');
    } finally {
      setBusyId(null);
    }
  };

  const approve = (row: ReinvestmentQueueRow) => run(
    row.id,
    () => createClient().rpc('approve_reinvestment_request', { p_request_id: row.id }),
    'Reinversión aprobada: asignación y débito registrados atómicamente.',
  );

  const reject = (row: ReinvestmentQueueRow) => {
    const reason = window.prompt('Motivo de rechazo de la reinversión');
    if (!reason?.trim()) return;
    void run(
      row.id,
      () => createClient().rpc('reject_reinvestment_request', { p_request_id: row.id, p_reason: reason.trim() }),
      'Reinversión rechazada y reservas liberadas.',
    );
  };

  return (
    <section className="space-y-5" data-testid="finance-reinvestment-queue">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-accent"><ArrowRightLeft size={15} /><p className="text-[9px] uppercase tracking-[.2em]">Reinvestment Rail</p></div>
          <h2 className="text-2xl font-outfit font-semibold mt-2">Cola de reinversiones</h2>
          <p className="text-xs text-text-muted mt-2 max-w-2xl leading-relaxed">Finanzas revisa la intención ya fijada por el participante. La aprobación no puede cambiar cajas ni capital: PostgreSQL revalida KYC, crédito de origen, saldo y capacidad del lote.</p>
        </div>
        <Button onClick={() => void load()} variant="secondary" size="sm" disabled={loading}><RefreshCw size={13} /> Actualizar</Button>
      </div>

      {(message || error) && <div className="rounded-xl border px-4 py-3 text-xs" style={{ borderColor: error ? 'rgba(239,68,68,.3)' : 'rgba(201,169,98,.28)', color: error ? '#fca5a5' : 'var(--accent)' }}>{error ?? message}</div>}

      {loading ? <p className="text-sm text-text-dim">Sincronizando reinversiones...</p> : snapshot.active.length === 0 ? (
        <div className="rounded-2xl border border-white/[.08] bg-white/[.02] p-6"><p className="text-sm text-text-dim">No hay reinversiones pendientes de decisión.</p></div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {snapshot.active.map((row) => <article key={row.id} className="rounded-2xl border border-white/[.08] bg-white/[.02] p-5">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[9px] uppercase tracking-[.15em] text-text-dim">{row.sourceLotCode ?? 'Liquidación'} → {row.targetLotCode}</p><p className="text-xl text-white font-semibold mt-1">{formatCents(row.amountCents)}</p><p className="text-[9px] font-mono text-text-dim mt-1">{row.id}</p></div>
              <span className="rounded-full border border-accent/20 bg-accent/[.04] px-2.5 py-1 text-[8px] uppercase tracking-[.12em] text-accent">REQUESTED</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <Mini label="Participante" value={row.participantUserId.slice(0, 12)} />
              <Mini label="KYC" value={row.participantKycStatus ?? '—'} alert={row.participantKycStatus !== 'VERIFIED'} />
              <Mini label="Cajas fijadas" value={row.caseEquivalentUnits == null ? 'LEGACY' : String(row.caseEquivalentUnits)} alert={row.caseEquivalentUnits == null} />
              <Mini label="Lote destino" value={`${row.targetLotCode} · ${row.targetLotStatus ?? '—'}`} alert={row.targetLotStatus !== 'FUNDING_OPEN'} />
              <Mini label="Crédito origen" value={formatCents(row.sourceCreditCents ?? 0)} />
              <Mini label="Usado / reservado" value={formatCents(row.sourceUsedOrReservedCents ?? 0)} />
              <Mini label="Saldo reinvertible" value={formatCents(row.participantSpendableBalanceCents ?? 0)} />
              <Mini label="Solicitado" value={new Date(row.createdAt).toLocaleString('es-CO')} />
            </div>

            {row.legacyCaseIntentMissing ? <p className="text-[11px] text-amber-300/80 mt-4">Solicitud histórica sin cantidad de cajas fijada. Debe resolverse por el procedimiento legacy; la aprobación canónica permanecerá bloqueada.</p> : null}
            <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-white/[.07]">
              <Button onClick={() => void approve(row)} loading={busyId === row.id} disabled={!!row.legacyCaseIntentMissing || row.participantKycStatus !== 'VERIFIED' || row.targetLotStatus !== 'FUNDING_OPEN'} variant="primary" size="sm"><CheckCircle2 size={13} /> Aprobar reinversión</Button>
              <Button onClick={() => reject(row)} disabled={busyId === row.id} variant="secondary" size="sm"><ShieldAlert size={13} /> Rechazar</Button>
            </div>
          </article>)}
        </div>
      )}

      {snapshot.history.length > 0 && <div className="border-t border-white/[.07] pt-5">
        <p className="text-[9px] uppercase tracking-[.18em] text-text-dim mb-3">Historial reciente</p>
        <div className="space-y-2">{snapshot.history.slice(0, 20).map((row) => <div key={row.id} className="grid sm:grid-cols-[1fr_auto] gap-3 rounded-lg border border-white/[.06] px-3 py-3"><div><p className="text-xs text-white">{row.targetLotCode} · {row.caseEquivalentUnits ?? '—'} cajas · {formatCents(row.amountCents)}</p><p className="text-[9px] text-text-dim mt-1">{row.participantUserId.slice(0, 12)} · {row.reviewNotes ?? 'Sin observación'}</p></div><span className="text-[9px] uppercase tracking-[.12em] text-accent sm:self-center">{row.status}</span></div>)}</div>
      </div>}
    </section>
  );
}

function Mini({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return <div className="rounded-lg border border-white/[.06] p-3"><p className="text-[8px] uppercase tracking-[.12em] text-text-dim">{label}</p><p className={`text-xs mt-1 truncate ${alert ? 'text-amber-300' : 'text-white'}`}>{value}</p></div>;
}
