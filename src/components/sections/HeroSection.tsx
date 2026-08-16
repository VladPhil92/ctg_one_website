'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { HERO, CONTACT } from '@/data/content';
import { BlockchainNetwork } from '@/components/BlockchainNetwork';
import { Cpu, Sparkles, Network, Layers3 } from 'lucide-react';

const capabilityRail = [
  { icon: Cpu, label: 'Software propio' },
  { icon: Sparkles, label: 'IA aplicada' },
  { icon: Network, label: 'Infraestructura' },
  { icon: Layers3, label: 'Ecosistema real' },
];

export const HeroSection: React.FC = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center pt-28 sm:pt-32 md:pt-36 pb-16 md:pb-20 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Advanced ambient system: subtle, lightweight and brand-consistent. */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div
          className="absolute -top-32 right-[-10%] w-[700px] h-[700px] md:w-[980px] md:h-[980px]"
          style={{ background: 'radial-gradient(circle, rgba(212,162,89,0.065) 0%, rgba(212,162,89,0.018) 34%, transparent 68%)' }}
        />
        <div
          className="absolute bottom-[-14%] left-[18%] w-[75%] h-[45%] opacity-50"
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
        <div className="grid grid-cols-1 lg:grid-cols-[0.92fr_1.08fr] gap-10 md:gap-14 lg:gap-16 xl:gap-20 items-center">
          {/* Left Column - no duplicate logo; the brand mark now anchors the ecosystem diagram. */}
          <div className="order-2 lg:order-1 max-w-2xl">
            <FadeInSection delay={0.08}>
              <Badge variant="accent" className="mb-6 sm:mb-8">
                {HERO.badge}
              </Badge>
            </FadeInSection>

            <FadeInSection delay={0.16}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4rem] xl:text-[4.35rem] font-outfit font-semibold leading-[1.02] mb-7 sm:mb-8 tracking-[-0.035em]">
                <span className="text-white">{HERO.title}</span>
                <br />
                <span className="text-accent">{HERO.titleHighlight}</span>
              </h1>
            </FadeInSection>

            <FadeInSection delay={0.24}>
              <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl mb-3 sm:mb-4">
                {HERO.subtitle}
              </p>
            </FadeInSection>

            <FadeInSection delay={0.3}>
              <p className="text-[13px] sm:text-sm text-text-muted leading-relaxed max-w-xl mb-9 sm:mb-11">
                {HERO.description}
              </p>
            </FadeInSection>

            <FadeInSection delay={0.36}>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-11 sm:mb-12">
                <Button href="/ecosystem" variant="primary" size="md" arrow>
                  {HERO.ctaPrimary}
                </Button>
                <Button href={`mailto:${CONTACT.email}`} variant="secondary" size="md">
                  {HERO.ctaSecondary}
                </Button>
              </div>
            </FadeInSection>

            <FadeInSection delay={0.44}>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-5 py-5 border-y border-white/[0.045]">
                {capabilityRail.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-accent/20 bg-accent/[0.035]">
                      <Icon size={14} className="text-accent" strokeWidth={1.5} />
                    </span>
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.13em] text-text-dim leading-tight">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </FadeInSection>

            <FadeInSection delay={0.5}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 pt-7 sm:pt-8">
                {HERO.metrics.map((metric, idx) => (
                  <div key={idx}>
                    <span className="block text-xl sm:text-2xl font-outfit font-medium text-white mb-1">
                      {metric.value}
                    </span>
                    <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.15em] text-text-dim">
                      {metric.label}
                    </span>
                  </div>
                ))}
              </div>
            </FadeInSection>
          </div>

          {/* Right Column - technological ecosystem visual */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end lg:-mr-4 xl:-mr-8">
            <FadeInSection delay={0.22} direction="right">
              <div className="relative scale-[0.72] sm:scale-[0.86] md:scale-[0.92] lg:scale-[0.96] xl:scale-100 origin-center">
                <div
                  className="absolute inset-[8%] rounded-full pointer-events-none"
                  style={{ boxShadow: '0 0 120px rgba(212,162,89,0.055), inset 0 0 80px rgba(212,162,89,0.02)' }}
                />
                <BlockchainNetwork size="lg" interactive />
              </div>
            </FadeInSection>
          </div>
        </div>
      </Container>

      <div className="absolute bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2 hidden sm:block" aria-hidden="true">
        <div className="flex flex-col items-center gap-3">
          <span className="text-[8px] text-text-dim uppercase tracking-[0.3em]">Scroll</span>
          <div className="w-px h-7 bg-gradient-to-b from-accent/30 to-transparent" />
        </div>
      </div>
    </section>
  );
};
