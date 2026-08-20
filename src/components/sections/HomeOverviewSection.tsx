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
import styles from '@/styles/CommandCenter.module.css';

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
    <section className={`${styles.theme} relative overflow-hidden py-20 sm:py-28 md:py-32 lg:py-36`} style={{ backgroundColor: '#050a10' }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute left-1/2 top-[8%] h-[760px] w-[760px] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(circle, rgba(36,140,255,0.045) 0%, rgba(214,174,86,0.028) 36%, transparent 70%)' }} />
        <div
          className="absolute inset-0 opacity-[0.2]"
          style={{
            backgroundImage: 'linear-gradient(rgba(36,140,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(214,174,86,0.035) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            maskImage: 'linear-gradient(to bottom, transparent, black 15%, black 84%, transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 15%, black 84%, transparent)',
          }}
        />
      </div>

      <Container size="large" className="relative z-10">
        <FadeInSection>
          <div className="mb-12 grid items-end gap-8 lg:mb-16 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
            <div>
              <div className="mb-5 inline-flex items-center gap-3">
                <span className="h-px w-10 shrink-0 bg-gradient-to-r from-[#d6ae56] to-[#248cff]/30" aria-hidden="true" />
                <span className="min-w-0 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-[#f1c75b] leading-tight">{intro.eyebrow}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.7rem] font-outfit font-semibold tracking-[-0.04em] leading-[1.02]">
                <span className="text-white">{intro.title}</span>
                <br />
                <span className="bg-gradient-to-r from-[#f1c75b] via-[#d6ae56] to-[#b88932] bg-clip-text text-transparent">{intro.highlight}</span>
              </h2>
            </div>

            <div className="min-w-0 lg:pb-1">
              <p className="max-w-2xl text-sm sm:text-base text-text-muted leading-relaxed">{intro.description}</p>
              <div className="mt-6 flex min-w-0 items-center gap-4 text-text-dim" aria-hidden="true">
                <Orbit className="h-[18px] w-[18px] shrink-0 text-[#d6ae56]" strokeWidth={1.4} />
                <span className={`h-px max-w-[220px] flex-1 ${styles.blueTrace}`} />
                <Sparkles className="h-4 w-4 shrink-0 text-[#248cff]/70" strokeWidth={1.4} />
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
                  className={`${styles.techCard} group isolate block min-h-[330px] p-7 sm:min-h-[360px] sm:p-8`}
                >
                  <div className="pointer-events-none absolute right-0 top-0 h-px w-2/3 bg-gradient-to-l from-[#248cff]/30 via-[#d6ae56]/20 to-transparent" aria-hidden="true" />
                  <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#248cff]/[.025] blur-3xl transition-colors duration-300 group-hover:bg-[#d6ae56]/[.055]" aria-hidden="true" />

                  <div className="relative z-10 flex h-full min-w-0 flex-col">
                    <div className="mb-9 flex min-w-0 items-start justify-between gap-5">
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#d6ae56]/25 bg-[#d6ae56]/[0.035]">
                        <span className="absolute inset-[6px] rounded-xl border border-[#248cff]/[0.09]" aria-hidden="true" />
                        <Icon className="relative z-10 h-[21px] w-[21px] shrink-0 text-[#f1c75b]" strokeWidth={1.35} aria-hidden="true" />
                      </div>
                      <div className="text-right">
                        <span className="block font-mono text-xs font-semibold tracking-[0.16em] text-[#248cff]/60 transition-colors duration-300 group-hover:text-[#d6ae56]">MODULE-{number}</span>
                        <span className="mt-2 block h-px w-16 bg-gradient-to-l from-[#248cff]/35 to-transparent" aria-hidden="true" />
                      </div>
                    </div>

                    <span className="mb-3 block text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-[#d6ae56] leading-tight">{copy.badge}</span>
                    <h3 className="mb-4 text-xl sm:text-2xl font-outfit font-medium tracking-[-0.025em] leading-tight">
                      <span className="text-white">{copy.title}</span>{' '}
                      <span className="text-text-muted transition-colors duration-300 group-hover:text-[#f1c75b]">{copy.highlight}</span>
                    </h3>
                    <p className="mb-8 line-clamp-5 text-sm text-text-muted leading-relaxed">{copy.description}</p>

                    <div className="mt-auto flex min-w-0 items-center justify-between gap-4 border-t border-white/[0.07] pt-5">
                      <span className="min-w-0 text-xs font-semibold uppercase tracking-[0.12em] text-text-dim transition-colors duration-300 group-hover:text-[#f1c75b]">{copy.cta}</span>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.1] bg-black/10 transition-all duration-300 group-hover:border-[#248cff]/35 group-hover:bg-[#071a32]/40" aria-hidden="true">
                        <ArrowUpRight className="h-4 w-4 shrink-0 text-text-dim transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#f1c75b]" />
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
