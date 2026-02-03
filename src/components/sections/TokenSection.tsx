'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { BlockchainNetwork } from '../BlockchainNetwork';
import { TOKEN } from '@/data/content';
import { Check } from 'lucide-react';
import Image from 'next/image';

export const TokenSection: React.FC = () => {
  return (
    <section
      id="token"
      className="relative py-20 sm:py-28 md:py-32 lg:py-40 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <Container className="relative z-10">
        {/* Header */}
        <FadeInSection>
          <div className="max-w-xl mb-12 sm:mb-16 md:mb-20">
            <Badge variant="accent" className="mb-6 sm:mb-8">
              {TOKEN.badge}
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-outfit font-semibold mb-4 sm:mb-5 tracking-tight">
              {TOKEN.title}{' '}
              <span className="text-accent">{TOKEN.titleHighlight}</span>
            </h2>
            <p className="text-[13px] sm:text-sm md:text-base text-text-muted leading-relaxed">
              {TOKEN.description}
            </p>
          </div>
        </FadeInSection>

        {/* Blockchain Visualization */}
        <FadeInSection delay={0.1}>
          <div className="mb-16 sm:mb-20 md:mb-24 flex justify-center">
            <div className="scale-75 sm:scale-90 md:scale-100 origin-center">
              <BlockchainNetwork size="lg" interactive={true} />
            </div>
          </div>
        </FadeInSection>

        {/* Token Images Gallery */}
        <FadeInSection delay={0.15}>
          <div className="grid grid-cols-3 gap-1 sm:gap-2 mb-16 sm:mb-20 md:mb-24 max-w-2xl mx-auto">
            {[
              '/images/token/file_000000000d5c71f58f3d2c236138f0b6.png',
              '/images/token/file_00000000782871f5b796d4bee7ec65b9.png',
              '/images/token/file_00000000818471f58dcdf9a124fb690f.png',
            ].map((src, index) => (
              <div
                key={index}
                className="relative aspect-square rounded overflow-hidden"
                style={{ border: '1px solid rgba(255, 255, 255, 0.03)' }}
              >
                <Image
                  src={src}
                  alt={`CTGO Token Visual ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 30vw, (max-width: 768px) 33vw, 200px"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </FadeInSection>

        {/* Stats */}
        <FadeInSection delay={0.2}>
          <div 
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 md:gap-10 mb-16 sm:mb-20 md:mb-24 py-8 sm:py-10 md:py-12"
            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
          >
            {TOKEN.stats.map((stat, index) => (
              <div key={index}>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-xl sm:text-2xl font-outfit font-medium text-white">
                    {stat.value}
                  </span>
                  <span className="text-[11px] sm:text-sm text-text-dim">{stat.suffix}</span>
                </div>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.15em] text-text-dim">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </FadeInSection>

        {/* Utility & Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-20 mb-16 sm:mb-20 md:mb-24">
          {/* Utility */}
          <FadeInSection delay={0.3} direction="left">
            <div>
              <h3 className="text-[13px] sm:text-sm font-outfit font-medium text-white mb-5 sm:mb-6 md:mb-8">
                Real Utility
              </h3>
              <ul className="space-y-3 sm:space-y-4">
                {TOKEN.utilities.map((utility, index) => (
                  <li key={index} className="flex items-start gap-3 sm:gap-4">
                    <Check size={14} className="text-accent mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                    <span className="text-[12px] sm:text-[13px] md:text-sm text-text-muted">{utility}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeInSection>

          {/* Distribution */}
          <FadeInSection delay={0.3} direction="right">
            <div>
              <h3 className="text-[13px] sm:text-sm font-outfit font-medium text-white mb-5 sm:mb-6 md:mb-8">
                Token Distribution
              </h3>
              <div className="space-y-4 sm:space-y-5">
                {TOKEN.distribution.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-2">
                      <span className="text-[12px] sm:text-[13px] md:text-sm text-text-muted">{item.label}</span>
                      <span className="text-[12px] sm:text-[13px] md:text-sm text-text-secondary">{item.percentage}%</span>
                    </div>
                    <div
                      className="h-px overflow-hidden"
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
                    >
                      <div
                        className="h-full"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: '#c9a962',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeInSection>
        </div>

        {/* CTA */}
        <FadeInSection delay={0.4}>
          <div 
            className="flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6 md:gap-8 p-6 sm:p-8 md:p-10 rounded-lg text-center sm:text-left"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(255, 255, 255, 0.03)' 
            }}
          >
            <div>
              <h4 className="text-[13px] sm:text-sm font-outfit font-medium text-white mb-1">
                Ready to join the ecosystem?
              </h4>
              <p className="text-[12px] sm:text-[13px] md:text-sm text-text-dim">
                Get early access to CTGO Token and exclusive benefits.
              </p>
            </div>
            <Button variant="primary" size="sm" className="flex-shrink-0">
              Learn More
            </Button>
          </div>
        </FadeInSection>
      </Container>
    </section>
  );
};
