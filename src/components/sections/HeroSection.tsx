'use client';

import React from 'react';
import { Building2, CalendarDays, Layers3, MapPin } from 'lucide-react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Button } from '@/components/ui/Button';
import { BlockchainNetwork } from '@/components/BlockchainNetwork';
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

  const eyebrow = es ? 'Portal multiservicios · Una sola cuenta' : 'Multi-service portal · One account';
  const description = es
    ? 'Crea tu cuenta CTG One y accede con una sola identidad a nuestro portal multiservicios. Usa tu Wallet, conecta con Nvet Care y descubre productos, servicios y nuevas experiencias desde un mismo lugar.'
    : 'Create your CTG One account and access our multi-service portal with a single identity. Use your Wallet, connect with Nvet Care, and discover products, services and new experiences from one place.';

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
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 xl:grid-cols-[0.84fr_1.16fr] xl:gap-12 2xl:gap-16">
          <div className="order-1 max-w-2xl">
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
                <span className="text-white">{es ? 'Todo CTG One,' : 'All of CTG One,'}</span>
                <br />
                <span className="bg-gradient-to-r from-[#f1c75b] via-[#d6ae56] to-[#b88932] bg-clip-text text-transparent">
                  {es ? 'en un solo lugar.' : 'in one place.'}
                </span>
              </h1>
            </FadeInSection>

            <FadeInSection delay={0.12}>
              <div className="mb-5 border-l border-[#d6ae56]/65 pl-4 sm:pl-5">
                <p className="max-w-xl text-base font-medium leading-relaxed text-text-secondary sm:text-lg">
                  {es ? 'Productos, servicios, pagos y beneficios conectados para ti.' : 'Products, services, payments and benefits connected for you.'}
                </p>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.16}>
              <p className="mb-9 max-w-[640px] text-sm leading-[1.75] text-text-muted sm:text-base">{description}</p>
            </FadeInSection>

            <FadeInSection delay={0.2}>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Button href="/registro" variant="primary" size="md" arrow className="rounded-xl border border-[#ffd56a]/30 bg-[#d6ae56] px-6 shadow-[0_0_28px_rgba(214,174,86,.1)] hover:-translate-y-px hover:bg-[#f1c75b]">
                  {es ? 'Crear mi cuenta' : 'Create my account'}
                </Button>
                <Button href="/ecosystem" variant="secondary" size="md" arrow className="rounded-xl border-[#248cff]/35 bg-[#07111d]/45 px-6 hover:-translate-y-px hover:border-[#248cff]/55 hover:bg-[#071a32]/45">
                  {es ? 'Explorar CTG One' : 'Explore CTG One'}
                </Button>
              </div>
            </FadeInSection>
          </div>

          <div className="order-2 flex min-w-0 justify-center lg:justify-end">
            <FadeInSection delay={0.1} direction="right" className="flex w-full justify-center lg:justify-end">
              <div className="w-full max-w-[720px]">
                <div className="mb-1 flex items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-dim">
                  <span>{es ? 'Arquitectura del ecosistema' : 'Ecosystem architecture'}</span>
                  <span className="text-[#d6ae56]">CTG ONE CORE</span>
                </div>
                <div className={`${styles.networkField} w-full max-w-[680px] xl:max-w-[760px]`}>
                  <BlockchainNetwork size="lg" interactive />
                </div>
                <p className="mx-auto -mt-2 max-w-[560px] text-center text-[11px] leading-relaxed text-text-dim sm:text-xs">
                  {es
                    ? 'Selecciona un nodo para abrir la categoría correspondiente y explorar su proceso dentro del ecosistema.'
                    : 'Select a node to open its category and explore the corresponding process in the ecosystem.'}
                </p>
              </div>
            </FadeInSection>
          </div>
        </div>

        <FadeInSection delay={0.24}>
          <div className={`${styles.commandPanel} mt-10 lg:mt-6 xl:mt-8`}>
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
