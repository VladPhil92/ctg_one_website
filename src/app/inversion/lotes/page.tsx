import React from 'react';
import { Container, Badge } from '@/components/ui';
import { LotCard } from '@/components/inversion/LotCard';
import { getPublicLots, getLotFundingSummary } from '@/lib/investment/queries';

export const metadata = { title: 'Lotes de producción' };
// Always reflects live DB state — without this, a build where Supabase
// env vars happen to be unset would get statically baked with an empty
// lot list and never update, regardless of what admins create later.
export const dynamic = 'force-dynamic';

export default async function LotesPage() {
  const lots = await getPublicLots();
  const fundings = await Promise.all(lots.map(getLotFundingSummary));

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
        <p className="text-[11px] text-text-dim mb-14">
          Este programa se encuentra en fase de beta cerrada.
        </p>

        {lots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lots.map((lot, i) => (
              <LotCard key={lot.id} lot={lot} funding={fundings[i]} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-dim">Aún no hay lotes publicados.</p>
        )}
      </Container>
    </section>
  );
}
