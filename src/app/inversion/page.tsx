'use client';

import React from 'react';
import { Container, Badge, SectionHeader, FadeInSection } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { LotCard } from '@/components/inversion/LotCard';
import { DEMO_LOTS } from '@/lib/investment/demo-data';

const STEPS = [
  { n: '01', label: 'Selecciona una oportunidad' },
  { n: '02', label: 'Financia un equivalente productivo' },
  { n: '03', label: 'Sigue la producción' },
  { n: '04', label: 'Sigue las ventas' },
  { n: '05', label: 'Consulta la liquidación' },
  { n: '06', label: 'Retira o reinvierte' },
];

export default function InversionLandingPage() {
  return (
    <>
      <section className="relative pt-20 pb-24 sm:pt-28 sm:pb-32 overflow-hidden">
        <Container className="relative z-10">
          <FadeInSection>
            <Badge variant="accent" className="mb-8">Cervecería Cartagena S.A.S.</Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-outfit font-semibold text-white leading-[1.1] max-w-3xl mb-6">
              Participa en la producción real de <span className="text-accent">CTG Craft Beer</span>
            </h1>
            <p className="text-base sm:text-lg text-text-muted max-w-xl leading-relaxed mb-10">
              Financia el equivalente productivo de lotes identificados de CTG Craft Beer,
              sigue su producción y comercialización de cerca, y consulta la liquidación con
              transparencia total. Cerveza real, producción real, inventario real.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button href="/inversion/lotes" variant="primary" size="lg" arrow>
                Ver lotes disponibles
              </Button>
              <Button href="/inversion/como-funciona" variant="secondary" size="lg">
                Cómo funciona
              </Button>
            </div>
          </FadeInSection>
        </Container>
      </section>

      <section className="py-20 sm:py-24" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <Container>
          <FadeInSection>
            <SectionHeader
              badge="El proceso"
              title="De la capital a la"
              titleHighlight="liquidación"
              description="Cada lote es trazable de principio a fin, con evidencia operativa en cada etapa."
              centered={false}
              className="mb-14 max-w-2xl"
            />
          </FadeInSection>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {STEPS.map((step, i) => (
              <FadeInSection key={step.n} delay={i * 0.05}>
                <div>
                  <span className="text-2xl font-outfit font-semibold text-accent">{step.n}</span>
                  <p className="text-[13px] text-text-secondary mt-2 leading-snug">{step.label}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <FadeInSection>
            <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
              <SectionHeader
                badge="Oportunidades"
                title="Lotes de"
                titleHighlight="producción"
                centered={false}
                className="max-w-lg"
              />
              <Button href="/inversion/lotes" variant="ghost" size="sm" arrow>
                Ver todos los lotes
              </Button>
            </div>
          </FadeInSection>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {DEMO_LOTS.map((lot, i) => (
              <FadeInSection key={lot.slug} delay={i * 0.1}>
                <LotCard lot={lot} />
              </FadeInSection>
            ))}
          </div>
          <p className="text-[11px] text-text-dim mt-6">
            Datos de demostración — este programa se encuentra en fase de beta cerrada.
          </p>
        </Container>
      </section>

      <section className="py-20 sm:py-24" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <Container size="small">
          <FadeInSection>
            <div
              className="p-8 sm:p-12 rounded-lg text-center"
              style={{ backgroundColor: 'rgba(201, 169, 98, 0.05)', border: '1px solid var(--border-accent, rgba(201,169,98,0.2))' }}
            >
              <h2 className="text-xl sm:text-2xl font-outfit font-semibold text-white mb-3">
                ¿Quieres estimar una participación?
              </h2>
              <p className="text-sm text-text-muted max-w-md mx-auto mb-8 leading-relaxed">
                Usa el simulador para ver, con cifras ilustrativas, cómo se comportaría tu
                participación en un lote. No constituye una rentabilidad garantizada.
              </p>
              <Button href="/inversion/simulador" variant="primary" size="md" arrow>
                Abrir simulador
              </Button>
            </div>
          </FadeInSection>
        </Container>
      </section>
    </>
  );
}
