'use client';

import React from 'react';
import Image from 'next/image';
import { Beer, Building2, CalendarDays, Layers3, MapPin, PawPrint } from 'lucide-react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Button } from '@/components/ui/Button';
import { HERO } from '@/data/content';
import { getCapabilityProof, getPublicProofStatus } from '@/data/technology-proof';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from '@/styles/CommandCenter.module.css';

const METRIC_ICONS = {
  building: Building2,
  layers: Layers3,
  calendar: CalendarDays,
  location: MapPin,
} as const;

export const HeroSection: React.FC = () => {
  const { locale, t } = useLanguage();
  const es = locale === 'es';

  // Canonical maturity remains attached to the Hero contract without forcing
  // technical status language into the first consumer-facing message.
  const identityStatus = getPublicProofStatus(getCapabilityProof('identity-auth'));
  const dataStatus = getPublicProofStatus(getCapabilityProof('data-security'));
  const aiStatus = getPublicProofStatus(getCapabilityProof('ai-layer'));

  const eyebrow = es ? 'Empresa tecnológica · Cartagena' : 'Technology company · Cartagena';
  const description = es
    ? 'Creamos software y soluciones digitales para nuestros propios negocios, productos y plataformas. Desde cerveza artesanal hasta salud, educación y servicios, usamos tecnología para conectar operaciones y construir mejores experiencias.'
    : 'We build software and digital products for our own businesses, products and platforms. From craft beer to health, education and services, we use technology to connect operations and create better experiences.';

  const productLabel = es ? 'Productos reales' : 'Real products';
  const craftLabel = es ? 'Cerveza artesanal' : 'Craft beer';
  const nvetLabel = es ? 'App veterinaria' : 'Veterinary app';

  return (
    <section
      id="home"
      data-identity-status={identityStatus}
      data-data-status={dataStatus}
      data-ai-status={aiStatus}
      className={`${styles.theme} ${styles.heroShell} relative overflow-hidden pb-16 pt-28 sm:pb-20 sm:pt-32 md:pt-36 lg:min-h-screen lg:pb-20 lg:pt-36 xl:pt-40`}
    >
      <div className={styles.heroSweep} aria-hidden="true" />
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute right-[4%] top-[18%] h-[520px] w-[520px] rounded-full bg-[#248cff]/[0.045] blur-3xl" />
        <div className="absolute left-[18%] top-[36%] h-[420px] w-[420px] rounded-full bg-[#d6ae56]/[0.04] blur-3xl" />
      </div>

      <Container size="large" className="relative z-10">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12 xl:gap-16">
          <div className="max-w-2xl">
            <FadeInSection delay={0.02}>
              <div className={`${styles.eyebrow} mb-6 max-w-full`}>
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#ffd56a]/25" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f1c75b] shadow-[0_0_9px_rgba(241,199,91,.6)]" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[.15em] text-[#f1c75b] sm:text-xs">{eyebrow}</span>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.08}>
              <h1 className="mb-7 max-w-[780px] font-outfit text-[clamp(3rem,5.4vw,5.7rem)] font-semibold leading-[.96] tracking-[-0.05em]">
                <span className="text-white">{es ? 'Tecnología creada para' : t(HERO.title)}</span>
                <br />
                <span className="bg-gradient-to-r from-[#f1c75b] via-[#d6ae56] to-[#b88932] bg-clip-text text-transparent">
                  {es ? 'negocios reales.' : t(HERO.titleHighlight)}
                </span>
              </h1>
            </FadeInSection>

            <FadeInSection delay={0.12}>
              <div className="mb-5 border-l border-[#d6ae56]/65 pl-4 sm:pl-5">
                <p className="max-w-xl text-base font-medium leading-relaxed text-text-secondary sm:text-lg">
                  {es ? 'Construida y probada dentro de nuestras propias empresas.' : t(HERO.subtitle)}
                </p>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.16}>
              <p className="mb-9 max-w-[640px] text-sm leading-[1.75] text-text-muted sm:text-base">{description}</p>
            </FadeInSection>

            <FadeInSection delay={0.2}>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Button href="/products" variant="primary" size="md" arrow className="rounded-xl border border-[#ffd56a]/30 bg-[#d6ae56] px-6 shadow-[0_0_28px_rgba(214,174,86,.1)] hover:-translate-y-px hover:bg-[#f1c75b]">
                  {es ? 'Conoce nuestros productos' : 'Explore our products'}
                </Button>
                <Button href="/ecosystem" variant="secondary" size="md" arrow className="rounded-xl border-[#248cff]/35 bg-[#07111d]/45 px-6 hover:-translate-y-px hover:border-[#248cff]/55 hover:bg-[#071a32]/45">
                  {es ? 'Explora nuestros negocios' : 'Explore our businesses'}
                </Button>
              </div>
            </FadeInSection>
          </div>

          <FadeInSection delay={0.1} direction="right">
            <div className="relative mx-auto w-full max-w-[720px]">
              <div className="mb-4 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-dim">
                <span>{productLabel}</span>
                <span className="text-[#d6ae56]">CTG ONE</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <a href="/craft-beer" className="group relative min-h-[420px] overflow-hidden rounded-[28px] border border-[#d6ae56]/20 bg-[#090805] shadow-[0_30px_80px_rgba(0,0,0,.35)]">
                  <Image src="/images/inversion/ctg-craft-beer-hefeweizen.webp" alt={es ? 'Botella Hefeweizen de CTG Craft Beer' : 'CTG Craft Beer Hefeweizen bottle'} fill unoptimized sizes="(min-width: 640px) 320px, 90vw" className="object-cover object-center transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#f1c75b]/25 bg-black/40 text-[#f1c75b]"><Beer size={18} /></div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-[#f1c75b]">{craftLabel}</div>
                    <div className="mt-1 text-xl font-semibold text-white">CTG Craft Beer</div>
                  </div>
                </a>

                <a href="/nvetcareapp" className="group relative min-h-[420px] overflow-hidden rounded-[28px] border border-[#34B27A]/20 bg-white shadow-[0_30px_80px_rgba(0,0,0,.28)]">
                  <div className="absolute inset-0 bg-gradient-to-b from-[#f8fffb] via-white to-[#edf8f2]" />
                  <Image src={es ? '/images/nvetcareapp/vet-tracking-mockup-es.png' : '/images/nvetcareapp/vet-tracking-mockup-en.png'} alt={es ? 'Concepto de la aplicación Nvet Care mostrando seguimiento de una visita veterinaria' : 'Nvet Care app concept showing veterinary visit tracking'} fill sizes="(min-width: 640px) 320px, 90vw" className="object-contain p-8 transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/90 to-transparent p-6 pt-16">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#34B27A]/20 bg-white text-[#34B27A]"><PawPrint size={18} /></div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-[#34B27A]">{nvetLabel}</div>
                    <div className="mt-1 text-xl font-semibold text-[#0D1B2A]">Nvet Care</div>
                  </div>
                </a>
              </div>
            </div>
          </FadeInSection>
        </div>

        <FadeInSection delay={0.24}>
          <div className={`${styles.commandPanel} mt-12`}>
            <div className="grid grid-cols-2 lg:grid-cols-4">
              {HERO.metrics.map((metric, index) => {
                const Icon = METRIC_ICONS[metric.icon as keyof typeof METRIC_ICONS] ?? Layers3;
                return (
                  <div key={`${metric.label}-${metric.value}`} className={`flex min-h-[112px] items-center gap-4 border-b border-r border-white/[.05] px-4 py-5 sm:px-6 lg:min-h-[126px] lg:border-b-0 lg:px-7 ${index % 2 === 1 ? 'border-r-0 lg:border-r' : ''} ${index === HERO.metrics.length - 1 ? 'lg:border-r-0' : ''}`}>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d6ae56]/20 bg-[#d6ae56]/[.025] text-[#f1c75b] sm:h-14 sm:w-14"><Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.3} aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <span className="mb-1 block font-outfit text-2xl font-semibold leading-none text-[#f1c75b] sm:text-3xl">{t(metric.value)}</span>
                      <span className="block text-[11px] font-semibold uppercase tracking-[.1em] text-text-muted sm:text-xs">{t(metric.label)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </FadeInSection>
      </Container>
    </section>
  );
};
