'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { REWARDS } from '@/data/content';
import { Award, UserPlus, Gift, Layers } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  award: <Award size={22} strokeWidth={1.5} />,
  userPlus: <UserPlus size={22} strokeWidth={1.5} />,
  gift: <Gift size={22} strokeWidth={1.5} />,
  layers: <Layers size={22} strokeWidth={1.5} />,
};

export const RewardsSection: React.FC = () => {
  return (
    <section
      id="rewards"
      className="relative py-20 sm:py-28 md:py-32 lg:py-40 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <Container className="relative z-10">
        {/* Header */}
        <FadeInSection>
          <div className="max-w-xl mb-12 sm:mb-16 md:mb-20">
            <Badge variant="accent" className="mb-6 sm:mb-8">
              {REWARDS.badge}
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-outfit font-semibold mb-4 sm:mb-5 tracking-tight">
              {REWARDS.title}{' '}
              <span className="text-accent">{REWARDS.titleHighlight}</span>
            </h2>
            <p className="text-[13px] sm:text-sm md:text-base text-text-muted leading-relaxed">
              {REWARDS.description}
            </p>
          </div>
        </FadeInSection>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.02] rounded-lg overflow-hidden">
          {REWARDS.features.map((feature, index) => (
            <FadeInSection
              key={feature.title}
              delay={0.05 + index * 0.05}
            >
              <div
                className="p-6 sm:p-8 md:p-10 lg:p-12 bg-bg-secondary hover:bg-white/[0.01] transition-colors duration-500 h-full"
              >
                <span className="text-accent mb-4 sm:mb-5 md:mb-6 block">
                  {iconMap[feature.icon]}
                </span>
                <h3 className="text-[13px] sm:text-sm md:text-base font-outfit font-medium text-white mb-2 sm:mb-3">
                  {feature.title}
                </h3>
                <p className="text-[12px] sm:text-[13px] md:text-sm text-text-muted leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </Container>
    </section>
  );
};
