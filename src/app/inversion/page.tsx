import React from 'react';
import Image from 'next/image';
import { Container, Badge, SectionHeader, FadeInSection } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { LotCard } from '@/components/inversion/LotCard';
import { getPublicLots, getLotFundingSummary } from '@/lib/investment/queries';

// See the same note in src/app/inversion/lotes/page.tsx — this page also
// reads live lot data and must never get statically baked with a stale
// (possibly empty) snapshot.
export const dynamic = 'force-dynamic';

const STEPS = [
  { n: '01', label: 'Selecciona una oportunidad' },
  { n: '02', label: 'Financia un equivalente productivo' },
  { n: '03', label: 'Sigue la producción' },
  { n: '04', label: 'Sigue las ventas' },
  { n: '05', label: 'Consulta la liquidación' },
  { n: '06', label: 'Retira o reinvierte' },
];

const BEER_STYLES = [
  {
    name: 'Golden Pale Ale',
    origin: 'CTG Craft Beer',
    detail: '330 ml · 4.5% vol.',
    image: '/images/inversion/ctg-craft-beer-miyagi.webp',
    alt: 'Botella Golden Pale Ale de CTG Craft Beer en un punto de comercialización',
  },
  {
    name: 'Hefeweizen',
    origin: 'Receta alemana',
    detail: '330 ml · 4.8% vol.',
    image: '/images/inversion/ctg-craft-beer-hefeweizen.webp',
    alt: 'Botella Hefeweizen de receta alemana de CTG Craft Beer',
  },
  {
    name: 'Porter',
    origin: 'CTG Craft Beer',
    detail: '330 ml · 5.5% vol.',
    image: '/images/inversion/ctg-craft-beer-porter.webp',
    alt: 'Botella Porter de CTG Craft Beer',
  },
  {
    name: 'Irish Red Ale',
    origin: 'CTG Craft Beer',
    detail: '330 ml · 3.5% vol.',
    image: '/images/inversion/ctg-craft-beer-irish-red-ale.webp',
    alt: 'Botella Irish Red Ale de CTG Craft Beer',
  },
];

export default async function InversionLandingPage() {
  const lots = (await getPublicLots()).slice(0, 2);
  const fundings = await Promise.all(lots.map(getLotFundingSummary));

  return (
    <>
      <section className="relative pt-20 pb-24 sm:pt-28 sm:pb-32 overflow-hidden">
        <Container className="relative z-10">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-16 items-center">
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

            <FadeInSection delay={0.12}>
              <div className="relative aspect-[4/5] max-w-xl mx-auto lg:ml-auto w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
                <Image
                  src="/images/inversion/ctg-craft-beer-miyagi.webp"
                  alt="CTG Craft Beer en un punto real de comercialización"
                  fill
                  priority
                  sizes="(max-width: 1024px) 90vw, 42vw"
                  className="object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-6 pb-6 pt-20">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-accent mb-2">Producto en circulación</p>
                  <p className="text-sm text-white">Marca, producto y comercialización fuera de la pantalla.</p>
                </div>
              </div>
            </FadeInSection>
          </div>
        </Container>
      </section>

      <section className="py-20 sm:py-24" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <Container>
          <FadeInSection>
            <SectionHeader
              badge="Portafolio real"
              title="Los estilos de"
              titleHighlight="CTG Craft Beer"
              description="La plataforma se conecta con una operación cervecera real. Estos son estilos actualmente representativos del portafolio de producto que puede formar parte de los lotes administrados por el programa."
              centered={false}
              className="mb-12 max-w-2xl"
            />
          </FadeInSection>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {BEER_STYLES.map((beer, index) => (
              <FadeInSection key={beer.name} delay={0.04 + index * 0.06}>
                <article className="group overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.025] h-full">
                  <div className="relative aspect-[2/3] overflow-hidden bg-black">
                    <Image
                      src={beer.image}
                      alt={beer.alt}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.025]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  </div>
                  <div className="p-4 sm:p-5">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-accent mb-2">{beer.origin}</p>
                    <h3 className="text-sm sm:text-base font-outfit font-medium text-white mb-1">{beer.name}</h3>
                    <p className="text-[11px] sm:text-xs text-text-dim">{beer.detail}</p>
                  </div>
                </article>
              </FadeInSection>
            ))}
          </div>

          <FadeInSection delay={0.24}>
            <p className="mt-7 max-w-3xl text-xs sm:text-sm text-text-dim leading-relaxed">
              La composición de cada lote, cantidades, costos, disponibilidad y condiciones económicas se informan de manera individual en la ficha correspondiente. La presencia de un estilo en este portafolio no implica que esté disponible en todos los lotes.
            </p>
          </FadeInSection>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
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

      <section className="py-20 sm:py-24" style={{ backgroundColor: 'var(--bg-secondary)' }}>
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
          {lots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {lots.map((lot, i) => (
                <FadeInSection key={lot.id} delay={i * 0.1}>
                  <LotCard lot={lot} funding={fundings[i]} />
                </FadeInSection>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-dim">
              Aún no hay lotes publicados. Este programa se encuentra en fase de beta cerrada.
            </p>
          )}
        </Container>
      </section>

      <section className="py-20 sm:py-24">
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
