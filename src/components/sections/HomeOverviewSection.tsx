'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { FadeInSection } from '@/components/ui/FadeInSection';
import { ABOUT, SERVICES, ECOSYSTEM, REWARDS, CONTACT } from '@/data/content';
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
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const ITEMS = [
  { href: '/about', badge: ABOUT.badge, title: ABOUT.title, titleHighlight: ABOUT.titleHighlight, description: ABOUT.description, icon: Eye },
  { href: '/services', badge: SERVICES.badge, title: SERVICES.title, titleHighlight: SERVICES.titleHighlight, description: SERVICES.description, icon: Cpu },
  { href: '/ecosystem', badge: ECOSYSTEM.badge, title: ECOSYSTEM.title, titleHighlight: ECOSYSTEM.titleHighlight, description: ECOSYSTEM.description, icon: Network },
  { href: '/rewards', badge: REWARDS.badge, title: REWARDS.title, titleHighlight: REWARDS.titleHighlight, description: REWARDS.description, icon: Award },
  { href: '/token', badge: 'CTGO · Web3', title: 'CTGO', titleHighlight: 'Technology Roadmap', description: '', icon: Wallet },
  { href: '/contact', badge: CONTACT.badge, title: CONTACT.title, titleHighlight: CONTACT.titleHighlight, description: CONTACT.description, icon: Mail },
];

export const HomeOverviewSection: React.FC = () => {
  const { locale, t } = useLanguage();

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

  const tokenCopy = locale === 'es'
    ? {
        title: 'CTGO',
        highlight: 'Estrategia Web3',
        description: 'Arquitectura de utilidad en desarrollo. No publicamos métricas on-chain, holders, precio ni contratos hasta contar con evidencia productiva verificable.',
      }
    : {
        title: 'CTGO',
        highlight: 'Web3 Strategy',
        description: 'Utility architecture in development. We do not publish on-chain metrics, holder counts, price, or contracts until verifiable production evidence exists.',
      };

  return (
    <section className="relative py-24 sm:py-32 md:py-36 lg:py-44 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute left-1/2 top-[7%] -translate-x-1/2 w-[760px] h-[760px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(212,162,89,0.045) 0%, rgba(212,162,89,0.012) 38%, transparent 70%)' }} />
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
          <div className="grid lg:grid-cols-[0.78fr_1.22fr] gap-8 lg:gap-16 items-end mb-14 sm:mb-18 md:mb-20">
            <div>
              <div className="inline-flex items-center gap-2.5 mb-5">
                <span className="w-8 h-px bg-accent/60" />
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-accent">{intro.eyebrow}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-outfit font-semibold tracking-[-0.03em] leading-[1.05]">
                <span className="text-white">{intro.title}</span>
                <br />
                <span className="text-accent">{intro.highlight}</span>
              </h2>
            </div>

            <div className="lg:pb-1">
              <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-2xl">{intro.description}</p>
              <div className="mt-6 flex items-center gap-4 text-text-dim">
                <Orbit size={17} className="text-accent" strokeWidth={1.4} />
                <span className="h-px flex-1 max-w-[180px] bg-gradient-to-r from-accent/35 to-transparent" />
                <Sparkles size={14} strokeWidth={1.4} />
              </div>
            </div>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {ITEMS.map((item, index) => {
            const Icon = item.icon;
            const number = String(index + 1).padStart(2, '0');
            const isToken = item.href === '/token';
            const title = isToken ? tokenCopy.title : t(item.title);
            const highlight = isToken ? tokenCopy.highlight : t(item.titleHighlight);
            const description = isToken ? tokenCopy.description : t(item.description);

            return (
              <FadeInSection key={item.href} delay={0.05 + index * 0.055}>
                <a href={item.href} className="group relative block min-h-[320px] sm:min-h-[345px] p-7 sm:p-8 overflow-hidden border border-white/[0.055] bg-[#080808]/90 transition-all duration-500 hover:border-accent/35 hover:-translate-y-1" style={{ boxShadow: '0 18px 70px rgba(0,0,0,0.18)' }}>
                  <div className="absolute -right-24 -top-24 w-64 h-64 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ background: 'radial-gradient(circle, rgba(212,162,89,0.13), transparent 67%)' }} />
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/0 to-transparent group-hover:via-accent/50 transition-all duration-700" />

                  <div className="relative z-10 h-full flex flex-col">
                    <div className="flex items-start justify-between gap-5 mb-10">
                      <div className="relative w-14 h-14 flex items-center justify-center rounded-full border border-accent/25 bg-accent/[0.035]">
                        <span className="absolute inset-[6px] rounded-full border border-accent/[0.09]" />
                        <Icon size={21} className="text-accent relative z-10" strokeWidth={1.35} />
                      </div>
                      <span className="font-outfit text-[10px] tracking-[0.22em] text-text-dim group-hover:text-accent/70 transition-colors duration-500">{number}</span>
                    </div>

                    <span className="block text-[9px] uppercase tracking-[0.2em] text-accent/80 mb-3">{isToken ? item.badge : t(item.badge)}</span>
                    <h3 className="text-xl sm:text-2xl font-outfit font-medium tracking-[-0.02em] leading-tight mb-4">
                      <span className="text-white">{title}</span>{' '}
                      <span className="text-text-muted group-hover:text-accent transition-colors duration-500">{highlight}</span>
                    </h3>
                    <p className="text-[13px] sm:text-sm text-text-muted leading-relaxed mb-8 line-clamp-4">{description}</p>

                    <div className="mt-auto flex items-center justify-between border-t border-white/[0.045] pt-5">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-text-dim group-hover:text-accent transition-colors duration-500">{t('See more')}</span>
                      <span className="w-8 h-8 rounded-full border border-white/[0.07] flex items-center justify-center group-hover:border-accent/30 group-hover:bg-accent/[0.04] transition-all duration-500">
                        <ArrowUpRight size={14} className="text-text-dim group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
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
