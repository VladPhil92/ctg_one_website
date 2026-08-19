'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { HERO } from '@/data/content';
import { getCapabilityProof, getPublicProofStatus } from '@/data/technology-proof';
import { BlockchainNetwork } from '@/components/BlockchainNetwork';
import { Cpu, Sparkles, Network, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const capabilityRail = [
  { id: 'identity-auth', icon: Cpu, en: 'Identity platform', es: 'Plataforma de identidad' },
  { id: 'data-security', icon: ShieldCheck, en: 'Data & security', es: 'Datos y seguridad' },
  { id: 'delivery-platform', icon: Network, en: 'Delivery infrastructure', es: 'Infraestructura de entrega' },
  { id: 'ai-layer', icon: Sparkles, en: 'Applied AI', es: 'IA aplicada' },
].map((item) => ({ ...item, status: getPublicProofStatus(getCapabilityProof(item.id)) }));

const WHATSAPP_CONVERSATION_URL =
  'https://wa.me/573186428218?text=Hola%20CTG%20One%2C%20quiero%20conocer%20m%C3%A1s%20sobre%20su%20ecosistema%20y%20servicios.';

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
          style={{ background: 'radial-gradient(circle, rgba(212,162,89,0.065) 0%, rgba(212,162,89,0.018) 34%, transparent 68%)' }}
        />
        <div
          className="absolute bottom-[-14%] left-[18%] h-[45%] w-[75%] opacity-50"
          style={{
            backgroundImage: 'repeating-radial-gradient(ellipse at center, transparent 0 13px, rgba(212,162,89,0.08) 14px 14.7px, transparent 15px 26px)',
            transform: 'perspective(520px) rotateX(68deg) scaleX(1.35)',
            transformOrigin: 'center bottom',
            maskImage: 'linear-gradient(to top, black, transparent 76%)',
            WebkitMaskImage: 'linear-gradient(to top, black, transparent 76%)',
          }}
        />
        <div className="absolute inset-x-0 top-[30%] h-px bg-gradient-to-r from-transparent via-white/[0.035] to-transparent" />
      </div>

      <Container className="relative z-10">
        <div className="grid grid-cols-1 items-center gap-8 sm:gap-10 md:gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 xl:gap-20">
          <div className="order-1 max-w-2xl">
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
              <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-y border-white/[0.075] py-5 xl:grid-cols-4">
                {capabilityRail.map(({ id, icon: Icon, en, es, status }) => (
                  <div key={id} className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/20 bg-accent/[0.035]">
                      <Icon className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 text-[11px] sm:text-xs font-medium uppercase tracking-[0.08em] text-text-dim leading-tight">
                      {locale === 'es' ? es : en} · {status}
                    </span>
                  </div>
                ))}
              </div>
            </FadeInSection>

            <FadeInSection delay={0.28}>
              <div className="grid grid-cols-2 gap-5 pt-6 sm:grid-cols-4 sm:gap-8 sm:pt-7">
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
              <div className="relative w-full max-w-[390px] sm:max-w-[470px] lg:max-w-[520px]">
                <div
                  className="absolute inset-[8%] rounded-full pointer-events-none"
                  style={{ boxShadow: '0 0 120px rgba(212,162,89,0.055), inset 0 0 80px rgba(212,162,89,0.02)' }}
                  aria-hidden="true"
                />
                <BlockchainNetwork size="lg" interactive />
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
