'use client';

import React from 'react';
import { Card, Badge } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { LOT_STATUS_LABELS } from '@/types/investment';
import type { InvestmentProductionLot, LotFundingSummary } from '@/types/investment';

interface LotCardProps {
  lot: InvestmentProductionLot;
  funding: LotFundingSummary;
}

export const LotCard: React.FC<LotCardProps> = ({ lot, funding }) => {
  const capacityLabel = lot.status === 'FUNDING_OPEN'
    ? `${funding.availableCasesEquivalent} cajas equivalentes disponibles`
    : `${funding.availableCasesEquivalent} cajas equivalentes no asignadas`;

  return (
    <Card variant="bordered" padding="lg" hover className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <Badge variant="accent">{lot.destination}</Badge>
          <h3 className="text-xl font-outfit font-semibold text-white mt-3">{lot.beer_style}</h3>
          <p className="text-[11px] text-text-dim tracking-wider mt-1">{lot.code}</p>
        </div>
        <span
          className="text-[10px] uppercase tracking-[0.15em] font-medium px-3 py-1.5 rounded-full flex-shrink-0"
          style={{ color: 'var(--accent)', border: '1px solid rgba(201, 169, 98, 0.25)' }}
        >
          {LOT_STATUS_LABELS[lot.status]}
        </span>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 text-[11px] text-text-dim mb-2">
          <span>{funding.fundedPercent}% financiado</span>
          <span className="text-right">{capacityLabel}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(Math.max(funding.fundedPercent, 0), 100)}%`, backgroundColor: 'var(--accent)' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mb-1">Producción</p>
          <p className="text-white font-medium">{lot.total_cases} cajas</p>
        </div>
        <div>
          <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mb-1">Tamaño de caja</p>
          <p className="text-white font-medium">{lot.case_size_units} botellas</p>
        </div>
      </div>

      <div className="mt-auto pt-2">
        <Button href={`/inversion/lotes/${lot.code.toLowerCase()}`} variant="primary" size="sm" fullWidth arrow>
          Ver lote
        </Button>
      </div>
    </Card>
  );
};
