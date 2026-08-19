import React from 'react';
import { Container, Badge } from '@/components/ui';
import { LotCard } from '@/components/inversion/LotCard';
import { getPublicLots, getPublicLotFundingSummaries } from '@/lib/investment/queries';
import { MIN_INVESTMENT_CASES } from '@/lib/investment/constants';

export const metadata = { title: 'Lotes de producción' };
// Always reflects live DB state — without this, a build where Supabase
// env vars happen to be unset would get statically baked with an empty
// lot list and never update, regardless of what admins create later.
export const dynamic = 'force-dynamic';

export default async function LotesPage() {
  const [lots, fundingByLot] = await Promise.all([
    getPublicLots(),
    getPublicLotFundingSummaries(),
  ]);

  const openLots = lots.filter((lot) => {
    const funding = fundingByLot[lot.id];
    return lot.status === 'FUNDING_OPEN'
      && (funding?.availableCasesEquivalent ?? 0) >= MIN_INVESTMENT_CASES;
  }).length;

  return (
    <section className="py-20 sm:py-28">
      <Container>
        <Badge variant="accent" className="mb-6">Oportunidades</Badge>
        <h1 className="text-3xl sm:text-4xl font-outfit font-semibold text-white mb-4 max-w-2xl">
          Lotes de producción de CTG Craft Beer
        </h1>
        <p className="text-base text-text-muted max-w-xl leading-relaxed mb-4">
          Cada lote corresponde a una producción física identificable. Tu aporte financia un
          equivalente productivo dentro del lote, no botellas específicas.
        </p>
        <p className="text-[11px] text-text-dim mb-14 max-w-2xl leading-relaxed">
          {openLots > 0
            ? `${openLots} ${openLots === 1 ? 'lote tiene' : 'lotes tienen'} financiación abierta en este momento. Solo los lotes con estado “Financiación abierta” y capacidad suficiente aceptan nuevas órdenes.`
            : 'No hay financiación abierta en este momento. Puedes consultar los lotes publicados y su estado; una nueva orden solo se habilita cuando el lote entra en “Financiación abierta” y conserva capacidad suficiente.'}
        </p>

        {lots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lots.map((lot) => (
              <LotCard
                key={lot.id}
                lot={lot}
                funding={fundingByLot[lot.id] ?? {
                  totalCases: lot.total_eligible_units,
                  allocatedCases: 0,
                  fundedPercent: 0,
                  availableCasesEquivalent: lot.total_eligible_units,
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-dim">
            Aún no hay lotes publicados. Los borradores internos no se muestran en esta superficie.
          </p>
        )}
      </Container>
    </section>
  );
}
