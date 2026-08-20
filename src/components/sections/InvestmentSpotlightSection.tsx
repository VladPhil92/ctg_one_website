'use client';

import React from 'react';
import Image from 'next/image';
import { Boxes, ChartNoAxesCombined, ScanLine } from 'lucide-react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from '@/styles/CommandCenter.module.css';
import publicStyles from '@/styles/PublicCommandCenter.module.css';

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
        imageCaption: 'Producción y comercialización real',
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
        imageCaption: 'Real production and sales',
        signals: [
          { label: 'Batch-based investment', detail: 'Capital linked to identifiable production', icon: Boxes },
          { label: 'Operational traceability', detail: 'Track production through final sale', icon: ScanLine },
          { label: 'Documented settlement', detail: 'Outcome calculated for each batch', icon: ChartNoAxesCombined },
        ],
      };

  return (
    <section
      className={`${styles.theme} relative overflow-hidden border-y border-white/[0.055] py-20 sm:py-24 md:py-28 lg:py-32`}
      style={{ backgroundColor: '#030507' }}
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -left-44 top-1/2 h-[640px] w-[640px] -translate-y-1/2 rounded-full" style={{ background: 'radial-gradient(circle, rgba(214,174,86,0.075), transparent 68%)' }} />
        <div className="absolute -right-40 top-[12%] h-[580px] w-[580px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(36,140,255,0.055), transparent 70%)' }} />
        <div
          className="absolute inset-y-0 right-0 w-[62%] opacity-[0.14]"
          style={{
            backgroundImage: 'linear-gradient(rgba(36,140,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(214,174,86,0.045) 1px, transparent 1px)',
            backgroundSize: '68px 68px',
            maskImage: 'linear-gradient(to left, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to left, black, transparent)',
          }}
        />
      </div>

      <Container size="large" className="relative z-10">
        <div className="grid items-stretch gap-7 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 xl:gap-16">
          <FadeInSection direction="left">
            <div className={`${styles.commandPanel} relative overflow-hidden p-2`}>
              <div className={`${publicStyles.mediaFrame} ${publicStyles.mediaSpotlight} relative w-full`}>
                <Image
                  src="/images/inversion/ctg-craft-beer-hefeweizen.webp"
                  alt={copy.imageAlt}
                  fill
                  quality={90}
                  sizes="(max-width: 640px) 94vw, (max-width: 1024px) 88vw, 44vw"
                  className={`${publicStyles.mediaImage} ${publicStyles.focusHefeweizen}`}
                  data-ctg-photo="high-fidelity-source"
                />
                <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#030507] via-black/10 to-transparent" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 z-[3] p-6 sm:p-8">
                  <div className="border-t border-white/[.09] pt-5">
                    <span className="block text-[11px] font-semibold uppercase tracking-[.16em] text-[#f1c75b]">CTG Craft Beer</span>
                    <span className="mt-1 block text-xs text-text-muted">{copy.imageCaption}</span>
                  </div>
                </div>
              </div>
            </div>
          </FadeInSection>

          <FadeInSection direction="right" delay={0.06}>
            <div className="flex h-full flex-col justify-center py-3 lg:py-8">
              <div className="mb-5 flex items-center gap-3">
                <span className={`h-px w-10 ${styles.goldTrace}`} aria-hidden="true" />
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#f1c75b]">{copy.eyebrow}</span>
              </div>

              <h2 className="mb-6 font-outfit text-3xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-4xl md:text-5xl lg:text-[3.5rem]">
                <span className="text-white">{copy.title}</span>
                <br />
                <span className="bg-gradient-to-r from-[#f1c75b] via-[#d6ae56] to-[#b88932] bg-clip-text text-transparent">{copy.highlight}</span>
              </h2>

              <p className="mb-8 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">
                {copy.description}
              </p>

              <div className="mb-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {copy.signals.map(({ icon: Icon, label, detail }) => (
                  <div key={label} className={`${styles.techCard} min-w-0 p-4 sm:p-5`}>
                    <span className="mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d6ae56]/25 bg-[#d6ae56]/[0.035]">
                      <Icon className="h-4 w-4 shrink-0 text-[#f1c75b]" strokeWidth={1.45} aria-hidden="true" />
                    </span>
                    <span className="block text-xs font-semibold uppercase leading-tight tracking-[0.09em] text-white">{label}</span>
                    <span className="mt-2 block text-xs leading-relaxed text-text-dim">{detail}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Button href="/inversion" variant="primary" size="md" arrow className="rounded-xl border border-[#ffd56a]/25 bg-[#d6ae56] shadow-[0_0_28px_rgba(214,174,86,.10)] hover:-translate-y-px">
                  {copy.cta}
                </Button>
                <Button href="/inversion/como-funciona" variant="ghost" size="md" arrow className="rounded-xl border border-[#248cff]/20 bg-[#071a32]/20 hover:border-[#248cff]/45 hover:bg-[#071a32]/35">
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
