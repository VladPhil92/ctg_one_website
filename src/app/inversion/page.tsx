import React from 'react';
import Image from 'next/image';
import { BarChart3, Coins, Factory, FileText, RefreshCw, Search } from 'lucide-react';
import { Container, Badge, SectionHeader, FadeInSection } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { LotCard } from '@/components/inversion/LotCard';
import { UnitEconomics } from '@/components/inversion/UnitEconomics';
import { getPublicLots, getPublicLotFundingSummaries } from '@/lib/investment/queries';
import publicStyles from '@/styles/PublicCommandCenter.module.css';

export const dynamic = 'force-dynamic';

const STEPS = [
  {
    n: '01',
    title: 'Explora oportunidades',
    description: 'Revisa los lotes publicados, sus estilos, cantidades, estado y condiciones.',
    icon: Search,
  },
  {
    n: '02',
    title: 'Participa en un lote',
    description: 'Cuando un lote abre financiación, elige cuánto participar y confirma tu aporte de forma segura.',
    icon: Coins,
  },
  {
    n: '03',
    title: 'Sigue la producción',
    description: 'Observa el avance del lote desde la elaboración hasta el envasado.',
    icon: Factory,
  },
  {
    n: '04',
    title: 'Sigue las ventas',
    description: 'Consulta la comercialización en puntos propios y canal B2B.',
    icon: BarChart3,
  },
  {
    n: '05',
    title: 'Consulta la liquidación',
    description: 'Revisa ingresos, costos, impuestos y resultado final del lote.',
    icon: FileText,
  },
  {
    n: '06',
    title: 'Retira o reinvierte',
    description: 'Decide qué hacer con tu saldo disponible al finalizar el proceso.',
    icon: RefreshCw,
  },
];

const BEER_STYLES = [
  {
    name: 'Golden Pale Ale',
    origin: 'CTG Craft Beer',
    detail: '330 ml · 4.5% vol.',
    image: '/images/inversion/ctg-craft-beer-golden-pale-ale.webp',
    alt: 'Botella Golden Pale Ale de CTG Craft Beer en fotografía de producto',
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
  const [allLots, fundingByLot] = await Promise.all([
    getPublicLots(),
    getPublicLotFundingSummaries(),
  ]);
  const lots = allLots.slice(0, 2);

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
                  Ver lotes publicados
                </Button>
                <Button href="/inversion/como-funciona" variant="secondary" size="lg">
                  Cómo funciona
                </Button>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.12}>
              <div className={`${publicStyles.mediaFrame} relative aspect-[4/5] max-w-xl mx-auto lg:ml-auto w-full`}>
                <Image
                  src="/images/inversion/ctg-craft-beer-miyagi.webp"
                  alt="CTG Craft Beer en un punto real de comercialización"
                  fill
                  priority
                  quality={78}
                  sizes="(max-width: 1024px) 90vw, 42vw"
                  className="object-cover"
                  data-ctg-photo="source-restored"
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
                  <div className={`${publicStyles.mediaFrame} relative aspect-[2/3] bg-black`}>
                    <Image
                      src={beer.image}
                      alt={beer.alt}
                      fill
                      quality={78}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.025]"
                      data-ctg-photo="source-restored"
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

      <UnitEconomics />

      <section className="py-20 sm:py-24 overflow-hidden">
        <Container>
          <FadeInSection>
            <SectionHeader
              badge="El proceso"
              title="De tu inversión a la"
              titleHighlight="venta"
              description="Sigue cada etapa del lote: participación, producción, comercialización y liquidación."
              centered={false}
              className="mb-12 sm:mb-14 max-w-2xl"
            />
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <FadeInSection key={step.n} delay={i * 0.05}>
                  <article className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(201,169,98,0.28)] hover:bg-white/[0.04]">
                    <div
                      className="absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                      style={{ backgroundColor: 'rgba(201, 169, 98, 0.09)' }}
                      aria-hidden="true"
                    />

                    <div className="relative flex items-start justify-between gap-5 mb-8">
                      <div
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[rgba(201,169,98,0.22)]"
                        style={{
                          background: 'radial-gradient(circle at 50% 45%, rgba(201,169,98,0.15), rgba(201,169,98,0.035) 70%)',
                          boxShadow: '0 0 34px rgba(201,169,98,0.07)',
                        }}
                      >
                        <Icon
                          aria-hidden="true"
                          className="h-7 w-7 text-accent"
                          strokeWidth={1.55}
                        />
                      </div>
                      <span className="font-outfit text-3xl font-semibold tracking-tight text-accent/90">
                        {step.n}
                      </span>
                    </div>

                    <div className="relative">
                      <div className="mb-4 h-px w-12 bg-white/20 transition-all duration-300 group-hover:w-16 group-hover:bg-[rgba(201,169,98,0.45)]" />
                      <h3 className="mb-2 text-lg font-outfit font-medium text-white">
                        {step.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-text-muted">
                        {step.description}
                      </p>
                    </div>
                  </article>
                </FadeInSection>
              );
            })}
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
                  <LotCard
                    lot={lot}
                    funding={fundingByLot[lot.id] ?? {
                      totalCases: lot.total_eligible_units,
                      allocatedCases: 0,
                      fundedPercent: 0,
                      availableCasesEquivalent: lot.total_eligible_units,
                    }}
                  />
                </FadeInSection>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-dim">
              Aún no hay lotes publicados. Los borradores internos no se muestran en esta superficie.
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
