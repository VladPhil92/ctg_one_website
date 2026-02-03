'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { ABOUT } from '@/data/content';
import { Eye, Network, Shield, TrendingUp, CheckCircle } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  eye: <Eye size={20} strokeWidth={1.5} />,
  network: <Network size={20} strokeWidth={1.5} />,
  shield: <Shield size={20} strokeWidth={1.5} />,
  trending: <TrendingUp size={20} strokeWidth={1.5} />,
  check: <CheckCircle size={20} strokeWidth={1.5} />,
};

export const AboutSection: React.FC = () => {
  return (
    <section
      id="about"
      className="relative py-20 sm:py-28 md:py-32 lg:py-40 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <Container className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 lg:gap-24 items-start">
          {/* Left - Text Content */}
          <FadeInSection direction="left">
            <div className="lg:sticky lg:top-32">
              <Badge variant="accent" className="mb-6 sm:mb-8">
                {ABOUT.badge}
              </Badge>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-outfit font-semibold mb-5 sm:mb-6 tracking-tight">
                {ABOUT.title}{' '}
                <span className="text-accent">{ABOUT.titleHighlight}</span>
              </h2>
              <p className="text-[13px] sm:text-sm md:text-base text-text-muted leading-relaxed mb-10 sm:mb-12 max-w-md">
                {ABOUT.description}
              </p>

              {/* Stats Row */}
              <div 
                className="grid grid-cols-3 gap-4 sm:gap-8 md:gap-12 pt-8 sm:pt-10"
                style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}
              >
                <div>
                  <div className="text-xl sm:text-2xl font-outfit font-medium text-white mb-1">10</div>
                  <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.15em] text-text-dim">Business Units</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-outfit font-medium text-white mb-1">2024</div>
                  <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.15em] text-text-dim">Founded</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-outfit font-medium text-white mb-1">Dual</div>
                  <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.15em] text-text-dim">Architecture</div>
                </div>
              </div>

              {/* Differentiator Quote */}
              {ABOUT.differentiator && (
                <p className="mt-8 sm:mt-10 text-[11px] sm:text-xs text-accent/80 italic leading-relaxed">
                  "{ABOUT.differentiator}"
                </p>
              )}
            </div>
          </FadeInSection>

          {/* Right - Feature Cards */}
          <div className="space-y-4 sm:space-y-6">
            {ABOUT.features.map((feature, index) => (
              <FadeInSection 
                key={feature.title} 
                delay={0.1 + index * 0.08}
                direction="right"
              >
                <div 
                  className="p-5 sm:p-6 md:p-8 rounded-lg transition-all duration-500"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <div className="flex items-start gap-4 sm:gap-5">
                    <span className="text-accent mt-0.5 flex-shrink-0">
                      {iconMap[feature.icon]}
                    </span>
                    <div>
                      <h3 className="text-[13px] sm:text-sm font-outfit font-medium text-white mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-[12px] sm:text-sm text-text-muted leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};
