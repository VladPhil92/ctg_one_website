'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { HOME_OVERVIEW_ITEMS, localizeHomeOverview } from '@/data/home-overview';
import { Eye, Cpu, Network, Mail, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import styles from '@/styles/CommandCenter.module.css';

const ICONS: Record<string, LucideIcon> = {
  '/about': Eye,
  '/services': Cpu,
  '/ecosystem': Network,
  '/contact': Mail,
};

export const HomeOverviewSection: React.FC = () => {
  const { locale } = useLanguage();

  const intro = locale === 'es'
    ? {
        eyebrow: 'Nuestros negocios',
        title: 'Operaciones reales,',
        highlight: 'tecnología compartida.',
        description: 'CTG One reúne negocios en distintos sectores. Cada uno nos permite aplicar tecnología en situaciones reales y aprender directamente de la operación.',
      }
    : {
        eyebrow: 'Our businesses',
        title: 'Real operations,',
        highlight: 'shared technology.',
        description: 'CTG One brings together businesses across different sectors. Each one gives us a real environment where technology can be applied and improved through daily operations.',
      };

  return (
    <section className={`${styles.theme} relative overflow-hidden py-20 sm:py-28 md:py-32 lg:py-36`} style={{ backgroundColor: '#050a10' }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute left-1/2 top-[8%] h-[760px] w-[760px] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(circle, rgba(36,140,255,0.045) 0%, rgba(214,174,86,0.028) 36%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.2]" style={{ backgroundImage: 'linear-gradient(rgba(36,140,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(214,174,86,0.035) 1px, transparent 1px)', backgroundSize: '72px 72px', maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 84%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 84%, transparent)' }} />
      </div>

      <Container size="large" className="relative z-10">
        <FadeInSection>
          <div className="mb-12 grid items-end gap-8 lg:mb-16 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
            <div>
              <div className="mb-5 inline-flex items-center gap-3">
                <span className="h-px w-10 shrink-0 bg-gradient-to-r from-[#d6ae56] to-[#248cff]/30" aria-hidden="true" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f1c75b] sm:text-xs">{intro.eyebrow}</span>
              </div>
              <h2 className="font-outfit text-3xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-4xl md:text-5xl lg:text-[3.7rem]">
                <span className="text-white">{intro.title}</span><br />
                <span className="bg-gradient-to-r from-[#f1c75b] via-[#d6ae56] to-[#b88932] bg-clip-text text-transparent">{intro.highlight}</span>
              </h2>
            </div>
            <div className="lg:pb-1">
              <p className="max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">{intro.description}</p>
              <div className="mt-6 h-px w-24 bg-gradient-to-r from-[#d6ae56]/55 via-[#248cff]/20 to-transparent" aria-hidden="true" />
            </div>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
          {HOME_OVERVIEW_ITEMS.map((item, index) => {
            const Icon = ICONS[item.href];
            const copy = localizeHomeOverview(item, locale);
            return (
              <FadeInSection key={item.href} delay={0.04 + index * 0.045}>
                <a href={item.href} aria-label={`${copy.cta}: ${copy.title} ${copy.highlight}`} className={`${styles.techCard} group isolate block min-h-[310px] p-7 sm:min-h-[330px] sm:p-8`}>
                  <div className="pointer-events-none absolute right-0 top-0 h-px w-2/3 bg-gradient-to-l from-[#248cff]/30 via-[#d6ae56]/20 to-transparent" aria-hidden="true" />
                  <div className="relative z-10 flex h-full flex-col">
                    <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d6ae56]/22 bg-[#d6ae56]/[0.03]">
                      {Icon && <Icon className="h-[21px] w-[21px] text-[#f1c75b]" strokeWidth={1.35} aria-hidden="true" />}
                    </div>
                    <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d6ae56] sm:text-xs">{copy.badge}</span>
                    <h3 className="mb-4 font-outfit text-xl font-medium leading-tight tracking-[-0.025em] sm:text-2xl">
                      <span className="text-white">{copy.title}</span>{' '}<span className="text-text-muted transition-colors duration-300 group-hover:text-[#f1c75b]">{copy.highlight}</span>
                    </h3>
                    <p className="mb-8 text-sm leading-relaxed text-text-muted">{copy.description}</p>
                    <div className="mt-auto flex items-center justify-between gap-4 border-t border-white/[0.07] pt-5">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-text-dim transition-colors duration-300 group-hover:text-[#f1c75b]">{copy.cta}</span>
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.1] bg-black/10" aria-hidden="true"><ArrowUpRight className="h-4 w-4 text-text-dim transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#f1c75b]" /></span>
                    </div>
                  </div>
                </a>
              </FadeInSection>
            );
          })}
        </div>
      </Container>
    </section>
  );
};
