'use client';

import React from 'react';
import { Container } from '@/components/ui';
import { BrandLogo } from '@/components/BrandLogo';
import { FOOTER, CONTACT } from '@/data/content';
import { NAV_ITEMS } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowUpRight, CircuitBoard, MapPin } from 'lucide-react';
import styles from '@/styles/CommandCenter.module.css';

const PLATFORM_LINKS = [
  { label: 'CTG Craft Beer Investment', href: '/inversion' },
  { label: 'Rewards', href: '/rewards' },
  { label: 'Token', href: '/token' },
];

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { locale, t } = useLanguage();

  const sectionLabel = locale === 'es' ? 'Tecnología compartida del ecosistema' : 'Shared technology across the ecosystem';
  const footerHeading = locale === 'es' ? 'Pie de página' : 'Footer';
  const logoLabel = locale === 'es' ? 'CTG One Technology, ir al inicio' : 'CTG One Technology, go to home';
  const linkClass = 'group inline-flex min-h-11 items-center gap-2 text-sm text-text-muted hover:text-white transition-colors duration-300';
  const columnHeadingClass = 'text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em]';

  return (
    <footer
      className={`${styles.theme} relative overflow-hidden pb-8 pt-16 sm:pb-10 sm:pt-20 md:pt-24`}
      style={{ backgroundColor: '#030507', borderTop: '1px solid rgba(214, 174, 86, 0.15)' }}
    >
      <h2 className="sr-only">{footerHeading}</h2>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute -bottom-[250px] -left-[180px] h-[620px] w-[620px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(214,174,86,0.055), transparent 70%)' }}
        />
        <div
          className="absolute right-0 top-0 h-full w-[54%] opacity-[0.12]"
          style={{
            backgroundImage: 'linear-gradient(rgba(36,140,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(214,174,86,0.055) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'linear-gradient(to left, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to left, black, transparent)',
          }}
        />
        <div className="absolute inset-x-[8%] top-0 h-px bg-gradient-to-r from-transparent via-[#d6ae56]/45 to-[#248cff]/15" />
      </div>

      <Container size="large" className="relative z-10">
        <div className="flex flex-col justify-between gap-8 border-b border-white/[0.07] pb-10 sm:pb-12 lg:flex-row lg:items-end">
          <div className="max-w-xl">
            <a href="/" aria-label={logoLabel} className="group mb-7 inline-flex min-h-12 items-center">
              <BrandLogo className="transition-transform duration-300 group-hover:-translate-y-px" />
            </a>

            <div className="mb-4 flex items-center gap-2.5">
              <CircuitBoard size={15} className="text-[#f1c75b]" strokeWidth={1.4} aria-hidden="true" />
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-text-dim">{sectionLabel}</span>
            </div>
            <p className="max-w-lg text-sm sm:text-base text-text-muted leading-relaxed">{t(FOOTER.tagline)}</p>
          </div>

          <div className="flex min-h-11 items-center gap-3 text-text-dim">
            <MapPin size={15} className="text-[#d6ae56]" strokeWidth={1.4} aria-hidden="true" />
            <span className="text-xs sm:text-sm uppercase tracking-[0.1em]">{CONTACT.location}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 py-10 sm:gap-12 sm:py-12 md:grid-cols-4 md:py-14">
          <div>
            <div className="mb-4 flex min-h-8 items-center gap-2.5">
              <span className="h-px w-5 bg-[#d6ae56]/70" aria-hidden="true" />
              <h3 className={`${columnHeadingClass} text-[#f1c75b]`}>{locale === 'es' ? 'Navegación' : 'Navigation'}</h3>
            </div>
            <ul className="space-y-1">
              {NAV_ITEMS.slice(0, Math.ceil(NAV_ITEMS.length / 2)).map((item) => (
                <li key={item.href}>
                  <a href={item.href} className={linkClass}>
                    <span>{t(item.label)}</span>
                    <ArrowUpRight size={12} className="opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-4 flex min-h-8 items-center gap-2.5">
              <span className="h-px w-5 bg-[#248cff]/40" aria-hidden="true" />
              <h3 className={`${columnHeadingClass} text-text-dim`}>{locale === 'es' ? 'Explorar' : 'Explore'}</h3>
            </div>
            <ul className="space-y-1">
              {NAV_ITEMS.slice(Math.ceil(NAV_ITEMS.length / 2)).map((item) => (
                <li key={item.href}>
                  <a href={item.href} className={linkClass}>
                    <span>{t(item.label)}</span>
                    <ArrowUpRight size={12} className="opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-4 flex min-h-8 items-center gap-2.5">
              <span className="h-px w-5 bg-[#d6ae56]/70" aria-hidden="true" />
              <h3 className={`${columnHeadingClass} text-[#f1c75b]`}>{locale === 'es' ? 'Plataformas' : 'Platforms'}</h3>
            </div>
            <ul className="space-y-1">
              {PLATFORM_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={linkClass}>
                    <span>{t(link.label)}</span>
                    <ArrowUpRight size={12} className="opacity-0 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-4 flex min-h-8 items-center gap-2.5">
              <span className="h-px w-5 bg-[#248cff]/40" aria-hidden="true" />
              <h3 className={`${columnHeadingClass} text-text-dim`}>Legal</h3>
            </div>
            <ul className="space-y-1">
              <li><a href="/privacy" className={linkClass}><span>{t('Privacy Policy')}</span><ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100" aria-hidden="true" /></a></li>
              <li><a href="/inversion/legal" className={linkClass}><span>{locale === 'es' ? 'Información legal de inversión' : 'Investment legal information'}</span><ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100" aria-hidden="true" /></a></li>
              <li><a href="/inversion/riesgos" className={linkClass}><span>{locale === 'es' ? 'Riesgos de inversión' : 'Investment risks'}</span><ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100" aria-hidden="true" /></a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/[0.07] pt-6 sm:pt-7 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-text-dim tracking-[0.08em] uppercase">© {currentYear} CTG One Technology</p>
          <div className="flex items-center gap-4 sm:gap-6" aria-hidden="true">
            <span className="hidden h-px w-12 bg-gradient-to-r from-transparent to-[#d6ae56]/30 sm:block" />
            <span className="text-xs text-text-dim uppercase tracking-[0.12em]">Cartagena · Colombia</span>
            <span className="hidden h-px w-12 bg-gradient-to-l from-transparent to-[#248cff]/25 sm:block" />
          </div>
          <a href="/contact" className="group inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-text-dim hover:text-[#f1c75b] uppercase tracking-[0.1em]">
            {t('Contact')}
            <ArrowUpRight size={12} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </a>
        </div>
      </Container>
    </footer>
  );
};
