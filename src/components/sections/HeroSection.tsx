'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Button } from '@/components/ui/Button';
import { HERO } from '@/data/content';
import { getCapabilityProof, getPublicProofStatus, type PublicProofStatus } from '@/data/technology-proof';
import { BlockchainNetwork } from '@/components/BlockchainNetwork';
import {
  Building2,
  CalendarDays,
  Cpu,
  Layers3,
  MapPin,
  MessageCircle,
  Network,
  Orbit,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from '@/styles/CommandCenter.module.css';

const capabilityRail = [
  { id: 'identity-auth', code: 'IDN-01', icon: Cpu, en: 'Identity platform', es: 'Plataforma de identidad' },
  { id: 'data-security', code: 'SEC-02', icon: ShieldCheck, en: 'Data & security', es: 'Datos y seguridad' },
  { id: 'delivery-platform', code: 'INF-03', icon: Network, en: 'Delivery infrastructure', es: 'Infraestructura de entrega' },
  { id: 'ai-layer', code: 'AIX-04', icon: Sparkles, en: 'Applied AI', es: 'IA aplicada' },
].map((item) => ({ ...item, status: getPublicProofStatus(getCapabilityProof(item.id)) }));

const METRIC_ICONS: Record<string, LucideIcon> = {
  building: Building2,
  layers: Layers3,
  calendar: CalendarDays,
  location: MapPin,
};

const WHATSAPP_CONVERSATION_URL =
  'https://wa.me/573186428218?text=Hola%20CTG%20One%2C%20quiero%20conocer%20m%C3%A1s%20sobre%20su%20ecosistema%20y%20servicios.';

function localizedStatus(status: PublicProofStatus, locale: 'en' | 'es') {
  if (locale === 'en') return status;
  const labels: Record<PublicProofStatus, string> = {
    LIVE: 'OPERATIVO',
    BETA: 'BETA',
    PARTIAL: 'PARCIAL',
    'IN DEVELOPMENT': 'EN DESARROLLO',
    ROADMAP: 'HOJA DE RUTA',
  };
  return labels[status];
}

function statusTone(status: PublicProofStatus) {
  if (status === 'LIVE') return 'bg-[#27d17f] shadow-[0_0_12px_rgba(39,209,127,.75)]';
  if (status === 'BETA' || status === 'PARTIAL' || status === 'IN DEVELOPMENT' || status === 'ROADMAP') {
    return 'bg-[#e8b84c] shadow-[0_0_12px_rgba(232,184,76,.6)]';
  }
  return 'bg-[#f05c63] shadow-[0_0_12px_rgba(240,92,99,.65)]';
}

export const HeroSection: React.FC = () => {
  const { locale, t } = useLanguage();
  const description = locale === 'es'
    ? 'CTG One Technology desarrolla software propietario e infraestructura digital para su propio ecosistema empresarial. Nuestra capa productiva actual combina aplicaciones, autenticación, datos, seguridad, CI/CD y plataformas transaccionales; las capacidades avanzadas de IA se encuentran en desarrollo y se publicarán como activas únicamente cuando exista implementación verificable.'
    : 'CTG One Technology builds proprietary software and digital infrastructure for its own business ecosystem. Our current production layer combines applications, authentication, data, security, CI/CD, and transactional platforms; advanced AI capabilities remain in development and will be presented as live only when implementation is verifiable.';

  return (
    <section
      id="home"
      className={`${styles.theme} ${styles.heroShell} relative overflow-hidden pb-12 pt-28 sm:pb-16 sm:pt-32 md:pt-36 lg:min-h-screen lg:pb-16 lg:pt-36 xl:pt-40`}
    >
      <div className={styles.heroSweep} aria-hidden="true" />
      <div className="pointer-events-none absolute left-0 top-[18%] hidden h-px w-[24%] bg-gradient-to-r from-[#248cff]/40 via-[#d6ae56]/20 to-transparent lg:block" aria-hidden="true" />
      <div className="pointer-events-none absolute right-0 top-[28%] hidden h-px w-[18%] bg-gradient-to-l from-[#248cff]/35 via-[#d6ae56]/20 to-transparent lg:block" aria-hidden="true" />

      <Container size="large" className="relative z-10">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 xl:grid-cols-[0.84fr_1.16fr] xl:gap-12 2xl:gap-16">
          <div className="order-1 max-w-2xl">
            <FadeInSection delay={0.02}>
              <div className={`${styles.eyebrow} mb-6 max-w-full`}>
                <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[#ffd56a]/30" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#f1c75b] shadow-[0_0_11px_rgba(241,199,91,.8)]" />
                </span>
                <span className="min-w-0 text-[11px] font-semibold uppercase tracking-[.16em] text-[#f1c75b] sm:text-xs">
                  {locale === 'es' ? 'Infraestructura digital de próxima generación' : 'Next-generation digital infrastructure'}
                </span>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.05}>
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[.2em] text-text-dim sm:text-[11px]">
                {t(HERO.badge)} · CTG-CORE / CARTAGENA
              </p>
            </FadeInSection>

            <FadeInSection delay={0.08}>
              <h1 className="mb-6 max-w-[780px] font-outfit text-[clamp(3rem,5.4vw,5.7rem)] font-semibold leading-[.96] tracking-[-0.05em] sm:mb-7">
                <span className="text-white">{t(HERO.title)}</span>
                <br />
                <span className="bg-gradient-to-r from-[#f1c75b] via-[#d6ae56] to-[#b88932] bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(214,174,86,.08)]">
                  {t(HERO.titleHighlight)}
                </span>
              </h1>
            </FadeInSection>

            <FadeInSection delay={0.12}>
              <div className="mb-4 border-l-2 border-[#d6ae56]/70 pl-4 sm:pl-5">
                <p className="max-w-xl text-base font-medium leading-relaxed text-text-secondary sm:text-lg">
                  {t(HERO.subtitle)}
                </p>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.16}>
              <p className="mb-8 max-w-[620px] text-sm leading-[1.72] text-text-muted sm:mb-9 sm:text-base">
                {description}
              </p>
            </FadeInSection>

            <FadeInSection delay={0.2}>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Button
                  href="/ecosystem"
                  variant="primary"
                  size="md"
                  arrow
                  icon={<Orbit className="h-4 w-4" aria-hidden="true" />}
                  iconPosition="left"
                  className="rounded-xl border border-[#ffd56a]/35 bg-[#d6ae56] px-6 shadow-[0_0_34px_rgba(214,174,86,.12)] hover:-translate-y-px hover:bg-[#f1c75b]"
                >
                  {t(HERO.ctaPrimary)}
                </Button>
                <Button
                  href={WHATSAPP_CONVERSATION_URL}
                  variant="secondary"
                  size="md"
                  icon={<MessageCircle className="h-4 w-4 text-[#248cff]" aria-hidden="true" />}
                  iconPosition="left"
                  className="rounded-xl border-[#248cff]/45 bg-[#07111d]/55 px-6 hover:-translate-y-px hover:border-[#248cff]/70 hover:bg-[#071a32]/55"
                >
                  {t(HERO.ctaSecondary)}
                </Button>
              </div>
            </FadeInSection>
          </div>

          <div className="order-2 flex min-w-0 justify-center lg:justify-end">
            <FadeInSection delay={0.1} direction="right" className="flex w-full justify-center lg:justify-end">
              <div className={`${styles.networkField} w-full max-w-[680px] xl:max-w-[760px]`}>
                <div className="pointer-events-none absolute left-[3%] top-[9%] hidden font-mono text-[8px] uppercase tracking-[.14em] text-[#248cff]/50 sm:block" aria-hidden="true">
                  CTG / NETWORK CORE<br />LAT 10.3910 N<br />LON 75.4794 W
                </div>
                <div className="pointer-events-none absolute bottom-[7%] left-[2%] hidden items-center gap-2 font-mono text-[8px] uppercase tracking-[.14em] text-text-dim sm:flex" aria-hidden="true">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#27d17f] shadow-[0_0_10px_rgba(39,209,127,.65)]" />
                  Core online
                </div>
                <BlockchainNetwork size="lg" interactive />
                <div className={styles.telemetryPanel} aria-hidden="true">
                  <span className="text-[#248cff]/60">Sistema</span>
                  <strong className="font-mono font-medium text-[#27d17f]">EN LÍNEA</strong>
                  <div className={styles.telemetryLine} />
                  <div className="grid grid-cols-5 items-end gap-1 opacity-70">
                    {[16, 28, 22, 38, 30].map((height, index) => (
                      <span key={index} className="block w-full bg-gradient-to-t from-[#248cff]/25 to-[#d6ae56]/50" style={{ height }} />
                    ))}
                  </div>
                  <div className={styles.telemetryLine} />
                  <span className="font-mono text-[8px] leading-relaxed">SYNC 100%<br />NODE 08/08<br />LINK STABLE</span>
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>

        <FadeInSection delay={0.24}>
          <div className={`${styles.commandPanel} mt-8 lg:mt-6 xl:mt-8`}>
            <div className="grid grid-cols-2 lg:grid-cols-4">
              {HERO.metrics.map((metric, index) => {
                const Icon = METRIC_ICONS[metric.icon] ?? Layers3;
                return (
                  <div
                    key={`${metric.label}-${metric.value}`}
                    className={`${styles.metricCell} flex min-h-[112px] items-center gap-4 border-b border-r border-white/[.06] px-4 py-5 sm:px-6 lg:min-h-[126px] lg:border-b-0 lg:px-7 ${index % 2 === 1 ? 'border-r-0 lg:border-r' : ''} ${index === HERO.metrics.length - 1 ? 'lg:border-r-0' : ''}`}
                  >
                    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d6ae56]/25 bg-[#d6ae56]/[.035] text-[#f1c75b] sm:h-14 sm:w-14">
                      <span className="absolute inset-[6px] rounded-lg border border-[#248cff]/[.08]" aria-hidden="true" />
                      <Icon className="relative h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.35} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <span className="mb-1 block font-outfit text-2xl font-semibold leading-none text-[#f1c75b] sm:text-3xl">{t(metric.value)}</span>
                      <span className="block text-[11px] font-semibold uppercase tracking-[.11em] text-text-muted sm:text-xs">{t(metric.label)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 border-t border-white/[.07] sm:grid-cols-2 xl:grid-cols-4">
              {capabilityRail.map(({ id, code, icon: Icon, en, es, status }, index) => (
                <div
                  key={id}
                  className={`${styles.statusCell} flex min-h-[76px] items-center gap-3 border-b border-white/[.055] px-4 py-4 sm:border-r sm:px-5 xl:border-b-0 ${index % 2 === 1 ? 'sm:border-r-0 xl:border-r' : ''} ${index === capabilityRail.length - 1 ? 'xl:border-r-0' : ''}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d6ae56]/20 bg-black/20 text-[#d6ae56]">
                    <Icon className="h-4 w-4" strokeWidth={1.45} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-mono text-[8px] tracking-[.13em] text-[#248cff]/60">{code}</span>
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusTone(status)}`} aria-hidden="true" />
                    </div>
                    <span className="block text-[11px] font-semibold uppercase tracking-[.08em] text-text-secondary sm:text-xs">
                      {locale === 'es' ? es : en}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[.1em] text-text-dim">
                      {localizedStatus(status, locale)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeInSection>
      </Container>
    </section>
  );
};
