'use client';

import React from 'react';
import Image from 'next/image';
import { Boxes, ChartNoAxesCombined, ScanLine } from 'lucide-react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';

export const InvestmentSpotlightSection: React.FC = () => {
  const { locale } = useLanguage();

  const copy = locale === 'es'
    ? {
        eyebrow: 'Producto destacado · CTG Craft Beer Inversión',
        title: 'Invierte en producción real.',
        highlight: 'Sigue el lote hasta su liquidación.',
        description:
          'CTG Craft Beer Inversión permite participar en lotes específicos de producción sin convertirse en accionista de Cervecería Cartagena. Cada inversión queda asociada a un lote y puede seguirse desde financiación, producción e inventario hasta venta y liquidación, de acuerdo con las condiciones publicadas para ese lote.',
        cta: 'Explorar CTG Craft Beer Inversión',
        secondaryCta: 'Cómo funciona',
        imageAlt: 'Botella Hefeweizen de CTG Craft Beer',
        signals: [
          { label: 'Inversión por lotes', detail: 'Capital asociado a producción identificable', icon: Boxes },
          { label: 'Trazabilidad operativa', detail: 'Seguimiento desde producción hasta venta', icon: ScanLine },
          { label: 'Liquidación documentada', detail: 'Resultado calculado según cada lote', icon: ChartNoAxesCombined },
        ],
      }
    : {
        eyebrow: 'Featured product · CTG Craft Beer Investment',
        title: 'Invest in real production.',
        highlight: 'Track the batch through settlement.',
        description:
          'CTG Craft Beer Investment lets participants fund specific production batches without becoming shareholders of Cervecería Cartagena. Each investment is tied to an identifiable batch and can be followed from funding, production and inventory through sale and settlement under that batch’s published terms.',
        cta: 'Explore CTG Craft Beer Investment',
        secondaryCta: 'How it works',
        imageAlt: 'CTG Craft Beer Hefeweizen bottle',
        signals: [
          { label: 'Batch-based investment', detail: 'Capital linked to identifiable production', icon: Boxes },
          { label: 'Operational traceability', detail: 'Track production through final sale', icon: ScanLine },
          { label: 'Documented settlement', detail: 'Outcome calculated for each batch', icon: ChartNoAxesCombined },
        ],
      };

  return (
    <section
      className="relative overflow-hidden border-y border-white/[0.07] py-18 sm:py-22 md:py-24 lg:py-28"
      style={{ backgroundColor: '#070707' }}
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute -left-44 top-1/2 h-[620px] w-[620px] -translate-y-1/2 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(201,169,98,0.08), transparent 68%)' }}
        />
        <div
          className="absolute inset-y-0 right-0 w-[58%] opacity-[0.13]"
          style={{
            backgroundImage: 'linear-gradient(rgba(212,162,89,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,89,0.08) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'linear-gradient(to left, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to left, black, transparent)',
          }}
        />
      </div>

      <Container className="relative z-10">
        <div className="grid items-stretch gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14 xl:gap-20">
          <FadeInSection direction="left">
            <div className="relative min-h-[390px] overflow-hidden border border-white/[0.08] bg-black sm:min-h-[500px] lg:min-h-[620px]">
              <Image
                src="/images/inversion/ctg-craft-beer-hefeweizen.webp"
                alt={copy.imageAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 44vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-transparent" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <div className="inline-flex items-center gap-2 border border-accent/25 bg-black/80 px-3 py-2.5 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                  <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-accent">CTG Craft Beer · Cartagena</span>
                </div>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection direction="right" delay={0.06}>
            <div className="flex h-full flex-col justify-center py-2 lg:py-8">
              <div className="mb-5 flex items-center gap-3">
                <span className="h-px w-8 bg-accent/70" aria-hidden="true" />
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-accent">{copy.eyebrow}</span>
              </div>

              <h2 className="mb-6 font-outfit text-3xl font-semibold leading-[1.03] tracking-[-0.035em] sm:text-4xl md:text-5xl lg:text-[3.4rem]">
                <span className="text-white">{copy.title}</span>
                <br />
                <span className="text-accent">{copy.highlight}</span>
              </h2>

              <p className="mb-8 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">
                {copy.description}
              </p>

              <div className="mb-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {copy.signals.map(({ icon: Icon, label, detail }) => (
                  <div key={label} className="flex min-w-0 items-start gap-3 border border-white/[0.075] bg-white/[0.015] p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/25 bg-accent/[0.035]">
                      <Icon className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.45} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <span className="block text-xs font-semibold uppercase leading-tight tracking-[0.09em] text-white">{label}</span>
                      <span className="mt-1.5 block text-xs leading-relaxed text-text-dim">{detail}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Button href="/inversion" variant="primary" size="md" arrow>
                  {copy.cta}
                </Button>
                <Button href="/inversion/como-funciona" variant="ghost" size="md" arrow>
                  {copy.secondaryCta}
                </Button>
              </div>
            </div>
          </FadeInSection>
        </div>
      </Container>
    </section>
  );
};
