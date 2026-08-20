'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { HERO } from '@/data/content';
import { getCapabilityProof, getPublicProofStatus, type PublicProofStatus } from '@/data/technology-proof';
import { BlockchainNetwork } from '@/components/BlockchainNetwork';
import { Cpu, Sparkles, Network, ShieldCheck, RadioTower } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const capabilityRail = [
  { id: 'identity-auth', code: 'IDN-01', icon: Cpu, en: 'Identity platform', es: 'Plataforma de identidad' },
  { id: 'data-security', code: 'SEC-02', icon: ShieldCheck, en: 'Data & security', es: 'Datos y seguridad' },
  { id: 'delivery-platform', code: 'INF-03', icon: Network, en: 'Delivery infrastructure', es: 'Infraestructura de entrega' },
  { id: 'ai-layer', code: 'AIX-04', icon: Sparkles, en: 'Applied AI', es: 'IA aplicada' },
].map((item) => ({ ...item, status: getPublicProofStatus(getCapabilityProof(item.id)) }));

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

export const HeroSection: React.FC = () => {
  const { locale, t } = useLanguage();
  const description = locale === 'es'
    ? 'CTG One Technology desarrolla software propietario e infraestructura digital para su propio ecosistema empresarial. Nuestra capa productiva actual combina aplicaciones, autenticación, datos, seguridad, CI/CD y plataformas transaccionales; las capacidades avanzadas de IA se encuentran en desarrollo y se publicarán como activas únicamente cuando exista implementación verificable.'
    : 'CTG One Technology builds proprietary software and digital infrastructure for its own business ecosystem. Our current production layer combines applications, authentication, data, security, CI/CD, and transactional platforms; advanced AI capabilities remain in development and will be presented as live only when implementation is verifiable.';

  return (
    <section
      id="home"
      className="relative flex min-h-0 items-center overflow-hidden pb-12 pt-24 sm:pb-16 sm:pt-28 md:pt-32 lg:min-h-screen lg:pb-20 lg:pt-36"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-32 right-[-10%] h-[700px] w-[700px] md:h-[980px] md:w-[980px]"
          style={{ background: 'radial-gradient(circle, rgba(212,162,89,0.075) 0%, rgba(212,162,89,0.022) 34%, transparent 68%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.17]"
          style={{
            backgroundImage: 'linear-gradient(rgba(212,162,89,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,89,0.055) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'linear-gradient(to bottom, black 0%, black 72%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 72%, transparent 100%)',
          }}
        />
        <div
          className="absolute bottom-[-14%] left-[18%] h-[45%] w-[75%] opacity-55"
          style={{
            backgroundImage: 'repeating-radial-gradient(ellipse at center, transparent 0 13px, rgba(212,162,89,0.08) 14px 14.7px, transparent 15px 26px)',
            transform: 'perspective(520px) rotateX(68deg) scaleX(1.35)',
            transformOrigin: 'center bottom',
            maskImage: 'linear-gradient(to top, black, transparent 76%)',
            WebkitMaskImage: 'linear-gradient(to top, black, transparent 76%)',
          }}
        />
        <div className="absolute left-[8%] top-[18%] h-40 w-px bg-gradient-to-b from-transparent via-accent/30 to-transparent" />
        <div className="absolute inset-x-0 top-[30%] h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
      </div>

      <Container className="relative z-10">
        <div className="grid grid-cols-1 items-center gap-8 sm:gap-10 md:gap-12 lg:grid-cols-[0.94fr_1.06fr] lg:gap-14 xl:gap-18">
          <div className="order-1 max-w-2xl">
            <FadeInSection delay={0.02}>
              <div className="mb-4 inline-flex items-center gap-2.5 rounded-full border border-accent/15 bg-accent/[.035] px-3.5 py-2 text-[9px] font-semibold uppercase tracking-[.18em] text-accent">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-accent/35" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                {locale === 'es' ? 'Núcleo tecnológico activo' : 'Technology core online'}
              </div>
            </FadeInSection>

            <FadeInSection delay={0.04}>
              <Badge variant="accent" className="mb-5 sm:mb-7">{t(HERO.badge)}</Badge>
            </FadeInSection>

            <FadeInSection delay={0.08}>
              <h1 className="mb-6 text-4xl font-outfit font-semibold leading-[1.02] tracking-[-0.035em] sm:mb-7 sm:text-5xl md:text-6xl lg:text-[4rem] xl:text-[4.35rem]">
                <span className="text-white">{t(HERO.title)}</span>
                <br />
                <span className="text-accent">{t(HERO.titleHighlight)}</span>
              </h1>
            </FadeInSection>

            <FadeInSection delay={0.12}>
              <p className="mb-3 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg">{t(HERO.subtitle)}</p>
            </FadeInSection>

            <FadeInSection delay={0.16}>
              <p className="mb-8 max-w-xl text-sm leading-relaxed text-text-muted sm:mb-9 sm:text-base">{description}</p>
            </FadeInSection>

            <FadeInSection delay={0.2}>
              <div className="mb-9 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:gap-4">
                <Button href="/ecosystem" variant="primary" size="md" arrow>{t(HERO.ctaPrimary)}</Button>
                <Button href={WHATSAPP_CONVERSATION_URL} variant="secondary" size="md">{t(HERO.ctaSecondary)}</Button>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.24}>
              <div className="mb-8 rounded-[22px] border border-white/[0.075] bg-[#07090c]/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.035),0_24px_70px_rgba(0,0,0,.22)] backdrop-blur-sm">
                <div className="mb-2 flex items-center justify-between px-2 pb-2">
                  <div className="flex items-center gap-2 text-[8px] font-semibold uppercase tracking-[.18em] text-text-dim">
                    <RadioTower size={12} className="text-accent" />
                    {locale === 'es' ? 'Matriz de capacidades' : 'Capability matrix'}
                  </div>
                  <span className="font-mono text-[8px] tracking-[.14em] text-accent/55">CTG-CORE/04</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {capabilityRail.map(({ id, code, icon: Icon, en, es, status }) => (
                    <div
                      key={id}
                      className="group relative min-h-[88px] overflow-hidden rounded-xl border border-white/[0.065] bg-white/[0.018] p-4 transition-colors duration-300 hover:border-accent/25 hover:bg-accent/[.025]"
                    >
                      <div className="absolute right-[-24px] top-[-24px] h-20 w-20 rounded-full bg-accent/[.035] blur-xl transition-opacity group-hover:bg-accent/[.07]" aria-hidden="true" />
                      <div className="relative flex h-full items-start gap-3.5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/[0.035]">
                          <Icon className="h-[17px] w-[17px] shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex items-center justify-between gap-3">
                            <span className="font-mono text-[8px] tracking-[.14em] text-accent/55">{code}</span>
                            <span className="shrink-0 rounded-full border border-white/[.07] bg-black/20 px-2 py-1 text-[7px] font-semibold uppercase tracking-[.12em] text-text-dim">
                              {localizedStatus(status, locale)}
                            </span>
                          </div>
                          <span className="block text-[12px] font-semibold uppercase tracking-[0.075em] text-text-secondary leading-snug sm:text-[13px]">
                            {locale === 'es' ? es : en}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.28}>
              <div className="grid grid-cols-2 gap-5 border-t border-white/[0.065] pt-6 sm:grid-cols-4 sm:gap-8 sm:pt-7">
                {HERO.metrics.map((metric, idx) => (
                  <div key={idx} className="min-w-0">
                    <span className="mb-1 block text-xl font-outfit font-medium text-white sm:text-2xl">{t(metric.value)}</span>
                    <span className="block text-[11px] sm:text-xs font-medium uppercase tracking-[0.1em] text-text-dim leading-tight">{t(metric.label)}</span>
                  </div>
                ))}
              </div>
            </FadeInSection>
          </div>

          <div className="order-2 flex min-w-0 justify-center pt-2 lg:justify-end lg:pt-0">
            <FadeInSection delay={0.12} direction="right" className="flex w-full justify-center lg:justify-end">
              <div className="relative w-full max-w-[410px] sm:max-w-[490px] lg:max-w-[540px]">
                <div className="relative overflow-hidden rounded-[30px] border border-white/[.065] bg-[#05070a]/45 p-3 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.03),0_35px_110px_rgba(0,0,0,.3)] backdrop-blur-sm">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/45 to-transparent" aria-hidden="true" />
                  <div className="flex items-center justify-between px-2 pb-1 pt-1 text-[8px] uppercase tracking-[.16em] text-text-dim">
                    <span>{locale === 'es' ? 'Grafo del ecosistema' : 'Ecosystem graph'}</span>
                    <span className="font-mono text-accent/60">NODE-MAP / LIVE</span>
                  </div>
                  <div
                    className="absolute inset-[12%] rounded-full pointer-events-none"
                    style={{ boxShadow: '0 0 140px rgba(212,162,89,0.07), inset 0 0 90px rgba(212,162,89,0.025)' }}
                    aria-hidden="true"
                  />
                  <BlockchainNetwork size="lg" interactive />
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </Container>

      <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 sm:block" aria-hidden="true">
        <div className="flex flex-col items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.2em] text-text-dim">{locale === 'es' ? 'Desplazar' : 'Scroll'}</span>
          <div className="h-7 w-px bg-gradient-to-b from-accent/30 to-transparent" />
        </div>
      </div>
    </section>
  );
};