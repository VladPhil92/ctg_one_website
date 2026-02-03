'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { Badge } from '@/components/ui/Badge';
import { ECOSYSTEM } from '@/data/content';
import { 
  GraduationCap, 
  Building2, 
  Home,
  Leaf,
  Cpu,
  Heart, 
  Smile,
  Scale, 
  Palette, 
  Wallet 
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  graduation: <GraduationCap size={18} strokeWidth={1.5} />,
  hotel: <Building2 size={18} strokeWidth={1.5} />,
  building: <Home size={18} strokeWidth={1.5} />,
  leaf: <Leaf size={18} strokeWidth={1.5} />,
  cpu: <Cpu size={18} strokeWidth={1.5} />,
  heart: <Heart size={18} strokeWidth={1.5} />,
  smile: <Smile size={18} strokeWidth={1.5} />,
  scale: <Scale size={18} strokeWidth={1.5} />,
  palette: <Palette size={18} strokeWidth={1.5} />,
  wallet: <Wallet size={18} strokeWidth={1.5} />,
};

export const EcosystemSection: React.FC = () => {
  return (
    <section
      id="ecosystem"
      className="relative py-20 sm:py-28 md:py-32 lg:py-40 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <Container className="relative z-10">
        {/* Header */}
        <FadeInSection>
          <div className="max-w-xl mb-12 sm:mb-16 md:mb-20">
            <Badge variant="accent" className="mb-6 sm:mb-8">
              {ECOSYSTEM.badge}
            </Badge>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-outfit font-semibold mb-4 sm:mb-5 tracking-tight">
              {ECOSYSTEM.title}{' '}
              <span className="text-accent">{ECOSYSTEM.titleHighlight}</span>
            </h2>
            <p className="text-[13px] sm:text-sm md:text-base text-text-muted leading-relaxed">
              {ECOSYSTEM.description}
            </p>
          </div>
        </FadeInSection>

        {/* Units Grid - 10 units in 5x2 grid on large screens */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-white/[0.02] rounded-lg overflow-hidden">
          {ECOSYSTEM.units.map((unit, index) => (
            <FadeInSection 
              key={unit.id} 
              delay={0.03 + index * 0.03}
            >
              <div 
                className="p-4 sm:p-6 md:p-8 lg:p-10 bg-bg-secondary hover:bg-white/[0.01] transition-colors duration-500 h-full"
              >
                <span className="text-accent mb-3 sm:mb-4 md:mb-5 block">
                  {iconMap[unit.icon]}
                </span>
                <h3 className="text-[12px] sm:text-[13px] md:text-sm font-outfit font-medium text-white mb-1.5 sm:mb-2">
                  {unit.name}
                </h3>
                <p className="text-[10px] sm:text-[11px] md:text-xs text-text-dim leading-relaxed">
                  {unit.description}
                </p>
              </div>
            </FadeInSection>
          ))}
        </div>
      </Container>
    </section>
  );
};
