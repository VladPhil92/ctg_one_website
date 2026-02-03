'use client';

import React from 'react';
import Image from 'next/image';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { HERO, CONTACT } from '@/data/content';
import { BlockchainNetwork } from '@/components/BlockchainNetwork';

export const HeroSection: React.FC = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center pt-24 sm:pt-28 md:pt-32 pb-16 md:pb-20 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Minimal gradient accent */}
      <div
        className="absolute top-0 right-0 w-[600px] md:w-[900px] h-[600px] md:h-[900px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(201, 169, 98, 0.02) 0%, transparent 50%)',
        }}
      />

      <Container className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 lg:gap-24 items-center">
          {/* Left Column - Text */}
          <div className="order-2 lg:order-1">
            {/* Logo */}
            <FadeInSection delay={0.05}>
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden mb-8 sm:mb-10">
                <Image
                  src="/images/logo/CTGLOGO.jpeg"
                  alt="CTG One Logo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </FadeInSection>

            <FadeInSection delay={0.1}>
              <Badge variant="accent" className="mb-6 sm:mb-8">
                {HERO.badge}
              </Badge>
            </FadeInSection>

            <FadeInSection delay={0.2}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-outfit font-semibold leading-[1.15] mb-6 sm:mb-8 tracking-tight">
                <span className="text-white">{HERO.title}</span>
                <br />
                <span className="text-accent">{HERO.titleHighlight}</span>
              </h1>
            </FadeInSection>

            <FadeInSection delay={0.3}>
              <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-lg mb-3 sm:mb-4">
                {HERO.subtitle}
              </p>
            </FadeInSection>

            <FadeInSection delay={0.35}>
              <p className="text-[13px] sm:text-sm text-text-muted leading-relaxed max-w-lg mb-10 sm:mb-14">
                {HERO.description}
              </p>
            </FadeInSection>

            <FadeInSection delay={0.4}>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-12 sm:mb-16">
                <Button
                  href="#ecosystem"
                  variant="primary"
                  size="md"
                  arrow
                >
                  {HERO.ctaPrimary}
                </Button>
                <Button
                  href={`mailto:${CONTACT.email}`}
                  variant="secondary"
                  size="md"
                >
                  {HERO.ctaSecondary}
                </Button>
              </div>
            </FadeInSection>

            {/* Metrics */}
            <FadeInSection delay={0.5}>
              <div 
                className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 pt-8 sm:pt-10"
                style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}
              >
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

          {/* Right Column - Network Visualization */}
          <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
            <FadeInSection delay={0.3} direction="right">
              <div className="scale-75 sm:scale-90 lg:scale-100 origin-center">
                <BlockchainNetwork size="lg" interactive={true} />
              </div>
            </FadeInSection>
          </div>
        </div>
      </Container>

      {/* Scroll indicator - hidden on mobile */}
      <div className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 hidden sm:block">
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <span className="text-[9px] text-text-dim uppercase tracking-[0.25em]">Scroll</span>
          <div className="w-px h-8 sm:h-10 bg-gradient-to-b from-text-dim/30 to-transparent" />
        </div>
      </div>
    </section>
  );
};
