'use client';

import React from 'react';
import Image from 'next/image';
import { Container } from '@/components/ui';
import { FOOTER, CONTACT } from '@/data/content';
import { NAV_ITEMS } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowUpRight, CircuitBoard, MapPin } from 'lucide-react';

const PLATFORM_LINKS = [
  { label: 'CTG Craft Beer Investment', href: '/inversion' },
  { label: 'Rewards', href: '/rewards' },
  { label: 'Token', href: '/token' },
];

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const { locale, t } = useLanguage();

  const sectionLabel = locale === 'es' ? 'Infraestructura digital del ecosistema' : 'Digital infrastructure for the ecosystem';

  const linkClass = 'group inline-flex items-center gap-2 text-[13px] text-text-muted hover:text-white transition-colors duration-500';

  return (
    <footer
      className="relative pt-20 sm:pt-24 md:pt-28 pb-10 sm:pb-12 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)', borderTop: '1px solid rgba(212, 162, 89, 0.11)' }}
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute left-[-180px] bottom-[-250px] w-[620px] h-[620px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(212,162,89,0.055), transparent 70%)' }}
        />
        <div
          className="absolute right-0 top-0 w-[52%] h-full opacity-[0.1]"
          style={{
            backgroundImage: 'linear-gradient(rgba(212,162,89,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,89,0.08) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'linear-gradient(to left, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to left, black, transparent)',
          }}
        />
      </div>

      <Container className="relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-12 sm:pb-14 border-b border-white/[0.045]">
          <div className="max-w-xl">
            <a href="/" className="inline-flex items-center gap-4 mb-7 group">
              <div className="relative w-11 h-11 rounded-full overflow-hidden border border-accent/25 group-hover:border-accent/50 transition-colors duration-500">
                <Image src="/images/logo/CTGLOGO.jpeg" alt="CTG One Logo" fill className="object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-outfit font-medium text-white tracking-wide">CTG One</span>
                <span className="text-[9px] text-accent uppercase tracking-[0.23em]">Technology</span>
              </div>
            </a>

            <div className="flex items-center gap-2.5 mb-4">
              <CircuitBoard size={14} className="text-accent" strokeWidth={1.4} />
              <span className="text-[9px] uppercase tracking-[0.24em] text-text-dim">{sectionLabel}</span>
            </div>
            <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-lg">{t(FOOTER.tagline)}</p>
          </div>

          <div className="flex items-center gap-3 text-text-dim">
            <MapPin size={14} className="text-accent" strokeWidth={1.4} />
            <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.16em]">{CONTACT.location}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 sm:gap-12 py-12 sm:py-14 md:py-16">
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <span className="w-5 h-px bg-accent/70" />
              <h4 className="text-[9px] uppercase tracking-[0.23em] text-accent">
                {locale === 'es' ? 'Navegación' : 'Navigation'}
              </h4>
            </div>
            <ul className="space-y-3.5">
              {NAV_ITEMS.slice(0, Math.ceil(NAV_ITEMS.length / 2)).map((item) => (
                <li key={item.href}>
                  <a href={item.href} className={linkClass}>
                    <span>{t(item.label)}</span>
                    <ArrowUpRight size={11} className="opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <span className="w-5 h-px bg-white/20" />
              <h4 className="text-[9px] uppercase tracking-[0.23em] text-text-dim">
                {locale === 'es' ? 'Explorar' : 'Explore'}
              </h4>
            </div>
            <ul className="space-y-3.5">
              {NAV_ITEMS.slice(Math.ceil(NAV_ITEMS.length / 2)).map((item) => (
                <li key={item.href}>
                  <a href={item.href} className={linkClass}>
                    <span>{t(item.label)}</span>
                    <ArrowUpRight size={11} className="opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <span className="w-5 h-px bg-accent/70" />
              <h4 className="text-[9px] uppercase tracking-[0.23em] text-accent">
                {locale === 'es' ? 'Plataformas' : 'Platforms'}
              </h4>
            </div>
            <ul className="space-y-3.5">
              {PLATFORM_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={linkClass}>
                    <span>{t(link.label)}</span>
                    <ArrowUpRight size={11} className="opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <span className="w-5 h-px bg-white/20" />
              <h4 className="text-[9px] uppercase tracking-[0.23em] text-text-dim">Legal</h4>
            </div>
            <ul className="space-y-3.5">
              <li><a href="/privacidad" className={linkClass}><span>{t('Privacy Policy')}</span><ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" /></a></li>
              <li><a href="/inversion/legal" className={linkClass}><span>{locale === 'es' ? 'Información legal de inversión' : 'Investment legal information'}</span><ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" /></a></li>
              <li><a href="/inversion/riesgos" className={linkClass}><span>{locale === 'es' ? 'Riesgos de inversión' : 'Investment risks'}</span><ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" /></a></li>
            </ul>
          </div>
        </div>

        <div className="pt-7 sm:pt-8 border-t border-white/[0.045] flex flex-col md:flex-row justify-between md:items-center gap-5">
          <p className="text-[10px] text-text-dim tracking-[0.12em] uppercase">© {currentYear} CTG One Technology</p>
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="hidden sm:block w-12 h-px bg-gradient-to-r from-transparent to-accent/30" />
            <span className="text-[9px] text-text-dim uppercase tracking-[0.2em]">Cartagena · Colombia</span>
            <span className="hidden sm:block w-12 h-px bg-gradient-to-l from-transparent to-accent/30" />
          </div>
          <a href="/contact" className="group inline-flex items-center gap-2 text-[10px] text-text-dim hover:text-accent transition-colors duration-500 uppercase tracking-[0.15em]">
            {t('Contact')}
            <ArrowUpRight size={11} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </Container>
    </footer>
  );
};
