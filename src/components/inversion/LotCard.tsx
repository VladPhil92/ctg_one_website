'use client';

import React from 'react';
import { Card, Badge } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { formatCents } from '@/lib/format';
import type { DemoProductionLot } from '@/types/investment';

interface LotCardProps {
  lot: DemoProductionLot;
}

export const LotCard: React.FC<LotCardProps> = ({ lot }) => {
  return (
    <Card variant="bordered" padding="lg" hover className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <Badge variant="accent">{lot.destination}</Badge>
          <h3 className="text-xl font-outfit font-semibold text-white mt-3">{lot.beerStyle}</h3>
          <p className="text-[11px] text-text-dim tracking-wider mt-1">{lot.code}</p>
        </div>
        <span
          className="text-[10px] uppercase tracking-[0.15em] font-medium px-3 py-1.5 rounded-full flex-shrink-0"
          style={{ color: 'var(--accent)', border: '1px solid rgba(201, 169, 98, 0.25)' }}
        >
          {lot.statusLabel}
        </span>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between text-[11px] text-text-dim mb-2">
          <span>{lot.fundedPercent}% financiado</span>
          <span>{lot.availableCasesEquivalent} cajas equivalentes disponibles</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${lot.fundedPercent}%`, backgroundColor: 'var(--accent)' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mb-1">Producción</p>
          <p className="text-white font-medium">{lot.totalCases} cajas</p>
        </div>
        <div>
          <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mb-1">Aporte mínimo</p>
          <p className="text-white font-medium">{lot.minimumAllocationCases} cajas</p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] text-text-dim uppercase tracking-[0.15em] mb-1">Capital estimado por caja</p>
          <p className="text-white font-medium">{formatCents(lot.capitalPerCaseCents)}</p>
        </div>
      </div>

      <div className="mt-auto pt-2">
        <Button href={`/inversion/lotes/${lot.slug}`} variant="primary" size="sm" fullWidth arrow>
          Ver lote
        </Button>
      </div>
    </Card>
  );
};
