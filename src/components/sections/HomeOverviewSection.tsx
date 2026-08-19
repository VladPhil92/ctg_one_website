'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { HOME_OVERVIEW_ITEMS, localizeHomeOverview } from '@/data/home-overview';
import {
  Eye,
  Cpu,
  Network,
  Award,
  Wallet,
  Mail,
  ArrowUpRight,
  Orbit,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const ICONS: Record<string, LucideIcon> = {
  '/about': Eye,
  '/services': Cpu,
  '/ecosystem': Network,
  '/rewards': Award,
  '/token': Wallet,
  '/contact': Mail,
};

export const HomeOverviewSection: React.FC = () => {
  const { locale } = useLanguage();

  const intro = locale === 'es'
    ? {
        eyebrow: 'Arquitectura del ecosistema',
        title: 'Una sola capa tecnológica.',
        highlight: 'Múltiples operaciones reales.',
        description: 'Cada unidad de CTG One funciona como un entorno operativo donde nuestro software e infraestructura se prueban, despliegan y mejoran continuamente; las capacidades emergentes se muestran con su madurez real.',
      }
    : {
        eyebrow: 'Ecosystem architecture',
        title: 'One technology layer.',
        highlight: 'Multiple real operations.',
        description: 'Every CTG One unit acts as an operating environment where our software and infrastructure are tested, deployed, and continuously improved; emerging capabilities are shown with their real maturity.',
      };

  return (
    <section className="relative overflow-hidden py-20 sm:py-28 md:py-32 lg:py-36" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute left-1/2 top-[7%] h-[760px] w-[760px] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,162,89,0.045) 0%, rgba(212,162,89,0.012) 38%, transparent 70%)' }} />
        <div
          className="absolute inset-0 opacity-[0.17]"
          style={{
            backgroundImage: 'linear-gradient(rgba(212,162,89,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,89,0.055) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)',
          }}
        />
      </div>

      <Container className="relative z-10">
        <FadeInSection>
          <div className="mb-12 grid items-end gap-8 lg:mb-16 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
            <div>
              <div className="mb-5 inline-flex items-center gap-2.5">
                <span className="h-px w-8 shrink-0 bg-accent/60" aria-hidden="true" />
                <span className="min-w-0 text-[11px] sm:text-xs uppercase tracking-[0.2em] text-accent leading-tight">{intro.eyebrow}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-outfit font-semibold tracking-[-0.03em] leading-[1.05]">
                <span className="text-white">{intro.title}</span>
                <br />
                <span className="text-accent">{intro.highlight}</span>
              </h2>
            </div>

            <div className="min-w-0 lg:pb-1">
              <p className="max-w-2xl text-sm sm:text-base text-text-muted leading-relaxed">{intro.description}</p>
              <div className="mt-6 flex min-w-0 items-center gap-4 text-text-dim" aria-hidden="true">
                <Orbit className="h-[17px] w-[17px] shrink-0 text-accent" strokeWidth={1.4} />
                <span className="h-px max-w-[180px] flex-1 bg-gradient-to-r from-accent/35 to-transparent" />
                <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={1.4} />
              </div>
            </div>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
          {HOME_OVERVIEW_ITEMS.map((item, index) => {
            const Icon = ICONS[item.href];
            const number = String(index + 1).padStart(2, '0');
            const copy = localizeHomeOverview(item, locale);
            const accessibleLabel = `${copy.cta}: ${copy.title} ${copy.highlight}`;

            return (
              <FadeInSection key={item.href} delay={0.04 + index * 0.045}>
                <a
                  href={item.href}
                  aria-label={accessibleLabel}
                  className="group isolate relative block min-h-[320px] overflow-hidden border border-white/[0.075] bg-[#080808]/95 p-7 transition-[border-color,transform,background-color] duration-300 hover:-translate-y-1 hover:border-accent/40 hover:bg-[#0a0a0a] sm:min-h-[345px] sm:p-8"
                  style={{ boxShadow: '0 18px 70px rgba(0,0,0,0.18)' }}
                >
                  <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: 'radial-gradient(circle, rgba(212,162,89,0.13), transparent 67%)' }} aria-hidden="true" />
                  <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/0 to-transparent transition-all duration-500 group-hover:via-accent/50" aria-hidden="true" />

                  <div className="relative z-10 flex h-full min-w-0 flex-col">
                    <div className="mb-9 flex min-w-0 items-start justify-between gap-5">
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-accent/25 bg-accent/[0.035]">
                        <span className="absolute inset-[6px] rounded-full border border-accent/[0.09]" aria-hidden="true" />
                        <Icon className="relative z-10 h-[21px] w-[21px] shrink-0 text-accent" strokeWidth={1.35} aria-hidden="true" />
                      </div>
                      <span className="shrink-0 font-outfit text-xs font-semibold tracking-[0.16em] text-text-dim transition-colors duration-300 group-hover:text-accent">{number}</span>
                    </div>

                    <span className="mb-3 block text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-accent leading-tight">{copy.badge}</span>
                    <h3 className="mb-4 text-xl sm:text-2xl font-outfit font-medium tracking-[-0.02em] leading-tight">
                      <span className="text-white">{copy.title}</span>{' '}
                      <span className="text-text-muted transition-colors duration-300 group-hover:text-accent">{copy.highlight}</span>
                    </h3>
                    <p className="mb-8 line-clamp-5 text-sm text-text-muted leading-relaxed">{copy.description}</p>

                    <div className="mt-auto flex min-w-0 items-center justify-between gap-4 border-t border-white/[0.07] pt-5">
                      <span className="min-w-0 text-xs font-semibold uppercase tracking-[0.12em] text-text-dim transition-colors duration-300 group-hover:text-accent">{copy.cta}</span>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.1] transition-all duration-300 group-hover:border-accent/35 group-hover:bg-accent/[0.04]" aria-hidden="true">
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-text-dim transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                      </span>
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
