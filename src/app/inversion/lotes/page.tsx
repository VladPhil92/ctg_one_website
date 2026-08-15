import React from 'react';
import { Container, Badge } from '@/components/ui';
import { LotCard } from '@/components/inversion/LotCard';
import { DEMO_LOTS } from '@/lib/investment/demo-data';

export const metadata = { title: 'Lotes de producción' };

export default function LotesPage() {
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
          Datos de demostración — este programa se encuentra en fase de beta cerrada.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {DEMO_LOTS.map((lot) => (
            <LotCard key={lot.slug} lot={lot} />
          ))}
        </div>
      </Container>
    </section>
  );
}
