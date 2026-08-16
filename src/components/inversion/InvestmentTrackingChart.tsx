'use client';

import React from 'react';
import { LOT_STATUS_LABELS, type LotStatus } from '@/types/investment';

const CORE_FLOW: LotStatus[] = [
  'FUNDING_OPEN','FUNDED','PROCUREMENT','BREWING','FERMENTATION','CONDITIONING','BOTTLING',
  'QUALITY_CONTROL','WAREHOUSE','DISPATCHED','IN_MARKET','SELLING','SOLD_OUT','SETTLEMENT_PENDING','SETTLED','CLOSED',
];

const EXCEPTIONAL = new Set<LotStatus>(['PAUSED','CANCELLED','PRODUCTION_LOSS','PARTIAL_LOSS','RECALLED','EXPIRED']);

export function InvestmentTrackingChart({ status }: { status: LotStatus }) {
  const exceptional = EXCEPTIONAL.has(status);
  const currentIndex = CORE_FLOW.indexOf(status);
  const progress = currentIndex >= 0 ? Math.round((currentIndex / (CORE_FLOW.length - 1)) * 100) : 0;

  if (exceptional) {
    return (
      <div className="rounded-xl border border-border p-4" style={{ backgroundColor: 'rgba(255,255,255,.02)' }}>
        <p className="text-[10px] uppercase tracking-[0.16em] text-text-dim mb-2">Estado excepcional</p>
        <p className="text-sm text-white">{LOT_STATUS_LABELS[status]}</p>
        <p className="text-[11px] text-text-dim mt-2">El flujo normal está detenido y requiere revisión operativa.</p>
      </div>
    );
  }

  return (
    <div aria-label={`Progreso del lote: ${LOT_STATUS_LABELS[status]}, ${progress}%`}>
      <div className="flex items-center justify-between text-[10px] text-text-dim mb-2">
        <span>{LOT_STATUS_LABELS[status]}</span>
        <span>{progress}% del flujo</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,.07)' }}>
        <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: 'var(--accent)' }} />
      </div>
      <div className="grid grid-cols-4 gap-2 mt-4 text-[9px] uppercase tracking-[0.1em] text-text-dim">
        <span>Financiación</span><span>Producción</span><span>Mercado</span><span className="text-right">Liquidación</span>
      </div>
    </div>
  );
}
