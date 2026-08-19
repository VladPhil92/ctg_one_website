'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { Award, UserPlus, Gift, Layers } from 'lucide-react';

const roadmapFeatures = [
  {
    title: 'Engagement recognition',
    description: 'Planned recognition mechanics linked to verified ecosystem engagement. No cross-ecosystem earning program is represented as active today.',
    icon: <Award size={22} strokeWidth={1.5} />,
  },
  {
    title: 'Referral recognition',
    description: 'Referral mechanics remain subject to the rules and implementation of each business unit; there is no universal CTG Rewards referral rail in production.',
    icon: <UserPlus size={22} strokeWidth={1.5} />,
  },
  {
    title: 'Cross-ecosystem redemption',
    description: 'Redeeming value across business units is a target architecture and remains ROADMAP until accounting, authorization and redemption rules are implemented and verified.',
    icon: <Gift size={22} strokeWidth={1.5} />,
  },
  {
    title: 'Tiered recognition',
    description: 'Shared tiers and benefits are a product concept. They must not be interpreted as a currently active loyalty program without published program rules and production evidence.',
    icon: <Layers size={22} strokeWidth={1.5} />,
  },
] as const;

export const RewardsSection: React.FC = () => {
  return (
    <section
      id="rewards"
      className="relative py-20 sm:py-28 md:py-32 lg:py-40 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <Container className="relative z-10">
        <FadeInSection>
          <div className="max-w-2xl mb-12 sm:mb-16 md:mb-20">
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <Badge variant="accent">CTG Rewards · Product concept</Badge>
              <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[8px] uppercase tracking-[0.16em] text-text-dim">ROADMAP</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-outfit font-semibold mb-4 sm:mb-5 tracking-tight">
              CTG <span className="text-accent">Rewards</span>
            </h2>
            <p className="text-[13px] sm:text-sm md:text-base text-text-muted leading-relaxed">
              CTG Rewards is the target loyalty and referral architecture for the ecosystem. It is not represented as a currently active cross-business rewards program. Capabilities below describe intended product behavior and remain evidence-gated before production promotion.
            </p>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/[0.02] rounded-lg overflow-hidden">
          {roadmapFeatures.map((feature, index) => (
            <FadeInSection key={feature.title} delay={0.05 + index * 0.05}>
              <div className="p-6 sm:p-8 md:p-10 lg:p-12 bg-bg-secondary hover:bg-white/[0.01] transition-colors duration-500 h-full">
                <span className="text-accent mb-4 sm:mb-5 md:mb-6 block">{feature.icon}</span>
                <h3 className="text-[13px] sm:text-sm md:text-base font-outfit font-medium text-white mb-2 sm:mb-3">{feature.title}</h3>
                <p className="text-[12px] sm:text-[13px] md:text-sm text-text-muted leading-relaxed">{feature.description}</p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </Container>
    </section>
  );
};
